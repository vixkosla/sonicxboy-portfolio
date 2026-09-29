import assert from 'node:assert/strict'
import test from 'node:test'

import { POST } from '../src/pages/api/inquiry.ts'

const url = 'https://sonicxboy.dev/api/inquiry'
const body = {
  kind: 'scene',
  message: 'Нужна интерактивная WebGL-сцена для главной страницы.',
  contact: 'client@example.com',
  company_site: '',
  lang: 'ru',
  submissionId: '719e70c2-4950-4dab-9403-b00d2cf491be',
}
const request = (payload = body, origin = 'https://sonicxboy.dev') =>
  new Request(url, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

test('rejects cross-origin and malformed submissions', async () => {
  assert.equal((await POST({ request: request(body, 'https://other.example') })).status, 403)
  assert.equal((await POST({ request: request({ ...body, message: 'short' }) })).status, 400)
})

test('does not claim delivery without configured credentials', async () => {
  const previousKey = process.env.RESEND_API_KEY
  const previousRecipient = process.env.INQUIRY_TO_EMAIL
  delete process.env.RESEND_API_KEY
  delete process.env.INQUIRY_TO_EMAIL
  try {
    const result = await POST({ request: request() })
    assert.equal(result.status, 503)
    assert.deepEqual(await result.json(), { error: 'delivery_unavailable' })
  } finally {
    if (previousKey) process.env.RESEND_API_KEY = previousKey
    if (previousRecipient) process.env.INQUIRY_TO_EMAIL = previousRecipient
  }
})

test('sends plain text through the provider without exposing the API key', async () => {
  const previousFetch = globalThis.fetch
  const previousKey = process.env.RESEND_API_KEY
  const previousRecipient = process.env.INQUIRY_TO_EMAIL
  let sent
  process.env.RESEND_API_KEY = 'test-key'
  process.env.INQUIRY_TO_EMAIL = 'owner@example.com'
  globalThis.fetch = async (target, options) => {
    sent = { target, options }
    return Response.json({ id: 'test-message-id' })
  }
  try {
    const result = await POST({ request: request() })
    assert.equal(result.status, 200)
    assert.deepEqual(await result.json(), { ok: true })
    assert.equal(sent.target, 'https://api.resend.com/emails')
    assert.equal(sent.options.headers.authorization, 'Bearer test-key')
    assert.equal(sent.options.headers['idempotency-key'], `inquiry-${body.submissionId}`)
    const payload = JSON.parse(sent.options.body)
    assert.deepEqual(payload.to, ['owner@example.com'])
    assert.equal(payload.reply_to, 'client@example.com')
    assert.match(payload.text, /Контакт: client@example.com/)
  } finally {
    globalThis.fetch = previousFetch
    if (previousKey) process.env.RESEND_API_KEY = previousKey
    else delete process.env.RESEND_API_KEY
    if (previousRecipient) process.env.INQUIRY_TO_EMAIL = previousRecipient
    else delete process.env.INQUIRY_TO_EMAIL
  }
})
