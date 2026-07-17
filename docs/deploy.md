# Деплой и инфраструктура

Обновлено: 2026-07-17

## Продакшен

- **URL:** https://sonicxboy.vercel.app
- **Платформа:** Vercel (статический Astro-билд, адаптер не нужен)
- **Проект:** `sonicxboy` в аккаунте `askerovtamerlan` (team `askerovtamerlans-projects`)
- Локальная привязка — каталог `.vercel/` (в .gitignore)

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

- [ ] `astro.config.mjs`: `site: 'https://<домен>'`
- [ ] `@astrojs/sitemap` + строка `Sitemap:` в `public/robots.txt`
- [ ] `<link rel="canonical">`, `og:url`
- [ ] og:image (собрать из эмблемы BrandMark, 1200×630)
- [ ] Яндекс.Вебмастер + Метрика, Google Search Console (подтвердить, скормить sitemap)
- [ ] Обновить ссылки в `public/llms.txt` (если появятся абсолютные на себя)
- [ ] Ссылка на домен во все профили: Kwork, Upwork, X bio, Telegram-канал,
      GitHub-профиль, YouDo, FL.ru, посты HN
- [ ] Обновить URL в закрепе Telegram-канала и X-треде о запуске
