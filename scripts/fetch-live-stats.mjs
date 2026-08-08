// Pulls Yandex Metrika traffic for counter 111360686 using the OAuth token
// captured by scripts/oauth-catch-server.mjs, and rewrites
// src/data/metrika.json so the /stats dashboard renders live traffic charts
// on the next build. Run: node scripts/fetch-live-stats.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const COUNTER = 111360686
const TOKEN_FILE = join(homedir(), '.config', 'sonicxboy-stats', 'tokens.json')
const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '../src/data/metrika.json')

if (!existsSync(TOKEN_FILE)) {
  console.error('нет токена: пройдите авторизацию через scripts/oauth-catch-server.mjs')
  process.exit(1)
}
const token = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).yandex?.accessToken
if (!token) {
  console.error('нет токена Яндекса в tokens.json')
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
const date1 = '2026-08-01'

const metrika = async (path) => {
  const response = await fetch(`https://api-metrika.yandex.net${path}`, {
    headers: { Authorization: `OAuth ${token}` },
  })
  if (!response.ok) {
    throw new Error(`Metrika ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

const daily = await metrika(
  `/stat/v1/data?id=${COUNTER}` +
    `&metrics=ym:s:visits,ym:s:users,ym:s:pageviews` +
    `&dimensions=ym:s:visitDate&group=day` +
    `&date1=${date1}&date2=${today}&sort=ym:s:visitDate`,
)
const sources = await metrika(
  `/stat/v1/data?id=${COUNTER}` +
    `&metrics=ym:s:visits&dimensions=ym:s:trafficSource` +
    `&date1=${date1}&date2=${today}&sort=-ym:s:visits&limit=6`,
)

const round = (value) => Math.round(value)
const payload = {
  available: true,
  capturedAt: today,
  counter: COUNTER,
  daily: daily.data.map((row) => ({
    date: row.dimensions?.[0]?.name ?? row.data,
    visits: round(row.metrics[0]),
    users: round(row.metrics[1]),
    pageviews: round(row.metrics[2]),
  })),
  sources: sources.data.map((row) => ({
    type: row.dimensions?.[0]?.name ?? row.data ?? 'other',
    visits: round(row.metrics[0]),
  })),
}

const totals = payload.daily.reduce(
  (acc, day) => ({
    visits: acc.visits + day.visits,
    users: acc.users + day.users,
    pageviews: acc.pageviews + day.pageviews,
  }),
  { visits: 0, users: 0, pageviews: 0 },
)
payload.totals = totals

writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2))
console.log(
  `metrika.json обновлён: ${payload.daily.length} дней, визитов ${totals.visits}, источников ${payload.sources.length}`,
)
