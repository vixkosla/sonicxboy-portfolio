// Imports the ordinary Search Console Performance export (ZIP, a directory
// of CSV files, or one Chart/Dates CSV) without Google Cloud or OAuth.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const OUT_FILE =
  process.env.GSC_OUTPUT ??
  join(dirname(fileURLToPath(import.meta.url)), '../src/data/gsc.json')
const input = process.argv[2]

if (!input) {
  console.error(
    'Укажите ZIP, CSV или папку из Search Console:\n' +
      'pnpm stats:google:import -- ~/Downloads/sonicxboy.dev-Performance-on-Search.zip',
  )
  process.exit(1)
}

if (!existsSync(input)) {
  console.error(`Файл не найден: ${input}`)
  process.exit(1)
}

const normalize = (value) =>
  value
    .replace(/^\uFEFF/, '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ru-RU')

const readExportFiles = (path) => {
  const files = new Map()
  const stats = statSync(path)

  if (stats.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (extname(name).toLowerCase() !== '.csv') continue
      files.set(normalize(basename(name, extname(name))), readFileSync(join(path, name), 'utf8'))
    }
    return files
  }

  if (extname(path).toLowerCase() === '.csv') {
    files.set(normalize(basename(path, extname(path))), readFileSync(path, 'utf8'))
    return files
  }

  if (extname(path).toLowerCase() !== '.zip') {
    throw new Error('Поддерживаются ZIP, CSV и папка с CSV из Search Console')
  }

  const listing = spawnSync('unzip', ['-Z1', path], { encoding: 'utf8' })
  if (listing.status !== 0) {
    throw new Error(`Не удалось прочитать ZIP: ${listing.stderr.trim() || 'unzip недоступен'}`)
  }
  for (const entry of listing.stdout.split(/\r?\n/).filter(Boolean)) {
    if (extname(entry).toLowerCase() !== '.csv') continue
    const result = spawnSync('unzip', ['-p', path, entry], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    })
    if (result.status !== 0) throw new Error(`Не удалось прочитать ${entry} из ZIP`)
    files.set(normalize(basename(entry, extname(entry))), result.stdout)
  }
  return files
}

const delimiterFor = (text) => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let quoted = false
  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index]
    if (char === '"') {
      if (quoted && firstLine[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && char in counts) {
      counts[char] += 1
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

const parseCsv = (text) => {
  const delimiter = delimiterFor(text)
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  row.push(field.replace(/\r$/, ''))
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

const records = (text) => {
  const rows = parseCsv(text)
  const headers = (rows.shift() ?? []).map(normalize)
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ''])),
  )
}

const pickValue = (record, aliases) => {
  for (const alias of aliases.map(normalize)) {
    if (Object.hasOwn(record, alias)) return record[alias]
  }
  return ''
}

const count = (value) => {
  const cleaned = String(value).replace(/[\s\u00a0\u202f]/g, '').replace(/[^\d-]/g, '')
  return cleaned ? Number.parseInt(cleaned, 10) : 0
}
const decimal = (value) => {
  let cleaned = String(value).replace(/[\s\u00a0\u202f]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) cleaned = cleaned.replace(/,/g, '')
  else cleaned = cleaned.replace(',', '.')
  const parsed = Number.parseFloat(cleaned.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}
const ratio = (value) => (String(value).includes('%') ? decimal(value) / 100 : decimal(value))

const fieldAliases = {
  date: ['date', 'дата'],
  query: ['top queries', 'query', 'queries', 'популярные запросы', 'запрос', 'запросы'],
  page: ['top pages', 'page', 'pages', 'популярные страницы', 'страница', 'страницы'],
  clicks: ['clicks', 'клики'],
  impressions: ['impressions', 'показы'],
  ctr: ['ctr'],
  position: ['position', 'average position', 'позиция', 'средняя позиция'],
}

const metricRow = (record) => ({
  clicks: count(pickValue(record, fieldAliases.clicks)),
  impressions: count(pickValue(record, fieldAliases.impressions)),
  ctr: ratio(pickValue(record, fieldAliases.ctr)),
  position: decimal(pickValue(record, fieldAliases.position)),
})

const findNamedFile = (files, aliases) => {
  const normalizedAliases = aliases.map(normalize)
  for (const [name, text] of files) {
    if (normalizedAliases.some((alias) => name === alias || name.includes(alias))) return text
  }
  return null
}

const hasColumn = (text, aliases) => {
  const first = parseCsv(text)[0]?.map(normalize) ?? []
  return aliases.map(normalize).some((alias) => first.includes(alias))
}

const findByColumn = (files, aliases) => {
  for (const text of files.values()) if (hasColumn(text, aliases)) return text
  return null
}

const toPath = (value) => {
  try {
    const url = new URL(value)
    return `${url.pathname}${url.search}`
  } catch {
    return value
  }
}

try {
  const files = readExportFiles(input)
  if (!files.size) throw new Error('В экспорте не найдено CSV-файлов')

  const chartText =
    findNamedFile(files, ['chart', 'dates', 'график', 'даты']) ??
    findByColumn(files, fieldAliases.date)
  if (!chartText) throw new Error('Не найден CSV с графиком по датам')

  const queryText = findNamedFile(files, ['queries', 'query', 'запросы', 'запрос'])
  const pageText = findNamedFile(files, ['pages', 'page', 'страницы', 'страница'])

  const daily = records(chartText)
    .map((record) => ({
      date: pickValue(record, fieldAliases.date),
      ...metricRow(record),
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (!daily.length) throw new Error('В CSV нет строк с датами в формате YYYY-MM-DD')

  const totals = daily.reduce(
    (sum, row) => {
      sum.clicks += row.clicks
      sum.impressions += row.impressions
      sum.weightedPosition += row.position * row.impressions
      return sum
    },
    { clicks: 0, impressions: 0, weightedPosition: 0 },
  )

  const period = { startDate: daily[0].date, endDate: daily.at(-1).date }
  const requestedWindowDays =
    Math.round(
      (new Date(`${period.endDate}T00:00:00Z`).getTime() -
        new Date(`${period.startDate}T00:00:00Z`).getTime()) /
        86_400_000,
    ) + 1

  const payload = {
    available: true,
    source: 'manual-export',
    refreshedAt: new Date().toISOString(),
    siteUrl: 'sc-domain:sonicxboy.dev',
    requestedWindowDays,
    period,
    dataThrough: period.endDate,
    firstIncompleteDate: null,
    totals: {
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      position: totals.impressions ? totals.weightedPosition / totals.impressions : 0,
    },
    daily,
    queries: queryText
      ? records(queryText)
          .map((record) => ({
            query: pickValue(record, fieldAliases.query),
            ...metricRow(record),
          }))
          .filter((row) => row.query)
          .slice(0, 10)
      : [],
    pages: pageText
      ? records(pageText)
          .map((record) => ({
            path: toPath(pickValue(record, fieldAliases.page)),
            ...metricRow(record),
          }))
          .filter((row) => row.path)
          .slice(0, 8)
      : [],
  }

  writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(
    `gsc.json импортирован: ${payload.totals.clicks} кликов, ` +
      `${payload.totals.impressions} показов, ${payload.queries.length} запросов, ` +
      `${period.startDate} — ${period.endDate}`,
  )
} catch (error) {
  console.error(`Импорт Search Console не выполнен: ${error.message}`)
  process.exit(1)
}
