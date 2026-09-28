// Refresh every configured analytics provider without making an unconfigured
// provider break the others. This is the entrypoint used locally and by CI.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN_FILE = join(homedir(), '.config', 'sonicxboy-stats', 'tokens.json')
let localTokens = {}
if (existsSync(TOKEN_FILE)) {
  try {
    localTokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
  } catch {
    localTokens = {}
  }
}

const run = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'scripts', script)], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))))
  })

const providers = [
  {
    name: 'Яндекс.Метрика',
    configured: Boolean(process.env.YANDEX_METRIKA_TOKEN || localTokens.yandex?.accessToken),
    script: 'fetch-live-stats.mjs',
  },
  {
    name: 'Google Search Console',
    configured: Boolean(
      process.env.GOOGLE_ACCESS_TOKEN ||
        process.env.GOOGLE_REFRESH_TOKEN ||
        localTokens.google?.accessToken ||
        localTokens.google?.refreshToken,
    ),
    script: 'fetch-google-stats.mjs',
  },
]

let refreshed = 0
for (const provider of providers) {
  if (!provider.configured) {
    console.log(`${provider.name}: пропущено — авторизация ещё не настроена`)
    continue
  }
  await run(provider.script)
  refreshed += 1
}

if (!refreshed) console.log('Нет настроенных источников статистики; сохранённые снимки не изменены.')
