import metrika from '../data/metrika.json' with { type: 'json' }
import gsc from '../data/gsc.json' with { type: 'json' }
import { collectMetrika, collectGoogle } from './statsProviders.mjs'
import { loadStatsCredentials } from './statsCredentials.mjs'
import { createStatsCache } from './statsCache.mjs'

const traffic = createStatsCache(() => collectMetrika({ token: loadStatsCredentials().yandex }), { fallback: metrika })
const search = createStatsCache(() => collectGoogle({ credentials: loadStatsCredentials().google }), { fallback: gsc })

export async function getStatsDashboard() {
  const [metrika, google] = await Promise.all([traffic(), search()])
  return { metrika, google }
}
