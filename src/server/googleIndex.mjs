import { STATS_SCOPE } from './statsProviders.mjs'

const SITE_URL = 'https://sonicxboy.dev/'
const PAGE_PATHS = ['/', '/en/']

async function requestJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(12_000) })
  if (!response.ok) {
    const error = new Error(`Google URL Inspection returned HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function collectGoogleIndex({ credentials, now = new Date(), fetchImpl = fetch }) {
  const { clientId, clientSecret, refreshToken, accessToken: suppliedAccessToken, siteUrl = SITE_URL } = credentials
  if (!suppliedAccessToken && !(clientId && clientSecret && refreshToken)) {
    throw Object.assign(new Error('Search Console is not connected'), { code: 'not-connected' })
  }

  let accessToken = suppliedAccessToken
  if (refreshToken && clientId && clientSecret) {
    const token = await requestJson(fetchImpl, 'https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    })
    accessToken = token.access_token
    if (!accessToken) throw new Error('Google did not return an access token')
  }

  const pages = await Promise.all(PAGE_PATHS.map(async (path) => {
    const inspectionUrl = new URL(path.slice(1), SITE_URL).href
    const result = await requestJson(fetchImpl, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: 'en-US' }),
    })
    const status = result.inspectionResult?.indexStatusResult
    if (!status) throw new Error('Google URL Inspection returned no index status')
    return {
      path,
      verdict: status.verdict ?? 'VERDICT_UNSPECIFIED',
      coverageState: status.coverageState ?? null,
      robotsTxtState: status.robotsTxtState ?? null,
      indexingState: status.indexingState ?? null,
      pageFetchState: status.pageFetchState ?? null,
      lastCrawlTime: status.lastCrawlTime ?? null,
      googleCanonical: status.googleCanonical ?? null,
      userCanonical: status.userCanonical ?? null,
    }
  }))

  return { available: true, scope: STATS_SCOPE, source: 'api', refreshedAt: now.toISOString(), siteUrl, pages }
}
