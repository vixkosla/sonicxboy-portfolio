import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const gsc = JSON.parse(
  await readFile(new URL('../src/data/gsc.json', import.meta.url), 'utf8'),
)

test('Search Console snapshot has a stable public-data schema', () => {
  assert.equal(typeof gsc.available, 'boolean')
  assert.ok(Number.isInteger(gsc.requestedWindowDays))
  assert.ok(gsc.requestedWindowDays > 0)
  for (const metric of ['clicks', 'impressions', 'ctr', 'position']) {
    assert.equal(typeof gsc.totals[metric], 'number')
  }
  assert.ok(Array.isArray(gsc.daily))
  assert.ok(Array.isArray(gsc.queries))
  assert.ok(Array.isArray(gsc.pages))
})

test('Search Console data is dated when available', () => {
  if (!gsc.available) return
  assert.match(gsc.period.startDate, /^\d{4}-\d{2}-\d{2}$/)
  assert.match(gsc.period.endDate, /^\d{4}-\d{2}-\d{2}$/)
  if (gsc.dataThrough) assert.match(gsc.dataThrough, /^\d{4}-\d{2}-\d{2}$/)
})
