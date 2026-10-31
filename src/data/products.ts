// The /products/ section is a small README tree. Every entry is a real
// SSR page with its own URL; the shell renders this list as a file tree
// that persists across client-side navigation.
export interface ProductDoc {
  href: string
  file: string
  label: string
  depth: 0 | 1 | 2
  folder?: boolean
}

export const PRODUCT_TREE: ProductDoc[] = [
  { href: '/products/', file: 'README.md', label: 'Продукты', depth: 1 },
  {
    href: '/products/telegram-mcp/',
    file: 'telegram-mcp/',
    label: 'Telegram MCP',
    depth: 1,
    folder: true,
  },
  {
    href: '/products/telegram-mcp/',
    file: 'README.md',
    label: 'Обзор',
    depth: 2,
  },
  {
    href: '/products/telegram-mcp/install/',
    file: 'install.md',
    label: 'Установка',
    depth: 2,
  },
  {
    href: '/products/telegram-mcp/tools/',
    file: 'tools.md',
    label: 'Инструменты',
    depth: 2,
  },
  {
    href: '/products/telegram-mcp/security/',
    file: 'security.md',
    label: 'Безопасность',
    depth: 2,
  },
  {
    href: '/products/viewport-lab/',
    file: 'viewport-lab/',
    label: 'Viewport Lab',
    depth: 1,
    folder: true,
  },
  {
    href: '/products/viewport-lab/',
    file: 'README.md',
    label: 'Обзор',
    depth: 2,
  },
  {
    href: '/products/rzd/',
    file: 'rzd/',
    label: 'Билеты РЖД',
    depth: 1,
    folder: true,
  },
  {
    href: '/products/rzd/',
    file: 'README.md',
    label: 'Обзор',
    depth: 2,
  },
  {
    href: '/products/rzd/install/',
    file: 'install.md',
    label: 'Установка',
    depth: 2,
  },
]

// One record per product: the index entries and each product header read
// their facts and actions from here, so a version bump is a one-line change.
export interface ProductFact {
  label: string
  value: string
}

export interface ProductAction {
  href: string
  label: string
}

export interface Product {
  slug: string
  name: string
  href: string
  summary: string
  facts: ProductFact[]
  install: ProductAction
  source: ProductAction
}

export const PRODUCTS: Product[] = [
  {
    slug: 'telegram-mcp',
    name: 'Telegram MCP',
    href: '/products/telegram-mcp/',
    summary:
      'Личный Telegram для ИИ-агента: найти чат, прочитать и поискать переписку. Сообщение уходит только по прямой просьбе и с подтверждением.',
    facts: [
      { label: 'Версия', value: '1.0' },
      { label: 'Клиенты', value: 'Claude Code, Codex и другие MCP' },
      { label: 'Нужно', value: 'Node.js 22 и аккаунт Telegram' },
      { label: 'Лицензия', value: 'MIT' },
    ],
    install: { href: '/products/telegram-mcp/install/', label: 'Установка' },
    source: { href: 'https://github.com/vixkosla/telegram-mcp', label: 'Исходный код' },
  },
  {
    slug: 'viewport-lab',
    name: 'Viewport Lab',
    href: '/products/viewport-lab/',
    summary:
      'Расширение для Chrome: текущая страница в точных размерах телефона, планшета и малого ПК, по одному экрану или шесть рядом.',
    facts: [
      { label: 'Версия', value: '1.1, в магазине пока 1.0' },
      { label: 'Браузеры', value: 'Chrome, Chromium, Brave, Vivaldi' },
      { label: 'Доступ', value: 'Только activeTab' },
      { label: 'Лицензия', value: 'MIT' },
    ],
    install: {
      href: 'https://chromewebstore.google.com/detail/gpoopdgejgpendnncdlaohpdmciolkip',
      label: 'Установить в Chrome',
    },
    source: {
      href: 'https://github.com/vixkosla/browser-extensions/tree/main/viewport-lab',
      label: 'Исходный код',
    },
  },
  {
    slug: 'rzd',
    name: 'Билеты РЖД',
    href: '/products/rzd/',
    summary:
      'Скилл для агента: найти поезд и довести свой заказ на сайте РЖД до QR СБП. Оплату подтверждаю я, повторный билет и возврат сами не начинаются.',
    facts: [
      { label: 'Версия', value: '1.0' },
      { label: 'Агенты', value: 'Codex, Claude Code, Grok' },
      { label: 'Оплата', value: 'Вручную, по QR СБП' },
      { label: 'Лицензия', value: 'MIT' },
    ],
    install: { href: '/products/rzd/install/', label: 'Установка' },
    source: { href: 'https://github.com/vixkosla/rzd-tickets', label: 'Исходный код' },
  },
]

export const productBySlug = (slug: string): Product => {
  const product = PRODUCTS.find((entry) => entry.slug === slug)
  if (!product) throw new Error(`Unknown product: ${slug}`)
  return product
}

// Breadcrumb trail used for the path bar and BreadcrumbList JSON-LD.
export interface Crumb {
  name: string
  href: string
}

export const PRODUCTS_CRUMB: Crumb = { name: 'Продукты', href: '/products/' }
export const TELEGRAM_MCP_CRUMB: Crumb = {
  name: 'Telegram MCP',
  href: '/products/telegram-mcp/',
}
export const VIEWPORT_LAB_CRUMB: Crumb = {
  name: 'Viewport Lab',
  href: '/products/viewport-lab/',
}
export const RZD_CRUMB: Crumb = {
  name: 'Билеты РЖД',
  href: '/products/rzd/',
}
