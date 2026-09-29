import type { APIRoute } from 'astro'
import {
  InquiryValidationError,
  inquiryEmail,
  parseInquiry,
} from '../../server/inquiry.mjs'

export const prerender = false

const response = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) {
    return response(403, { error: 'forbidden' })
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return response(415, { error: 'unsupported_media_type' })
  }

  let inquiry
  try {
    const raw = await request.text()
    if (raw.length > 8_000) return response(413, { error: 'too_large' })
    inquiry = parseInquiry(JSON.parse(raw))
  } catch (error) {
    if (error instanceof InquiryValidationError || error instanceof SyntaxError) {
      return response(400, { error: 'invalid_inquiry' })
    }
    return response(400, { error: 'invalid_inquiry' })
  }

  if (inquiry.spam) return response(200, { ok: true })

  const apiKey = process.env.RESEND_API_KEY
  const recipient = process.env.INQUIRY_TO_EMAIL || 'hello@sonicxboy.dev'
  if (!apiKey || !recipient) {
    return response(503, { error: 'delivery_unavailable' })
  }

  let email
  try {
    email = inquiryEmail(inquiry, recipient)
  } catch {
    return response(503, { error: 'delivery_unavailable' })
  }

  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        ...(inquiry.submissionId ? { 'idempotency-key': `inquiry-${inquiry.submissionId}` } : {}),
      },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(10_000),
    })
    if (!sent.ok) {
      console.error('Inquiry email provider rejected request', sent.status)
      return response(502, { error: 'delivery_failed' })
    }
    return response(200, { ok: true })
  } catch {
    console.error('Inquiry email provider unavailable')
    return response(502, { error: 'delivery_failed' })
  }
}
