import metrika from '../data/metrika.json' with { type: 'json' }
import gsc from '../data/gsc.json' with { type: 'json' }
import gscIndex from '../data/gscIndex.json' with { type: 'json' }
import { collectMetrika, collectGoogle } from './statsProviders.mjs'
import { collectGoogleIndex } from './googleIndex.mjs'
import { loadStatsCredentials } from './statsCredentials.mjs'
import { createStatsCache } from './statsCache.mjs'

const traffic = createStatsCache(() => collectMetrika({ token: loadStatsCredentials().yandex }), { fallback: metrika })
const search = createStatsCache(() => collectGoogle({ credentials: loadStatsCredentials().google }), { fallback: gsc })
const index = createStatsCache(() => collectGoogleIndex({ credentials: loadStatsCredentials().google }), { fallback: gscIndex, ttl: 12 * 60 * 60_000 })

export async function getStatsDashboard() {
  const [metrika, google, indexing] = await Promise.all([traffic(), search(), index()])
  return { metrika, google, indexing }
}
