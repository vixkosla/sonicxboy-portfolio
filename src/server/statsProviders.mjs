export const STATS_SCOPE = 'portfolio-home-pages'
export const STATS_WINDOW_DAYS = 28
export const COUNTER_ID = 111360686
export const CONTACT_GOAL_ID = 593910209
export const PORTFOLIO_FILTER = "ym:s:startURLDomain=='sonicxboy.dev' AND (ym:s:startURLPath=='/' OR ym:s:startURLPath=='' OR ym:s:startURLPath=='/en/' OR ym:s:startURLPath=='/en')"
export const GOOGLE_PAGE_FILTER = '^https://sonicxboy\\.dev/(en/?)?(\\?.*)?$'

export function dateInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(now)
  const part = (type) => parts.find((item) => item.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function reportingPeriod(now, timeZone) {
  const today = dateInZone(now, timeZone)
  const endDate = shiftDate(today, -1)
  return { today, startDate: shiftDate(endDate, -(STATS_WINDOW_DAYS - 1)), endDate, timeZone }
}

async function requestJson(fetchImpl, url, options = {}) {
  const timeout = AbortSignal.timeout(12_000)
  const response = await fetchImpl(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout })
  if (!response.ok) {
    const error = new Error(`Analytics provider returned HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function collectMetrika({ token, now = new Date(), fetchImpl = fetch }) {
  if (!token) throw Object.assign(new Error('Metrica is not connected'), { code: 'not-connected' })
  const budget = AbortSignal.timeout(40_000)
  const get = (path) => requestJson(fetchImpl, `https://api-metrika.yandex.net${path}`, { headers: { Authorization: `OAuth ${token}` }, signal: budget })
  const { counter } = await get(`/management/v1/counter/${COUNTER_ID}`)
  const period = reportingPeriod(now, counter.time_zone_name || 'Europe/Moscow')
  const trackingStartedAt = counter.create_time.slice(0, 10)
  period.startDate = [period.startDate, trackingStartedAt].sort().at(-1)
  const metrics = `ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:goal${CONTACT_GOAL_ID}visits`
  const query = (selectedMetrics, dimensions = '', extra = {}) => {
    const params = new URLSearchParams({ id: String(COUNTER_ID), date1: period.startDate, date2: period.endDate, metrics: selectedMetrics, filters: PORTFOLIO_FILTER, accuracy: 'full', include_undefined: 'true', lang: 'en', ...extra })
    if (dimensions) params.set('dimensions', dimensions)
    return get(`/stat/v1/data?${params}`)
  }
  // Metrica limits concurrent requests per account. Keep these sequential.
  const summary = await query(metrics)
  const daily = await query('ym:s:visits,ym:s:users,ym:s:pageviews', 'ym:s:visitDate', { sort: 'ym:s:visitDate', limit: '100' })
  const sources = await query('ym:s:visits', 'ym:s:trafficSource', { sort: '-ym:s:visits', limit: '20' })
  const referrers = await query('ym:s:visits', 'ym:s:refererDomain', { sort: '-ym:s:visits', limit: '30', include_undefined: 'false' })
  const devices = await query('ym:s:visits', 'ym:s:deviceCategory', { sort: '-ym:s:visits', limit: '10' })
  const today = await query(metrics, '', { date1: period.today, date2: period.today })
  const totals = summary.data?.[0]?.metrics ?? [0, 0, 0, 0]
  const todayTotals = today.data?.[0]?.metrics ?? [0, 0, 0, 0]
  const byDate = new Map((daily.data ?? []).map((row) => [row.dimensions[0].name, row.metrics]))
  const series = []
  for (let date = period.startDate; date <= period.endDate; date = shiftDate(date, 1)) {
    const row = byDate.get(date) ?? [0, 0, 0]
    series.push({ date, visits: Math.round(row[0]), users: Math.round(row[1]), pageviews: Math.round(row[2]) })
  }
  return {
    available: true, scope: STATS_SCOPE, refreshedAt: now.toISOString(), capturedAt: period.endDate,
    counter: COUNTER_ID, period, trackingStartedAt, windowDays: series.length, requestedWindowDays: STATS_WINDOW_DAYS,
    totals: { visits: Math.round(totals[0]), users: Math.round(totals[1]), pageviews: Math.round(totals[2]) },
    contacts: { visits: Math.round(totals[3]), conversionRate: totals[0] ? totals[3] / totals[0] : 0 },
    today: { date: period.today, visits: Math.round(todayTotals[0]), users: Math.round(todayTotals[1]), contacts: Math.round(todayTotals[3]), partial: true },
    daily: series,
    sources: (sources.data ?? []).map((row) => ({ id: row.dimensions[0]?.id ?? 'unknown', type: row.dimensions[0]?.name ?? 'Unknown', visits: Math.round(row.metrics[0]) })),
    referrers: (referrers.data ?? []).map((row) => ({ host: row.dimensions[0]?.name ?? '', visits: Math.round(row.metrics[0]) })).filter((row) => row.host && row.host !== 'sonicxboy.dev').slice(0, 6),
    devices: (devices.data ?? []).map((row) => ({ id: row.dimensions[0]?.id ?? 'unknown', type: row.dimensions[0]?.name ?? 'Other', visits: Math.round(row.metrics[0]) })),
  }
}

export async function collectGoogle({ credentials, now = new Date(), fetchImpl = fetch }) {
  const { clientId, clientSecret, refreshToken, accessToken: suppliedAccessToken, siteUrl = 'https://sonicxboy.dev/' } = credentials
  if (!suppliedAccessToken && !(clientId && clientSecret && refreshToken)) {
    throw Object.assign(new Error('Search Console is not connected'), { code: 'not-connected' })
  }
  // A stored refresh token keeps unattended requests working after access tokens expire.
  let accessToken = suppliedAccessToken
  if (refreshToken && clientId && clientSecret) {
    const result = await requestJson(fetchImpl, 'https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    })
    accessToken = result.access_token
    if (!accessToken) throw new Error('Google did not return an access token')
  }
  const { startDate, endDate, timeZone } = reportingPeriod(now, 'America/Los_Angeles')
  const period = { startDate, endDate, timeZone }
  const query = (dimensions = [], rowLimit = 1000) => requestJson(fetchImpl, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, type: 'web', dataState: 'all', aggregationType: 'byPage', dimensionFilterGroups: [{ groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: GOOGLE_PAGE_FILTER }] }] }),
  })
  const results = await Promise.all([query([], 1), query(['date'], STATS_WINDOW_DAYS), query(['query'], 10), query(['page'], 10)])
  const [summary, dailyResult, queryResult, pageResult] = results
  const metrics = (row = {}) => ({ clicks: Math.round(row.clicks ?? 0), impressions: Math.round(row.impressions ?? 0), ctr: row.ctr ?? 0, position: row.impressions ? row.position : null })
  const daily = (dailyResult.rows ?? []).map((row) => ({ date: row.keys[0], ...metrics(row) })).sort((a, b) => a.date.localeCompare(b.date))
  return {
    available: true, scope: STATS_SCOPE, source: 'api', refreshedAt: now.toISOString(), siteUrl,
    requestedWindowDays: STATS_WINDOW_DAYS, period, dataThrough: daily.at(-1)?.date ?? null,
    firstIncompleteDate: dailyResult.metadata?.first_incomplete_date ?? null,
    totals: metrics(summary.rows?.[0]), daily,
    queries: (queryResult.rows ?? []).map((row) => ({ query: row.keys[0], ...metrics(row) })),
    pages: (pageResult.rows ?? []).map((row) => ({ path: new URL(row.keys[0]).pathname, ...metrics(row) })),
  }
}
