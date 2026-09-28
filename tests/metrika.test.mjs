import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const metrika = JSON.parse(
  await readFile(new URL('../src/data/metrika.json', import.meta.url), 'utf8'),
)

test('Metrika snapshot is a complete rolling daily window', () => {
  assert.equal(metrika.available, true)
  assert.equal(metrika.daily.length, metrika.windowDays)
  assert.ok(metrika.windowDays <= metrika.requestedWindowDays)
  const rollingFirst = new Date(`${metrika.capturedAt}T00:00:00Z`)
  rollingFirst.setUTCDate(rollingFirst.getUTCDate() - (metrika.requestedWindowDays - 1))
  const expectedFirst = [rollingFirst.toISOString().slice(0, 10), metrika.trackingStartedAt]
    .sort()
    .at(-1)
  assert.equal(metrika.daily[0]?.date, expectedFirst)
  assert.equal(metrika.daily.at(-1)?.date, metrika.capturedAt)

  for (let index = 0; index < metrika.daily.length; index += 1) {
    const day = metrika.daily[index]
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(day.visits >= 0)
    assert.ok(day.users >= 0)
    assert.ok(day.pageviews >= 0)

    if (index > 0) {
      const previous = new Date(`${metrika.daily[index - 1].date}T00:00:00Z`)
      const current = new Date(`${day.date}T00:00:00Z`)
      assert.equal(current.getTime() - previous.getTime(), 86_400_000)
    }
  }
})

test('Metrika totals stay consistent with the daily series', () => {
  const totals = metrika.daily.reduce(
    (sum, day) => ({
      visits: sum.visits + day.visits,
      users: sum.users + day.users,
      pageviews: sum.pageviews + day.pageviews,
    }),
    { visits: 0, users: 0, pageviews: 0 },
  )

  assert.equal(metrika.totals.visits, totals.visits)
  assert.equal(metrika.totals.pageviews, totals.pageviews)
  assert.ok(metrika.totals.users <= totals.users, 'period users are de-duplicated across days')
  assert.ok(metrika.totals.users >= Math.max(...metrika.daily.map((day) => day.users)))
})

test('Metrika snapshot includes changing audience breakdowns', () => {
  for (const row of metrika.sources) {
    assert.ok(row.type)
    assert.ok(row.visits >= 0)
  }
  for (const row of metrika.devices) {
    assert.ok(row.type)
    assert.ok(row.visits >= 0)
  }
  for (const row of metrika.referrers) {
    assert.ok(row.host)
    assert.ok(row.visits >= 0)
  }
  assert.equal(metrika.scope, 'portfolio-home-pages')
  assert.ok(metrika.contacts.visits <= metrika.totals.visits)
  assert.ok(metrika.contacts.conversionRate >= 0 && metrika.contacts.conversionRate <= 1)
  assert.equal(metrika.today.partial, true)
  assert.ok(metrika.today.date > metrika.daily.at(-1).date)
})
