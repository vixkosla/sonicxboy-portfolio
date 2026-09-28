import { STATS_SCOPE } from './statsProviders.mjs'

export function createStatsCache(loader, { fallback = null, now = () => Date.now(), ttl = 300_000, retryDelay = 60_000 } = {}) {
  let saved = fallback?.available && fallback.scope === STATS_SCOPE ? fallback : null
  let nextCheck = 0
  let state
  let pending
  return async function load() {
    if (state && now() < nextCheck) return state
    if (pending) return pending
    pending = (async () => {
      try {
        saved = await Promise.resolve().then(loader)
        state = { status: 'ready', data: saved }
        nextCheck = now() + ttl
      } catch (error) {
        // Never turn missing access or an upstream outage into a successful zero.
        state = { status: saved ? 'stale' : error.code === 'not-connected' ? 'not-connected' : 'unavailable', data: saved }
        nextCheck = now() + retryDelay
      } finally {
        pending = null
      }
      return state
    })()
    return pending
  }
}
