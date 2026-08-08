import assert from 'node:assert/strict'
import test from 'node:test'

import { SITE_STATS } from '../src/data/siteStats.ts'

test('stats snapshot carries a dated capture and a live site', () => {
  assert.match(SITE_STATS.capturedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(SITE_STATS.site, 'https://sonicxboy.dev')
  assert.equal(SITE_STATS.availability.httpStatus, 200)
})

test('every publishing check is localized and boolean', () => {
  assert.ok(SITE_STATS.checks.length >= 8)
  for (const check of SITE_STATS.checks) {
    assert.ok(check.id)
    assert.ok(check.label.ru && check.label.en)
    assert.ok(check.detail.ru && check.detail.en)
    assert.equal(typeof check.ok, 'boolean')
  }
})

test('readiness arithmetic matches the checklist', () => {
  const passed = SITE_STATS.checks.filter((check) => check.ok).length
  assert.equal(passed, SITE_STATS.checks.length, 'launch audit is 11/11')
})

test('weight slices stay consistent with the measured transfer', () => {
  let rawTotal = 0
  let gzipTotal = 0
  for (const slice of SITE_STATS.weight) {
    assert.ok(slice.bytes > 0)
    assert.ok(slice.gzipBytes > 0)
    assert.ok(slice.gzipBytes < slice.bytes)
    rawTotal += slice.bytes
    gzipTotal += slice.gzipBytes
  }
  const html = SITE_STATS.weight.find((slice) => slice.id === 'html')
  assert.equal(html.bytes, SITE_STATS.availability.htmlBytes)
  assert.equal(html.gzipBytes, SITE_STATS.availability.htmlGzipBytes)
  assert.ok(gzipTotal < rawTotal)
})

test('speed measurements sit inside their budgets', () => {
  const { speed } = SITE_STATS
  assert.ok(speed.ttfbMs < speed.budgets.ttfbMs)
  assert.ok(speed.fullLoadMs < speed.budgets.fullLoadMs)
})

test('milestones run in chronological order', () => {
  const dates = SITE_STATS.milestones.map((milestone) => milestone.date)
  const sorted = [...dates].sort()
  assert.deepEqual(dates, sorted)
})

test('distribution channels report published artifacts', () => {
  assert.equal(SITE_STATS.channels.chromeWebStore.published, true)
  assert.ok(SITE_STATS.channels.github.repo.includes('sonicxboy-portfolio'))
  assert.equal(SITE_STATS.indexing.pagesPublished, 2)
})
