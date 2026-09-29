#!/usr/bin/env node
// Build the public, text-selectable CVs from one bilingual source of truth.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'public', 'resume')
const chrome = process.env.CHROME_BIN ||
  '/home/vixkosla/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
const fontRegular = '/home/vixkosla/.local/share/fonts/Inter/Inter-Regular.otf'
const fontSemiBold = '/home/vixkosla/.local/share/fonts/Inter/Inter-SemiBold.otf'

for (const file of [chrome, fontRegular, fontSemiBold]) {
  if (!fs.existsSync(file)) throw new Error(`Missing PDF build dependency: ${file}`)
}

const content = {
  ru: {
    filename: 'Tamerlan-Askerov-CV-RU.pdf',
    name: 'Тамерлан Аскеров',
    role: 'Разработчик интерактивной 3D-графики · Three.js / WebGPU',
    location: 'Удалённо · московское время (GMT+3)',
    summaryTitle: 'Профиль',
    summary: 'Разрабатываю браузерные 3D-сцены и интерактивные продукты на стыке визуальной режиссуры и инженерии. С 2022 года веду клиентские и авторские проекты: Three.js/WebGL/WebGPU, React/TypeScript, процедурная графика, анимация и производительность. Довожу идеи до работающего продукта и проверяю результат в реальном браузере.',
    skillsTitle: 'Технологии',
    skills: [
      ['Графика', 'Three.js, React Three Fiber, WebGL, WebGPU/TSL, GLSL, шейдеры, анимация'],
      ['Веб', 'TypeScript, JavaScript, React, Astro, HTML/CSS, Vite, Rsbuild'],
      ['Интерактивные системы', 'PrismarineJS, Minecraft protocol, Valtio, профилирование, Git'],
    ],
    experienceTitle: 'Опыт работы',
    experience: [
      {
        title: 'Независимый WebGL / frontend-разработчик',
        org: 'Самозанятость · клиентские и авторские проекты',
        date: 'Март 2022 — н. в.',
        bullets: [
          'Создаю 3D-сцены и браузерные интерфейсы: архитектура, материалы, камера, взаимодействие и адаптация под разные экраны.',
          'В клиентском Minecraft-плеере занимался таймлайном, HUD, разбором реплеев и диагностикой производительности; в авторском WebGPU-проекте — процедурным миром и кинематографической подачей.',
        ],
      },
      {
        title: 'Frontend-разработчик',
        org: 'Devio',
        date: 'Апрель — июль 2021',
        bullets: ['Разрабатывал плагины для amoCRM на Vue 2.'],
      },
    ],
    projectsTitle: 'Избранные проекты',
    projects: [
      {
        title: 'Gamevisor / Minecraft Replay Engine',
        meta: '2026 · клиентский проект · Three.js, React, PrismarineJS',
        text: 'Браузерный плеер записанных Minecraft-сессий. Доработал асинхронный разбор пакетов и порционную обработку чанков, предзагрузку состояния и диагностику задержек; развивал интерактивный таймлайн, HUD и мобильный UI.',
      },
      {
        title: 'Black Moon — BLEACH-inspired WebGPU scene',
        meta: '2026 · авторский проект · в разработке',
        url: 'https://bleach-webgpu.vercel.app/',
        text: 'Процедурный парящий город и цитадель, кристаллы, облака и лунная материя. Построил многоэтапную сцену с управляемой камерой, шейдерами WebGPU/TSL и плеером ключевых кадров; проект остаётся в разработке.',
      },
      {
        title: 'SonicXBoy Portfolio',
        meta: '2026 · Astro, React Three Fiber, TypeScript',
        url: 'https://sonicxboy.dev/',
        text: 'Открытый сайт с фазовой WebGL-хореографией, процедурной графикой и направленной камерой; русская и английская версии, адаптивный интерфейс и управление анимацией на десктопе.',
      },
    ],
    educationTitle: 'Образование и языки',
    education: 'МГТУ им. Н. Э. Баумана, РК10 · 2015',
    languages: 'Русский — родной · Английский — B1',
    updated: 'Обновлено: 29 сентября 2026',
  },
  en: {
    filename: 'Tamerlan-Askerov-CV-EN.pdf',
    name: 'Tamerlan Askerov',
    role: 'Interactive 3D Developer · Three.js / WebGPU',
    location: 'Remote · Moscow time (GMT+3)',
    summaryTitle: 'Profile',
    summary: 'I build browser-based 3D scenes and interactive products where visual direction meets engineering. Since 2022, I have worked on client and independent projects using Three.js/WebGL/WebGPU, React/TypeScript, procedural graphics, animation and performance profiling. I take ideas through implementation and verify the result in a real browser.',
    skillsTitle: 'Technical skills',
    skills: [
      ['Graphics', 'Three.js, React Three Fiber, WebGL, WebGPU/TSL, GLSL, shaders, animation'],
      ['Web', 'TypeScript, JavaScript, React, Astro, HTML/CSS, Vite, Rsbuild'],
      ['Interactive systems', 'PrismarineJS, Minecraft protocol, Valtio, profiling, Git'],
    ],
    experienceTitle: 'Experience',
    experience: [
      {
        title: 'Independent WebGL / Frontend Developer',
        org: 'Self-employed · client and independent projects',
        date: 'Mar 2022 — present',
        bullets: [
          'Build browser 3D scenes and interfaces, covering architecture, materials, camera direction, interaction and responsive layouts.',
          'On a client Minecraft player, worked on the timeline, HUD, replay parsing and performance diagnostics; on an independent WebGPU project, built a procedural world and cinematic presentation.',
        ],
      },
      {
        title: 'Frontend Developer',
        org: 'Devio',
        date: 'Apr — Jul 2021',
        bullets: ['Developed Vue 2 plugins for amoCRM.'],
      },
    ],
    projectsTitle: 'Selected projects',
    projects: [
      {
        title: 'Gamevisor / Minecraft Replay Engine',
        meta: '2026 · client project · Three.js, React, PrismarineJS',
        text: 'Browser player for recorded Minecraft sessions. Improved asynchronous packet parsing, frame-budgeted chunk processing, state prefetch and latency diagnostics; developed the interactive timeline, HUD and mobile UI.',
      },
      {
        title: 'Black Moon — BLEACH-inspired WebGPU scene',
        meta: '2026 · independent project · in progress',
        url: 'https://bleach-webgpu.vercel.app/',
        text: 'Procedural floating city and citadel with crystals, clouds and lunar effects. Built a staged scene with directed camera choreography, WebGPU/TSL shaders and a keyframe player; the project remains in development.',
      },
      {
        title: 'SonicXBoy Portfolio',
        meta: '2026 · Astro, React Three Fiber, TypeScript',
        url: 'https://sonicxboy.dev/',
        text: 'Open-source site with phase-based WebGL choreography, procedural visuals and directed camera work; Russian and English pages, responsive UI and desktop animation controls.',
      },
    ],
    educationTitle: 'Education & languages',
    education: 'Bauman Moscow State Technical University, RK10 · 2015',
    languages: 'Russian — native · English — B1',
    updated: 'Updated: September 29, 2026',
  },
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])

const link = (url, label) =>
  `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`
const section = (heading, body) =>
  `<section><h2>${escapeHtml(heading)}</h2>${body}</section>`

function render(data, lang) {
  const contacts = [
    link('mailto:hello@sonicxboy.dev', 'hello@sonicxboy.dev'),
    link('https://sonicxboy.dev/', 'sonicxboy.dev'),
    link('https://github.com/vixkosla', 'github.com/vixkosla'),
    link('https://t.me/vixkosla', 't.me/vixkosla'),
  ]
  const skills = data.skills.map(([label, value]) =>
    `<p class="skill"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')
  const experience = data.experience.map((item) => `
    <div class="entry">
      <div class="entry-head"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.date)}</span></div>
      <div class="entry-sub">${escapeHtml(item.org)}</div>
      <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
    </div>`).join('')
  const projects = data.projects.map((item) => `
    <div class="project">
      <div class="project-head"><strong>${item.url ? link(item.url, item.title) : escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span></div>
      <p>${escapeHtml(item.text)}</p>
    </div>`).join('')

  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${escapeHtml(data.name)} — CV</title>
<style>
  @font-face { font-family: ResumeInter; src: url('file://${fontRegular}') format('opentype'); font-weight: 400; }
  @font-face { font-family: ResumeInter; src: url('file://${fontSemiBold}') format('opentype'); font-weight: 600; }
  @page { size: A4; margin: 14mm 16mm 13mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font: 9.15pt/1.36 ResumeInter, Arial, sans-serif; color: #192720; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1, h2, p { margin: 0; }
  a { color: #125b3e; text-decoration: none; }
  header { padding-bottom: 9mm; border-bottom: 1.25pt solid #168c5e; }
  h1 { font-size: 25pt; line-height: 1.06; letter-spacing: -0.025em; font-weight: 600; color: #10261c; }
  .role { margin-top: 2.5mm; font-size: 11pt; font-weight: 600; color: #166b49; }
  .location { margin-top: 4mm; color: #495b51; }
  .contacts { margin-top: 1.5mm; display: flex; flex-wrap: wrap; column-gap: 4mm; row-gap: 1mm; }
  .contacts a { white-space: nowrap; }
  section { margin-top: 6.2mm; break-inside: avoid; }
  h2 { padding-bottom: 1.7mm; margin-bottom: 2.6mm; border-bottom: 0.45pt solid #c4d7ca; color: #155f42; font-size: 9pt; font-weight: 600; letter-spacing: 0.075em; text-transform: uppercase; }
  .summary { max-width: 174mm; }
  .skill + .skill { margin-top: 1mm; }
  strong { font-weight: 600; }
  .entry + .entry { margin-top: 3.1mm; }
  .entry-head, .project-head { display: flex; align-items: baseline; justify-content: space-between; gap: 4mm; }
  .entry-head strong, .project-head strong { font-size: 9.25pt; }
  .entry-head span, .project-head span { flex: 0 0 auto; color: #57665d; font-size: 8.3pt; }
  .entry-sub { margin-top: 0.3mm; color: #58675e; }
  ul { margin: 1mm 0 0; padding-left: 4.2mm; }
  li { padding-left: 0.4mm; }
  li + li { margin-top: 0.65mm; }
  .project + .project { margin-top: 2.55mm; }
  .project p { margin-top: 0.45mm; }
  .education { display: flex; justify-content: space-between; gap: 5mm; }
  footer { margin-top: 5mm; padding-top: 2mm; border-top: 0.4pt solid #dbe4de; font-size: 7.5pt; color: #6a786e; }
</style></head>
<body>
  <header>
    <h1>${escapeHtml(data.name)}</h1>
    <p class="role">${escapeHtml(data.role)}</p>
    <p class="location">${escapeHtml(data.location)}</p>
    <p class="contacts">${contacts.join('')}</p>
  </header>
  ${section(data.summaryTitle, `<p class="summary">${escapeHtml(data.summary)}</p>`)}
  ${section(data.skillsTitle, skills)}
  ${section(data.experienceTitle, experience)}
  ${section(data.projectsTitle, projects)}
  ${section(data.educationTitle, `<p class="education"><span>${escapeHtml(data.education)}</span><span>${escapeHtml(data.languages)}</span></p>`)}
  <footer>${escapeHtml(data.updated)}</footer>
</body></html>`
}

fs.mkdirSync(output, { recursive: true })
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sonicxboy-resume-'))
for (const lang of ['ru', 'en']) {
  const data = content[lang]
  const html = path.join(temp, `resume-${lang}.html`)
  const pdf = path.join(output, data.filename)
  fs.writeFileSync(html, render(data, lang), 'utf8')
  const result = spawnSync(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file://${html}`,
  ], { encoding: 'utf8', timeout: 60000 })
  if (result.status !== 0 || !fs.existsSync(pdf)) {
    throw new Error(`Failed to build ${lang} PDF: ${result.stderr || result.error?.message}`)
  }
  console.log(`${lang}: ${pdf} (${fs.statSync(pdf).size} bytes)`)
}
console.log(`HTML preview source: ${temp}`)
