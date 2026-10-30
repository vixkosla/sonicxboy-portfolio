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
]

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
