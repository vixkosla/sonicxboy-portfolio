export const INQUIRY_KINDS = {
  scene: '3D / WebGL-сцена',
  product: 'Веб-продукт или браузерное расширение',
  performance: 'Оптимизация или консультация',
  other: 'Другая задача',
}


export class InquiryValidationError extends Error {}

const EMAIL_CONTACT = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/
const TELEGRAM_CONTACT = /^(?:@|https?:\/\/t\.me\/)[a-z0-9_]{5,32}$/i

function singleLine(value, limit) {
  if (typeof value !== 'string' || value.length > limit * 2) {
    throw new InquiryValidationError('invalid_field')
  }
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length > limit) throw new InquiryValidationError('invalid_field')
  return trimmed
}

function optionalLink(value) {
  const input = singleLine(value ?? '', 300)
  if (!input) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) {
    throw new InquiryValidationError('invalid_link')
  }
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
    return url.href
  } catch {
    throw new InquiryValidationError('invalid_link')
  }
}

export function parseInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InquiryValidationError('invalid_body')
  }

  const honeypot = singleLine(body.company_site ?? '', 200)
  if (honeypot) return { spam: true }


  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (message.length < 10 || message.length > 1800) {
    throw new InquiryValidationError('invalid_message')
  }

  const contact = singleLine(body.contact, 160)
  if (!EMAIL_CONTACT.test(contact) && !TELEGRAM_CONTACT.test(contact)) {
    throw new InquiryValidationError('invalid_contact')
  }

  const kind = singleLine(body.kind ?? 'other', 24)
  if (!Object.hasOwn(INQUIRY_KINDS, kind)) {
    throw new InquiryValidationError('invalid_kind')
  }

  const context = singleLine(body.context ?? '', 240)
  const link = optionalLink(body.link)
  const lang = body.lang === 'en' ? 'en' : 'ru'
  const submissionId = singleLine(body.submissionId ?? '', 64)
  if (submissionId && !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(submissionId)) {
    throw new InquiryValidationError('invalid_submission_id')
  }

  return { spam: false, kind, message, contact, context, link, lang, submissionId }
}

export function inquiryEmail(inquiry, recipient) {
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new InquiryValidationError('invalid_recipient')
  }

  const replyTo = EMAIL_CONTACT.test(inquiry.contact)
    ? inquiry.contact
    : null

  return {
    from: 'SonicXBoy <inquiries@sonicxboy.dev>',
    to: [recipient],
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: `Новая заявка с SonicXBoy · ${INQUIRY_KINDS[inquiry.kind]}`,
    text: [
      `Тип задачи: ${INQUIRY_KINDS[inquiry.kind]}`,
      `Контакт: ${inquiry.contact}`,
      `Язык страницы: ${inquiry.lang.toUpperCase()}`,
      inquiry.link ? `Ссылка: ${inquiry.link}` : null,
      inquiry.context ? `Бюджет / сроки: ${inquiry.context}` : null,
      '',
      'Описание задачи:',
      inquiry.message,
    ].filter((line) => line !== null).join('\n'),
  }
}
