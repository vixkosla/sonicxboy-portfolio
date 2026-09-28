// Save Search Console data for the portfolio home pages only.
import { writeFileSync } from 'node:fs'
import { collectGoogle } from '../src/server/statsProviders.mjs'
import { loadStatsCredentials } from '../src/server/statsCredentials.mjs'

const snapshot = await collectGoogle({ credentials: loadStatsCredentials().google })
writeFileSync(new URL('../src/data/gsc.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n')
console.log('Google: ' + snapshot.totals.clicks + ' кликов, ' + snapshot.totals.impressions + ' показов; данные по ' + (snapshot.dataThrough || 'периоду без строк') + '.')
