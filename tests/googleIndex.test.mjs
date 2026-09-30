import assert from 'node:assert/strict'
import test from 'node:test'
import { collectGoogleIndex } from '../src/server/googleIndex.mjs'

test('Google inspects only the two portfolio home pages with read-only credentials', async () => {
  const inspected = []
  const fetchImpl = async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.equal(options.body.get('grant_type'), 'refresh_token')
      return Response.json({ access_token: 'private-access' })
    }
    assert.equal(url, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect')
    assert.equal(options.headers.authorization, 'Bearer private-access')
    const request = JSON.parse(options.body)
    inspected.push(request)
    return Response.json({ inspectionResult: { indexStatusResult: {
      verdict: 'PASS', coverageState: 'Submitted and indexed', robotsTxtState: 'ALLOWED',
      indexingState: 'INDEXING_ALLOWED', pageFetchState: 'SUCCESSFUL',
      lastCrawlTime: '2026-09-28T12:00:00Z', googleCanonical: request.inspectionUrl,
    } } })
  }
  const result = await collectGoogleIndex({
    credentials: { clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh' },
    now: new Date('2026-09-30T12:00:00Z'), fetchImpl,
  })
  assert.deepEqual(inspected.map((request) => request.inspectionUrl).sort(), ['https://sonicxboy.dev/', 'https://sonicxboy.dev/en/'])
  assert.ok(inspected.every((request) => request.siteUrl === 'https://sonicxboy.dev/'))
  assert.equal(result.pages.length, 2)
  assert.ok(result.pages.every((page) => page.verdict === 'PASS'))
  assert.equal(JSON.stringify(result).includes('private-access'), false)
})

test('Google index status is unavailable rather than a false indexed count without access', async () => {
  await assert.rejects(() => collectGoogleIndex({ credentials: {} }), { code: 'not-connected' })
})
