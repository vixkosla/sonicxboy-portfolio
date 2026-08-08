// Launch-telemetry snapshot for sonicxboy.dev.
// Collected 2026-08-08 from the production edge (curl probes, GitHub REST
// API, Chrome Web Store listing, DuckDuckGo index). Metrika / Search Console
// traffic series join this snapshot once OAuth tokens are provided —
// the panels below degrade to explicit "awaiting token" placeholders.

export interface LocalizedText {
  ru: string
  en: string
}

export interface PublishCheck {
  id: string
  label: LocalizedText
  ok: boolean
  detail: LocalizedText
}

export interface WeightSlice {
  id: 'js' | 'html' | 'css'
  label: LocalizedText
  bytes: number
  gzipBytes: number
}

export interface Milestone {
  date: string
  label: LocalizedText
}

export const SITE_STATS = {
  capturedAt: '2026-08-08',
  site: 'https://sonicxboy.dev',

  hosting: {
    provider: 'Vercel',
    edge: 'fra1',
    protocol: 'HTTP/2',
    hsts: true,
    cache: 'HIT',
  },

  availability: {
    httpStatus: 200,
    ttfbMs: 185,
    fullLoadMs: 323,
    htmlBytes: 83579,
    htmlGzipBytes: 16397,
  },

  indexing: {
    pagesPublished: 2,
    pagesIndexed: 2,
    engines: [
      { name: 'Google', verified: true, indexed: null },
      { name: 'Yandex', verified: true, indexed: null },
      { name: 'Bing', verified: true, indexed: null },
      { name: 'DuckDuckGo', verified: false, indexed: 2 },
    ],
  },

  checks: [
    {
      id: 'https',
      label: { ru: 'HTTPS + HSTS', en: 'HTTPS + HSTS' },
      ok: true,
      detail: { ru: 'max-age 2 года', en: 'max-age 2 years' },
    },
    {
      id: 'robots',
      label: { ru: 'robots.txt', en: 'robots.txt' },
      ok: true,
      detail: { ru: 'открыт, AI-краулеры разрешены', en: 'open, AI crawlers allowed' },
    },
    {
      id: 'sitemap',
      label: { ru: 'sitemap-index.xml', en: 'sitemap-index.xml' },
      ok: true,
      detail: { ru: '2 URL, без ошибок', en: '2 URLs, no errors' },
    },
    {
      id: 'hreflang',
      label: { ru: 'hreflang RU/EN', en: 'hreflang RU/EN' },
      ok: true,
      detail: { ru: 'ru, en, x-default', en: 'ru, en, x-default' },
    },
    {
      id: 'canonical',
      label: { ru: 'canonical + OG', en: 'canonical + OG' },
      ok: true,
      detail: { ru: 'og:image 1200×630', en: 'og:image 1200×630' },
    },
    {
      id: 'jsonld',
      label: { ru: 'JSON-LD схемы', en: 'JSON-LD schema' },
      ok: true,
      detail: { ru: 'Person, WebSite, Code', en: 'Person, WebSite, Code' },
    },
    {
      id: 'gsc',
      label: { ru: 'Google Search Console', en: 'Google Search Console' },
      ok: true,
      detail: { ru: 'мета-верификация', en: 'meta verification' },
    },
    {
      id: 'yandex',
      label: { ru: 'Яндекс.Вебмастер', en: 'Yandex Webmaster' },
      ok: true,
      detail: { ru: 'мета + файл', en: 'meta + file' },
    },
    {
      id: 'bing',
      label: { ru: 'Bing Webmaster', en: 'Bing Webmaster' },
      ok: true,
      detail: { ru: 'msvalidate.01', en: 'msvalidate.01' },
    },
    {
      id: 'metrika',
      label: { ru: 'Яндекс.Метрика', en: 'Yandex Metrika' },
      ok: true,
      detail: { ru: 'счётчик 111360686', en: 'counter 111360686' },
    },
    {
      id: 'llmstxt',
      label: { ru: 'llms.txt', en: 'llms.txt' },
      ok: true,
      detail: { ru: '9.8 КБ контекста для ИИ', en: '9.8 KB of AI context' },
    },
  ] satisfies PublishCheck[],

  weight: [
    {
      id: 'js',
      label: { ru: 'JS — Three.js + React', en: 'JS — Three.js + React' },
      bytes: 1233088,
      gzipBytes: 344877,
    },
    {
      id: 'html',
      label: { ru: 'HTML', en: 'HTML' },
      bytes: 83579,
      gzipBytes: 16397,
    },
    {
      id: 'css',
      label: { ru: 'CSS', en: 'CSS' },
      bytes: 59110,
      gzipBytes: 16110,
    },
  ] satisfies WeightSlice[],

  speed: {
    ttfbMs: 185,
    fullLoadMs: 323,
    budgets: { ttfbMs: 800, fullLoadMs: 3000 },
  },

  milestones: [
    {
      date: '2026-07-21',
      label: {
        ru: 'GPU Repaint Helper отправлен в Chrome Web Store',
        en: 'GPU Repaint Helper submitted to the Chrome Web Store',
      },
    },
    {
      date: '2026-07-24',
      label: {
        ru: 'Открыт репозиторий sonicxboy-portfolio (MIT)',
        en: 'sonicxboy-portfolio repository published (MIT)',
      },
    },
    {
      date: '2026-07-31',
      label: {
        ru: 'Последний push: портретный режим и чёрная дыра',
        en: 'Last push: portrait opening and black-hole flourish',
      },
    },
    {
      date: '2026-08-08',
      label: {
        ru: 'Аудит публикации: 11/11 проверок',
        en: 'Launch audit: 11/11 checks',
      },
    },
  ] satisfies Milestone[],

  channels: {
    github: {
      repo: 'vixkosla/sonicxboy-portfolio',
      createdAt: '2026-07-24',
      stars: 0,
      forks: 0,
      license: 'MIT',
    },
    chromeWebStore: {
      product: 'GPU Repaint Helper',
      published: true,
      users: 1,
      reviews: 0,
    },
    upwork: {
      reviews: 1,
      quote:
        'Askerov has great understanding of Three.JS 3D framework, and helped me get up and running with a prototype quickly.',
    },
  },

  pendingTokens: [
    {
      id: 'metrika',
      label: { ru: 'Яндекс.Метрика — визиты и источники', en: 'Yandex Metrika — visits and sources' },
    },
    {
      id: 'gsc',
      label: { ru: 'Google Search Console — запросы и показы', en: 'Google Search Console — queries and impressions' },
    },
  ],
} as const

export type SiteStats = typeof SITE_STATS
