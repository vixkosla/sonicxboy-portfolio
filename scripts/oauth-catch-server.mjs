// Local OAuth helper for the stats pipeline.
//
// Yandex returns an access token in the URL fragment at /callback.
// Google starts at /google/start and returns an authorization code to
// /gcallback; the code is exchanged server-side so it never enters the repo.
// Tokens live in ~/.config/sonicxboy-stats/tokens.json with mode 0600.
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PORT = 8901
const TOKEN_DIR = join(homedir(), '.config', 'sonicxboy-stats')
const TOKEN_FILE = join(TOKEN_DIR, 'tokens.json')
const GOOGLE_CREDENTIALS_FILE = join(TOKEN_DIR, 'google-oauth.json')
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/gcallback`
let googleAuthState = ''

const loadJson = (path, fallback = {}) => {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

const loadTokens = () => loadJson(TOKEN_FILE)

const saveToken = (provider, payload) => {
  mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 })
  const tokens = loadTokens()
  tokens[provider] = { ...tokens[provider], ...payload, savedAt: new Date().toISOString() }
  writeFileSync(TOKEN_FILE, `${JSON.stringify(tokens, null, 2)}\n`)
  chmodSync(TOKEN_FILE, 0o600)
}

const loadGoogleCredentials = () => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || GOOGLE_REDIRECT_URI,
    }
  }

  const document = loadJson(GOOGLE_CREDENTIALS_FILE, null)
  const credentials = document?.installed ?? document?.web ?? document
  if (!credentials?.client_id || !credentials?.client_secret) return null
  return {
    clientId: credentials.client_id,
    clientSecret: credentials.client_secret,
    redirectUri:
      credentials.redirect_uris?.find((uri) => uri === GOOGLE_REDIRECT_URI) ??
      GOOGLE_REDIRECT_URI,
  }
}

const googleTokenRequest = async (body) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(`Google OAuth ${response.status}: ${result.error_description ?? result.error}`)
  }
  return result
}

const finishGoogleAuthorization = async (code) => {
  const credentials = loadGoogleCredentials()
  if (!credentials) throw new Error('Google OAuth credentials are not configured')
  const result = await googleTokenRequest({
    code,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    redirect_uri: credentials.redirectUri,
    grant_type: 'authorization_code',
  })
  const tokenPayload = {
    accessToken: result.access_token,
    expiresAt: Date.now() + result.expires_in * 1000,
    scope: result.scope,
    tokenType: result.token_type,
  }
  if (result.refresh_token) tokenPayload.refreshToken = result.refresh_token
  if (result.refresh_token_expires_in) {
    tokenPayload.refreshTokenExpiresAt = Date.now() + result.refresh_token_expires_in * 1000
  }
  saveToken('google', tokenPayload)
}

const sendHtml = (res, status, title, message) => {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title></head>
  <body style="font-family:monospace;background:#050907;color:#18d383;display:grid;place-items:center;min-height:100vh;margin:0">
  <main><h2>${title}</h2><p>${message}</p></main></body></html>`)
}

const YANDEX_CALLBACK_PAGE = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Токен получен</title></head>
<body style="font-family:monospace;background:#050907;color:#18d383;display:grid;place-items:center;height:100vh">
<div><h2>✓ Токен ушёл в сборщик статистики</h2><p>Можно закрыть вкладку и вернуться в терминал.</p></div>
<script>
  const hash = new URLSearchParams(location.hash.slice(1))
  const accessToken = hash.get('access_token') || ''
  if (accessToken) fetch('/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accessToken })
  })
</script>
</body></html>`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/callback') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(YANDEX_CALLBACK_PAGE)
    return
  }

  if (req.method === 'GET' && url.pathname === '/google/start') {
    const credentials = loadGoogleCredentials()
    if (!credentials) {
      sendHtml(
        res,
        503,
        'Google OAuth не настроен',
        `Сохраните JSON OAuth-клиента в ${GOOGLE_CREDENTIALS_FILE} и обновите страницу.`,
      )
      return
    }
    googleAuthState = randomBytes(24).toString('hex')
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.search = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state: googleAuthState,
    })
    res.writeHead(302, { location: authUrl.toString() })
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/gcallback') {
    if (url.searchParams.get('error')) {
      sendHtml(res, 400, 'Google не подключён', 'Авторизация была отменена или отклонена.')
      return
    }
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !googleAuthState || state !== googleAuthState) {
      sendHtml(res, 400, 'Ошибка OAuth', 'Неверный code/state. Запустите авторизацию заново.')
      return
    }
    googleAuthState = ''
    try {
      await finishGoogleAuthorization(code)
      sendHtml(res, 200, '✓ Google Search Console подключён', 'Можно закрыть вкладку и обновить статистику.')
    } catch (error) {
      sendHtml(res, 500, 'Google не подключён', String(error).replace(/[<>&]/g, ''))
    }
    return
  }

  if (req.method === 'POST' && url.pathname === '/token') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        if (!payload.accessToken) throw new Error('access token is missing')
        saveToken('yandex', { accessToken: payload.accessToken })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, provider: 'yandex' }))
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: String(error) }))
      }
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    const tokens = loadTokens()
    const credentials = loadGoogleCredentials()
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        yandex: Boolean(tokens.yandex?.accessToken),
        googleCredentials: Boolean(credentials),
        google: Boolean(tokens.google?.refreshToken || tokens.google?.accessToken),
        savedAt: { yandex: tokens.yandex?.savedAt, google: tokens.google?.savedAt },
      }),
    )
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OAuth helper: http://localhost:${PORT}`)
  console.log(`status: /status · Google start: /google/start`)
})
