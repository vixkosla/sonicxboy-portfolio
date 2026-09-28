import assert from 'node:assert/strict'
import test from 'node:test'
import { collectGoogle, collectMetrika, reportingPeriod, GOOGLE_PAGE_FILTER, PORTFOLIO_FILTER } from '../src/server/statsProviders.mjs'
import { createStatsCache } from '../src/server/statsCache.mjs'

test('complete-day windows respect each provider timezone at midnight in Moscow', () => {
  const now = new Date('2026-09-27T21:01:00Z')
  assert.deepEqual(reportingPeriod(now, 'Europe/Moscow'), { today: '2026-09-28', startDate: '2026-08-31', endDate: '2026-09-27', timeZone: 'Europe/Moscow' })
  assert.equal(reportingPeriod(now, 'America/Los_Angeles').endDate, '2026-09-26')
})

test('Google portfolio filter excludes side projects, statistics and other domains', () => {
  const filter = new RegExp(GOOGLE_PAGE_FILTER)
  for (const url of ['https://sonicxboy.dev/', 'https://sonicxboy.dev/en/', 'https://sonicxboy.dev/en', 'https://sonicxboy.dev/?utm_source=github']) assert.ok(filter.test(url), url)
  for (const url of ['https://sonicxboy.dev/horus/', 'https://sonicxboy.dev/stats/', 'https://sonicxboy.dev/blog/', 'https://sonicxboyXdev/', 'https://example.com/']) assert.equal(filter.test(url), false, url)
})

test('Metrica queries all use the portfolio filter and today stays outside the daily chart', async () => {
  const queries = []
  const fetchImpl = async (url) => {
    const parsed = new URL(url)
    if (parsed.pathname.includes('/management/')) return Response.json({ counter: { create_time: '2026-08-06T00:00:00', time_zone_name: 'Europe/Moscow' } })
    const q = parsed.searchParams
    queries.push(q)
    const dimension = q.get('dimensions')
    const data = dimension === 'ym:s:visitDate'
      ? [{ dimensions: [{ name: '2026-09-27' }], metrics: [2, 1, 3] }]
      : dimension ? [] : [{ dimensions: [], metrics: [2, 1, 3, 1] }]
    return Response.json({ data })
  }
  const result = await collectMetrika({ token: 'private-fixture-token', now: new Date('2026-09-28T01:00:00Z'), fetchImpl })
  assert.ok(queries.every((q) => q.get('filters') === PORTFOLIO_FILTER))
  assert.equal(result.daily.length, 28)
  assert.equal(result.daily.at(-1).date, '2026-09-27')
  assert.equal(result.daily[0].visits, 0)
  assert.equal(result.today.date, '2026-09-28')
  assert.equal(result.contacts.visits, 1)
  assert.equal(result.contacts.conversionRate, 0.5)
  assert.equal(JSON.stringify(result).includes('private-fixture-token'), false)
})

test('Google refreshes its access token and applies the scope filter to totals and every breakdown', async () => {
  const requests = []
  const fetchImpl = async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.equal(options.body.get('grant_type'), 'refresh_token')
      return Response.json({ access_token: 'private-access', expires_in: 3600 })
    }
    assert.equal(options.headers.authorization, 'Bearer private-access')
    const body = JSON.parse(options.body)
    requests.push(body)
    const dimensions = body.dimensions
    const row = { clicks: 2, impressions: 10, ctr: 0.2, position: 8 }
    if (!dimensions.length) return Response.json({ rows: [row] })
    if (dimensions[0] === 'date') return Response.json({ rows: [{ keys: ['2026-09-25'], ...row }], metadata: { first_incomplete_date: '2026-09-25' } })
    if (dimensions[0] === 'query') return Response.json({ rows: [{ keys: ['webgl developer'], ...row }] })
    return Response.json({ rows: [{ keys: ['https://sonicxboy.dev/en/'], ...row }] })
  }
  const result = await collectGoogle({ credentials: { clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh' }, now: new Date('2026-09-28T01:00:00Z'), fetchImpl })
  assert.equal(requests.length, 4)
  assert.ok(requests.every((q) => q.dimensionFilterGroups[0].filters[0].expression === GOOGLE_PAGE_FILTER))
  assert.equal(result.totals.clicks, 2)
  assert.equal(result.pages[0].path, '/en/')
  assert.equal(result.dataThrough, '2026-09-25')
  assert.equal(result.firstIncompleteDate, '2026-09-25')
  assert.equal(JSON.stringify(result).includes('private-access'), false)
})

test('missing Google access is not reported as zero impressions', async () => {
  const load = createStatsCache(() => collectGoogle({ credentials: {} }))
  assert.deepEqual(await load(), { status: 'not-connected', data: null })
})

test('cache coalesces requests, expires, and preserves the last successful timestamp after an outage', async () => {
  let now = 0
  let calls = 0
  let fail = false
  const load = createStatsCache(async () => {
    calls++
    if (fail) throw new Error('upstream unavailable')
    return { refreshedAt: '2026-09-28T01:00:00Z', totals: { visits: 93 } }
  }, { now: () => now, ttl: 100, retryDelay: 10 })
  const initial = await Promise.all([load(), load(), load()])
  assert.equal(calls, 1)
  assert.equal(initial[0].status, 'ready')
  now = 99
  await load()
  assert.equal(calls, 1)
  now = 100
  fail = true
  const stale = await load()
  assert.equal(calls, 2)
  assert.equal(stale.status, 'stale')
  assert.equal(stale.data.refreshedAt, '2026-09-28T01:00:00Z')
  assert.equal(stale.data.totals.visits, 93)
  now = 110
  fail = false
  assert.equal((await load()).status, 'ready')
  assert.equal(calls, 3)
})

test('a synchronous configuration error can recover and legacy snapshots cannot enter the scoped report', async () => {
  let now = 0
  let fail = true
  const load = createStatsCache(() => {
    if (fail) throw Object.assign(new Error('not connected'), { code: 'not-connected' })
    return { totals: { visits: 1 } }
  }, { now: () => now, retryDelay: 1, fallback: { available: true, totals: { visits: 999 } } })
  assert.equal((await load()).data, null)
  now = 2
  fail = false
  assert.equal((await load()).data.totals.visits, 1)
})
