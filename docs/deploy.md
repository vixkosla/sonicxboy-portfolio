# Деплой и инфраструктура

Обновлено: 2026-07-19

## Продакшен

- **Домен:** https://sonicxboy.dev — куплен 2026-07-18 на Sav.com
  (истекает 2027-07-18, автопродление включено, transfer-lock до 2026-09-18,
  WHOIS-privacy включён). Привязан к Vercel-проекту вместе с
  `www.sonicxboy.dev`; для активации у регистратора должны стоять
  nameservers `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.
- **Резервный URL:** https://sonicxboy.vercel.app (работает всегда)
- **Платформа:** Vercel (статический Astro-билд, адаптер не нужен)
- **Проект:** `sonicxboy` в аккаунте `askerovtamerlan` (team `askerovtamerlans-projects`)
- Локальная привязка — каталог `.vercel/` (в .gitignore)
- Канонический адрес зашит константой `SITE` в `src/i18n.ts`
  (canonical/hreflang/og:url/JSON-LD) и `site` в `astro.config.mjs` (sitemap)

## Команды

```bash
pnpm build                 # локальная проверка сборки
vercel deploy --prod --yes # деплой прода из корня проекта
vercel inspect <url> --logs
vercel whoami              # проверить логин CLI
```

Git-репозиторий пока локальный (remote на GitHub не создан). Деплой идёт
загрузкой локальных файлов через CLI, поэтому перед деплоем убедиться, что
рабочее дерево чистое и `pnpm build` проходит.

## Подключение домена (когда будет куплен)

1. Vercel: `vercel domains add <домен>` или через дашборд проекта → Domains.
2. У регистратора прописать DNS из подсказки Vercel
   (обычно A `76.76.21.21` для apex + CNAME `cname.vercel-dns.com` для www).
3. SSL Vercel выпускает сам.

Проверка доступности имён (RDAP, 2026-07-17): **sonicxboy.com, sonicxboy.dev,
sonicxboy.io — свободны**. Юзернейм **@sonicxboy в Telegram — свободен**.

## Чеклист после подключения домена

- [x] `astro.config.mjs`: `site: 'https://sonicxboy.dev'` (2026-07-19)
- [x] `@astrojs/sitemap` + строка `Sitemap:` в `public/robots.txt` (2026-07-19)
- [x] `<link rel="canonical">`, `og:url` — через SITE в `src/i18n.ts` (2026-07-19)
- [x] Обновлены ссылки в `public/llms.txt` на sonicxboy.dev (2026-07-19)
- [x] Прод задеплоен с новым каноническим адресом, alias
      `sonicxboy.dev` назначен на деплой, SSL выпустится автоматически
      после смены NS (2026-07-19)
- [ ] Пользователь: сменить nameservers у Sav на `ns1.vercel-dns.com` /
      `ns2.vercel-dns.com` (поля Name Servers → Update)
- [ ] После пропагации: проверить https://sonicxboy.dev и SSL
- [x] og:image (`public/og.png`, 1200×630, собран из эмблемы BrandMark;
      источник и инструкция регенерации — `docs/og-image.html`) + og:image/
      twitter:card мета в `HomePage.astro` (2026-07-19)
- [ ] Яндекс.Вебмастер + Метрика, Google Search Console (подтвердить, скормить sitemap)
- [ ] Ссылка на домен во все профили: Kwork, Upwork, X bio, Telegram-канал,
      GitHub-профиль, YouDo, FL.ru, посты HN
- [ ] Обновить URL в закрепе Telegram-канала и X-треде о запуске
