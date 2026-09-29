import assert from 'node:assert/strict'
import test from 'node:test'

import {
  InquiryValidationError,
  inquiryEmail,
  parseInquiry,
} from '../src/server/inquiry.mjs'

const valid = {
  kind: 'scene',
  message: 'Нужна интерактивная WebGL-сцена для сайта.',
  contact: '  client@example.com  ',
  context: 'Ориентир — октябрь',
  link: 'example.com/brief',
  lang: 'ru',
  company_site: '',
  submissionId: '719e70c2-4950-4dab-9403-b00d2cf491be',
}

test('normalizes a short inquiry and formats a plain-text email', () => {
  const inquiry = parseInquiry(valid)
  assert.equal(inquiry.contact, 'client@example.com')
  assert.equal(inquiry.link, 'https://example.com/brief')
  const email = inquiryEmail(inquiry, 'owner@example.com')
  assert.deepEqual(email.to, ['owner@example.com'])
  assert.equal(email.reply_to, 'client@example.com')
  assert.match(email.subject, /3D \/ WebGL-сцена/)
  assert.match(email.text, /Контакт: client@example.com/)
  assert.match(email.text, /Описание задачи:/)
})

test('rejects missing required data and invalid optional URLs', () => {
  for (const body of [
    { ...valid, message: 'short' },
    { ...valid, contact: '' },
    { ...valid, contact: 'выавпвап' },
    { ...valid, contact: '@abc' },
    { ...valid, kind: 'invented' },
    { ...valid, link: 'javascript:alert(1)' },
  ]) {
    assert.throws(() => parseInquiry(body), InquiryValidationError)
  }
})

test('accepts replyable Telegram contacts without setting email reply-to', () => {
  for (const contact of ['@client_name', 'https://t.me/client_name']) {
    const inquiry = parseInquiry({ ...valid, contact })
    assert.equal(inquiry.contact, contact)
    assert.equal(inquiryEmail(inquiry, 'owner@example.com').reply_to, undefined)
  }
})

test('silently discards honeypot submissions', () => {
  assert.deepEqual(parseInquiry({ ...valid, company_site: 'bot.example' }), { spam: true })
})

test('rejects an unconfigured recipient', () => {
  assert.throws(
    () => inquiryEmail(parseInquiry(valid), 'not-an-email'),
    InquiryValidationError,
  )
})
