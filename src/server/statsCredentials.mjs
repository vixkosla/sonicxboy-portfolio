import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const readLocal = (filename) => {
  if (process.env.VERCEL) return {}
  const path = join(homedir(), '.config', 'sonicxboy-stats', filename)
  if (!existsSync(path)) return {}
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return {} }
}

export function loadStatsCredentials() {
  const tokens = readLocal('tokens.json')
  const document = readLocal('google-oauth.json')
  const google = document.web ?? document.installed ?? document
  return {
    yandex: process.env.YANDEX_METRIKA_TOKEN || tokens.yandex?.accessToken,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || google.client_id,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || google.client_secret,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN || tokens.google?.refreshToken,
      accessToken: process.env.GOOGLE_ACCESS_TOKEN || (Number(tokens.google?.expiresAt) > Date.now() + 60_000 ? tokens.google.accessToken : undefined),
      siteUrl: process.env.GSC_SITE_URL || 'sc-domain:sonicxboy.dev',
    },
  }
}
