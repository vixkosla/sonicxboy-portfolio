export const SITE = 'https://sonicxboy.dev'

export type Lang = 'ru' | 'en'

export interface HeroCardCopy {
  h2: string
  p1: string
  p2: string
  p3: string
  cta: string
  ariaNav: string
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

export const translations: Record<Lang, PageCopy> = {
  ru: {
    title: 'SonicXBoy — WebGL Developer · Three.js, React Three Fiber',
    description:
      'SonicXBoy — разработчик интерактивной 3D-графики для веба: Three.js, WebGL, GLSL, React Three Fiber, картография Mapbox. Конфигураторы, визуализации данных, кастомные шейдеры и браузерные движки — 60–120 FPS, производительно и красиво.',
    ogDescription:
      'Интерактивная 3D-графика для веба: Three.js, WebGL, GLSL, React Three Fiber.',
    jsonLdDescription:
      'Разработчик интерактивной 3D-графики для веба: Three.js, WebGL, GLSL, React Three Fiber, картография Mapbox. Конфигураторы, визуализации данных, шейдеры и браузерные движки — производительно и красиво.',
    eyebrow: '// интерактивная 3D-графика для веба',
    subtitle:
      'Анимации, конфигураторы и визуализации на Three.js — прямо в браузере.',
    ariaLang: 'Язык сайта',
    card: {
      h2: 'Интерактивная 3D-графика для веба',
      p1: 'Я люблю дизайн и стиль: придумывать работающие системы и делать их красивыми. Вкус у меня есть, и я не стесняюсь его применять — сцена на этой странице спроектирована с нуля: математика траекторий, физика волчка, шейдеры плазмы.',
      p2: 'Упор держу на производительность (спасибо, СДВГ) и эстетику (спасибо, перфекционизм): кастомные GLSL-шейдеры, постобработка, стабильные 60–120 FPS на десктопе и мобильных. Делаю конфигураторы, иммерсивные лендинги, картографию на Mapbox, визуализации данных и браузерные движки — вплоть до Minecraft-реплеера.',
      p3: 'Веду проект целиком и отвечаю за результат: концепция → прототип → продакшен. Инструменты подбираю по задаче — включая ИИ-инструменты; смотрю в сторону WebGPU. Чем страннее задача, тем интереснее — неформат приветствуется. Санкт-Петербург, работаю удалённо.',
      cta: 'Написать в Telegram',
      ariaNav: 'Соцсети и контакты',
    },
  },
  en: {
    title: 'SonicXBoy — WebGL Developer · Three.js, React Three Fiber',
    description:
      'SonicXBoy — interactive 3D graphics developer for the web: Three.js, WebGL, GLSL, React Three Fiber, Mapbox cartography. Configurators, data visualizations, custom shaders and browser engines — 60–120 FPS, fast and beautiful.',
    ogDescription:
      'Interactive 3D graphics for the web: Three.js, WebGL, GLSL, React Three Fiber.',
    jsonLdDescription:
      'Interactive 3D graphics developer for the web: Three.js, WebGL, GLSL, React Three Fiber, Mapbox cartography. Configurators, data visualizations, shaders and browser engines — fast and beautiful.',
    eyebrow: '// interactive 3D graphics for the web',
    subtitle:
      'Animations, configurators and visualizations in Three.js — right in the browser.',
    ariaLang: 'Site language',
    card: {
      h2: 'Interactive 3D graphics for the web',
      p1: "I love design and style: inventing working systems and making them beautiful. I do have taste and I'm not shy about using it — the scene on this page was designed from scratch: trajectory math, spinning-top physics, plasma shaders.",
      p2: "I'm obsessed with performance (thanks, ADHD) and aesthetics (thanks, perfectionism): custom GLSL shaders, post-processing, a steady 60–120 FPS on desktop and mobile. I build configurators, immersive landing pages, Mapbox cartography, data visualizations and browser engines — up to a Minecraft replay engine.",
      p3: 'I run projects end to end and own the result: concept → prototype → production. I pick tools to fit the task — AI tooling included — and keep an eye on WebGPU. The stranger the task, the more fun it is: unconventional projects welcome. Saint Petersburg, working remotely.',
      cta: 'Message me on Telegram',
      ariaNav: 'Social links and contacts',
    },
  },
}
