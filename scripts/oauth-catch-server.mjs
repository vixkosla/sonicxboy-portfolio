// Local OAuth redirect catcher for the launch-telemetry stats pipeline.
// Yandex implicit flow lands the token in the URL fragment, so /callback
// serves a page that reads location.hash and posts it back to /token.
// Google desktop flow delivers ?code=... on /gcallback. Captured secrets
// are written to ~/.config/sonicxboy-stats/tokens.json (outside the repo).
import http from 'node:http'
import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PORT = 8901
const TOKEN_DIR = join(homedir(), '.config', 'sonicxboy-stats')
const TOKEN_FILE = join(TOKEN_DIR, 'tokens.json')

const loadTokens = () => {
  if (!existsSync(TOKEN_FILE)) return {}
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
  } catch {
    return {}
  }
}

const saveToken = (provider, payload) => {
  mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 })
  const tokens = loadTokens()
  tokens[provider] = { ...payload, savedAt: new Date().toISOString() }
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
  chmodSync(TOKEN_FILE, 0o600)
}

const CALLBACK_PAGE = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Токен получен</title></head>
<body style="font-family:monospace;background:#050907;color:#18d383;display:grid;place-items:center;height:100vh">
<div>
  <h2>✓ Токен ушёл в сборщик статистики</h2>
  <p>Можно закрыть вкладку и вернуться в терминал.</p>
</div>
<script>
  const hash = new URLSearchParams(location.hash.slice(1))
  const query = new URLSearchParams(location.search)
  const payload = {
    accessToken: hash.get('access_token') || '',
    code: query.get('code') || '',
    state: query.get('state') || hash.get('state') || ''
  }
  if (payload.accessToken || payload.code) {
    fetch('/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }
</script>
</body>
</html>`

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'GET' && (url.pathname === '/callback' || url.pathname === '/gcallback')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(CALLBACK_PAGE)
    return
  }

  if (req.method === 'POST' && url.pathname === '/token') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const provider = payload.code && !payload.accessToken ? 'google' : 'yandex'
        saveToken(provider, payload)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, provider }))
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: String(error) }))
      }
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    const tokens = loadTokens()
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        yandex: Boolean(tokens.yandex?.accessToken),
        googleCode: Boolean(tokens.google?.code),
        savedAt: { yandex: tokens.yandex?.savedAt, google: tokens.google?.savedAt },
      }),
    )
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, () => {
  console.log(`oauth catch server on http://localhost:${PORT} (status: /status)`)
})
