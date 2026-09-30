import { writeFileSync } from 'node:fs'
import { collectGoogleIndex } from '../src/server/googleIndex.mjs'
import { loadStatsCredentials } from '../src/server/statsCredentials.mjs'

const snapshot = await collectGoogleIndex({ credentials: loadStatsCredentials().google })
writeFileSync(new URL('../src/data/gscIndex.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n')
console.log(`Google index: ${snapshot.pages.filter((page) => page.verdict === 'PASS').length}/${snapshot.pages.length} главных страниц в индексе.`)
