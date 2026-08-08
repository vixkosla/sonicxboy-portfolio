export const SITE = 'https://sonicxboy.dev'
export const SOURCE_REPOSITORY = 'https://github.com/vixkosla/sonicxboy-portfolio'

export type Lang = 'ru' | 'en'

export interface HeroCardCopy {
  h2: string
  p1: string
  p2: string
  p3: string
  cta: string
  ariaNav: string
  sourceLabel: string
}

export interface PageCopy {
  title: string
  description: string
  ogDescription: string
  jsonLdDescription: string
  eyebrow: string
  subtitle: string
  ariaLang: string
  card: HeroCardCopy
}

export interface StatsPageCopy {
  title: string
  description: string
  eyebrow: string
  subtitle: string
  ariaLang: string
  backLabel: string
  panels: {
    readiness: string
    checks: string
    weight: string
    speed: string
    milestones: string
    channels: string
    pending: string
    traffic: string
  }
  trafficByDay: string
  trafficSources: string
  trafficVisits: string
  trafficUsers: string
  trafficPageviews: string
  readinessNote: string
  checksPassed: string
  weightWireNote: string
  weightUnit: string
  speedBudget: string
  channelsIndexed: string
  channelsGithubAge: string
  channelsGithubStars: string
  channelsCwsUsers: string
  channelsUpworkReviews: string
  pendingNote: string
  footerSource: string
}

export const statsTranslations: Record<Lang, StatsPageCopy> = {
  ru: {
    title: 'Телеметрия публикации — SonicXBoy',
    description:
      'Снимок публикации sonicxboy.dev: готовность к индексации, вес и скорость первого экрана, каналы дистрибуции.',
    eyebrow: '// телеметрия публикации',
    subtitle:
      'Что поисковики и площадки уже знают о sonicxboy.dev — срез от {date}.',
    ariaLang: 'Язык страницы',
    backLabel: '← sonicxboy.dev',
    panels: {
      readiness: 'Готовность к публикации',
      checks: 'Чек-лист публикации',
      weight: 'Вес первого экрана',
      speed: 'Скорость ответа',
      milestones: 'Вехи запуска',
      channels: 'Каналы дистрибуции',
      pending: 'Ожидает токенов',
      traffic: 'Трафик — Яндекс.Метрика',
    },
    trafficByDay: 'Визиты по дням',
    trafficSources: 'Источники визитов',
    trafficVisits: 'визиты',
    trafficUsers: 'посетители',
    trafficPageviews: 'просмотры',
    readinessNote: 'пройдено {passed} из {total} проверок',
    checksPassed: 'пройдено',
    weightWireNote: '{size} {unit} по сети (gzip)',
    weightUnit: 'КБ',
    speedBudget: 'бюджет',
    channelsIndexed: 'страницы в индексе',
    channelsGithubAge: 'дней в open source',
    channelsGithubStars: 'звёзд на GitHub',
    channelsCwsUsers: 'пользователь Chrome-расширения',
    channelsUpworkReviews: 'отзыв на Upwork',
    pendingNote:
      'Метрика и Search Console уже подключены к сайту. Добавьте OAuth-токены в сборку — и диаграммы трафика оживут на следующем деплое.',
    footerSource: 'MIT · исходный код сайта',
  },
  en: {
    title: 'Launch Telemetry — SonicXBoy',
    description:
      'A snapshot of sonicxboy.dev going live: index readiness, first-screen weight and speed, distribution channels.',
    eyebrow: '// launch telemetry',
    subtitle:
      'What search engines and platforms already know about sonicxboy.dev — captured {date}.',
    ariaLang: 'Page language',
    backLabel: '← sonicxboy.dev',
    panels: {
      readiness: 'Launch readiness',
      checks: 'Publishing checklist',
      weight: 'First-screen weight',
      speed: 'Response speed',
      milestones: 'Launch milestones',
      channels: 'Distribution channels',
      pending: 'Awaiting tokens',
      traffic: 'Traffic — Yandex Metrika',
    },
    trafficByDay: 'Visits by day',
    trafficSources: 'Visit sources',
    trafficVisits: 'visits',
    trafficUsers: 'users',
    trafficPageviews: 'pageviews',
    readinessNote: '{passed} of {total} checks passed',
    checksPassed: 'passed',
    weightWireNote: '{size} {unit} over the wire (gzip)',
    weightUnit: 'KB',
    speedBudget: 'budget',
    channelsIndexed: 'pages indexed',
    channelsGithubAge: 'days in open source',
    channelsGithubStars: 'GitHub stars',
    channelsCwsUsers: 'Chrome extension user',
    channelsUpworkReviews: 'Upwork review',
    pendingNote:
      'Metrika and Search Console are already wired into the site. Add OAuth tokens to the build and the traffic charts light up on the next deploy.',
    footerSource: 'MIT · website source code',
  },
}

export const translations: Record<Lang, PageCopy> = {
  ru: {
    title: 'SonicXBoy — Three.js / WebGL разработчик и браузерные продукты',
    description:
      'SonicXBoy — Three.js и WebGL разработчик: интерактивная 3D-графика, React Three Fiber, GLSL-шейдеры, 3D-конфигураторы, Mapbox и Chrome-расширения.',
    ogDescription:
      'Three.js и WebGL-разработка: интерактивная 3D-графика, 3D-конфигураторы, Mapbox, GLSL и браузерные продукты.',
    jsonLdDescription:
      'Независимый разработчик интерактивных веб-продуктов: Three.js, WebGL, GLSL, WebGPU, Mapbox, браузерные движки и расширения. Соединяет хореографическое мышление, визуальное направление, инженерную производительность и работу с ИИ-агентами; отвечает за результат от идеи до продакшена.',
    eyebrow: '// интерактивные системы для веба',
    subtitle:
      'Соединяю движение, визуальный язык и инженерию — от WebGL-сцен до полезных браузерных продуктов.',
    ariaLang: 'Язык сайта',
    card: {
      h2: 'Движение, вкус и системы, которые работают',
      p1: 'По-настоящему в душе я [танцор]. Избавиться от этого невозможно, да и незачем. Поэтому [движение] для меня не украшение, а язык: [ритм], пауза, [вес], инерция и [точность]. Я не отделяю дизайн от инженерии; эта сцена — [хореография] из траекторий, физики, материалов и света.',
      p2: 'Упор держу на [производительность] (спасибо, СДВГ) и [эстетику] (спасибо, перфекционизм). Моя специализация — разработка на [Three.js] и [WebGL]: интерактивная [3D-графика], [React Three Fiber], [3D-конфигураторы], визуализации данных, [Mapbox]-карты, [GLSL-шейдеры] и оптимизация WebGL. Также создаю браузерные движки и [Chrome-расширения]; [GPU Repaint Helper] использует [Manifest V3] и рассчитан на весь Chromium.',
      p3: 'Веду работу целиком — от [идеи] и прототипа до [продакшена] и оптимизации. [ИИ-агенты] ускоряют производство, но постановка задачи, архитектура, визуальный выбор, проверка и ответственность остаются моими. Ценность для меня — [работающий продукт], а не количество вручную написанных строк. Особенно люблю [нестандартные задачи]; [Санкт-Петербург], работаю удалённо.',
      cta: 'Написать в Telegram',
      ariaNav: 'Соцсети и контакты',
      sourceLabel: 'Исходный код сайта на GitHub',
    },
  },
  en: {
    title: 'SonicXBoy — Three.js / WebGL Developer & Browser Products',
    description:
      'SonicXBoy is a Three.js and WebGL developer building interactive 3D graphics, React Three Fiber configurators, Mapbox maps, GLSL shaders and Chrome extensions.',
    ogDescription:
      'Three.js and WebGL development: interactive 3D graphics, product configurators, Mapbox, GLSL and browser products.',
    jsonLdDescription:
      'Independent interactive web product developer working with Three.js, WebGL, GLSL, WebGPU, Mapbox, browser engines and extensions. Combines choreographic thinking, visual direction, performance engineering and AI-agent workflows, owning the result from idea to production.',
    eyebrow: '// interactive systems for the web',
    subtitle:
      'I combine movement, visual direction and engineering — from WebGL scenes to useful browser products.',
    ariaLang: 'Site language',
    card: {
      h2: 'Movement, taste and systems that work',
      p1: 'At heart, I am a [dancer]. That never went away — and I do not want it to. [Movement] is not decoration to me but a language: [rhythm], pause, [weight], momentum and [precision]. I do not separate design from engineering; this scene is [choreography] made from trajectories, physics, materials and light.',
      p2: 'I care equally about [performance] (thanks, ADHD) and [aesthetics] (thanks, perfectionism). My specialty is [Three.js] and [WebGL] development: interactive [3D graphics], [React Three Fiber], [product configurators], data visualization, [Mapbox] maps, custom [GLSL shaders] and WebGL performance optimization. I also build browser engines and [Chrome extensions]; [GPU Repaint Helper] uses [Manifest V3] and targets Chromium as a platform.',
      p3: 'I lead the work from [idea] and prototype through [production] and optimization. [AI agents] accelerate execution, while framing, architecture, visual decisions, verification and accountability stay with me. I value a [working product] over a count of manually typed lines. [Unconventional work] is especially welcome; based in [Saint Petersburg], working remotely.',
      cta: 'Message me on Telegram',
      ariaNav: 'Social links and contacts',
      sourceLabel: 'Website source code on GitHub',
    },
  },
}
