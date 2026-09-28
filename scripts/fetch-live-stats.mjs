// Save a dated fallback for the live, server-rendered dashboard.
import { writeFileSync } from 'node:fs'
import { collectMetrika } from '../src/server/statsProviders.mjs'
import { loadStatsCredentials } from '../src/server/statsCredentials.mjs'

const snapshot = await collectMetrika({ token: loadStatsCredentials().yandex })
writeFileSync(new URL('../src/data/metrika.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n')
console.log('Метрика: ' + snapshot.period.startDate + ' — ' + snapshot.period.endDate + ', ' + snapshot.totals.visits + ' визитов, ' + snapshot.contacts.visits + ' перехода к контакту.')
