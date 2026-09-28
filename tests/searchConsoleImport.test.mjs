import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('ordinary Russian Search Console CSV export imports without OAuth', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'sonicxboy-gsc-'))
  const source = join(temp, 'export')
  const output = join(temp, 'gsc.json')
  await mkdir(source)

  await writeFile(
    join(source, 'График.csv'),
    [
      'Дата;Клики;Показы;CTR;Позиция',
      '2026-08-08;1;10;10%;7,5',
      '2026-08-09;2;20;10%;5,5',
    ].join('\n'),
  )
  await writeFile(
    join(source, 'Запросы.csv'),
    ['Популярные запросы;Клики;Показы;CTR;Позиция', 'three.js разработчик;2;12;16,67%;4,2'].join('\n'),
  )
  await writeFile(
    join(source, 'Страницы.csv'),
    ['Популярные страницы;Клики;Показы;CTR;Позиция', 'https://sonicxboy.dev/;3;30;10%;6,2'].join('\n'),
  )

  const result = spawnSync(
    process.execPath,
    [new URL('../scripts/import-search-console-export.mjs', import.meta.url).pathname, source],
    {
      encoding: 'utf8',
      env: { ...process.env, GSC_OUTPUT: output },
    },
  )

  try {
    assert.equal(result.status, 0, result.stderr)
    const snapshot = JSON.parse(await readFile(output, 'utf8'))
    assert.equal(snapshot.available, true)
    assert.equal(snapshot.source, 'manual-export')
    assert.deepEqual(snapshot.period, {
      startDate: '2026-08-08',
      endDate: '2026-08-09',
    })
    assert.equal(snapshot.requestedWindowDays, 2)
    assert.equal(snapshot.totals.clicks, 3)
    assert.equal(snapshot.totals.impressions, 30)
    assert.equal(snapshot.totals.ctr, 0.1)
    assert.equal(snapshot.queries[0].query, 'three.js разработчик')
    assert.equal(snapshot.pages[0].path, '/')
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
