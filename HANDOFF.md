# Handoff — Portfolio Webpage

## Project

`/home/vixkosla/projects/library/portfolio/webpage`
Astro + React Three Fiber портфолио-сайт (Three.js / WebGL разработчик).

## Stack

- **Astro 7.0.7** + React integration
- **React 19** + @react-three/fiber 9.6.1 + @react-three/drei 10.7.7
- **three 0.185.1**, **@react-spring/three 10.1.2**
- **TypeScript strict**
- Package manager: **pnpm**

## Файловая структура

```
src/
  components/HeroScene.tsx       # R3F Canvas + AssemblyCube — useFrame драйвер
  pages/index.astro              # страница shell: head/styles/text overlay
  lib/LayeredAssembly.ts         # фаза 1: прилёт кубиков по quintic bezier
  lib/SpinSimulation.ts          # фаза 3: spinning-top симуляция
  lib/trajectoryData.ts          # предвычисленные траектории + spacetime профили
public/                          # favicon
docs/animation-choreography.md   # (предположительно) хореография анимации
HANDOFF.md                       # этот файл
AGENTS.md                        # контекст для агентов
```

## Конфигурация

`astro.config.mjs` — React integration подключена.
Dev-сервер: `http://localhost:4321` (запуск: `pnpm dev` или `astro dev --background`).

## Hero-анимация — что уже сделано

Rubik's-cube-подобная 3×3×3 сборка (центральный куб + 26 кубиков). Одноразовая хореография, после которой кубики оседают в сферическую voxel-оболочку.

### Фазы (все в `useFrame`)

**1. Assemble (`LayeredAssembly`)**
- 26 кубиков влетают издалека по заранее предвычисленным кривым пятой степени Безье (quintic Bezier)
- Каждая кривая гладкая, коллизия избегается на уровне предвычисления (не runtime)
- Velocity profile: cruise waves + launch impulse + brake
- Позиция вычисляется по времени с помощью path LUT и arc-length sampling
- `assembly.complete` — когда все кубики на месте

Параметры: `CUBE_SIZE = 0.5`, `CUBE_GAP = 0.014`, `CUBE_STEP = 0.514`, `CUBELET_COUNT = 26`
PATH_STEPS = 480, TIME_STEPS = 320

**2. Roll & Lift**
- Готовый куб перекатывается через ребро (EDGE_ROLL_DURATION = 0.72s)
- Затем поднимается на угол в diamond-ориентацию (CORNER_LIFT_DURATION = 0.84s)
- Позиция + quaternion интерполируются

**3. Spin (`SpinSimulation`)**
- Physics-based spinning-top симуляция:
  - DRIVE_TORQUE = 42, DRIVE_DURATION = 0.58s
  - LINEAR_DRAG = 0.18, QUADRATIC_DRAG = 0.008, COULOMB_DRAG = 0.32
  - FINAL_BRAKE: start 10.25s, duration 1.05s, torque 11
  - Fixed-step интегратор (clamped to 1/240, max 1/20)
- Сверху накладывается precession + nutation wobble для эффекта spinning top
- Main spiral: topEnvelope (smoothstep), precessionAngle = time * 0.62, nutation 0.105 с ripple

**4. Orbital disassembly** — 26 shell кубиков распадаются на 4 symmetry lane:
- Группа 0: 8 угловых — normal (0.18, 0.94, 0.29), radius 3.7, speed π*0.38
- Группа 1: 6 edge — normal (-0.62, 0.48, 0.62), radius 2.85, speed -π*0.27
- Группа 2: 6 edge — same normal, radius 2.1, speed π*0.25
- Группа 3: 6 face centers — normal (0.71, 0.25, -0.66), radius 1.4, speed π*0.43

**5. Spiral capture** — orbit convergence в spherical shell radius 1.22
- ORBIT_CAPTURE_START = 7.15, CAPTURE_DURATION = 3.75
- Orientation curves (cubic bezier style) с плавным slerp к identity
- Константы: `SHELL_RADIUS = 1.22`, `ORBIT_DEPART_DURATION = 2.05`

### Рендеринг

- `InstancedMesh` для 26 кубиков (один draw call) + второй для orbiters + отдельный `<mesh>` для центра
- Матрицы перезаписываются каждый кадр через `setMatrixAt` + `instanceMatrix.needsUpdate`
- Emerald `#18d383` meshStandardMaterial (metalness 0.24, roughness 0.28)
- Тёмный фон `#050907` + fog
- Освещение: ambient + hemisphere + directional + 2 point lights, shadows on
- `OrbitControls` с отключённым pan/zoom (декоративный drag)
- Responsive: compact < 720px shrinks sceneScale (1.3 → 0.82)

### Импорты и зависимости

```typescript
import { CUBE_SIZE, CUBE_STEP, CUBELET_COUNT, LayeredAssembly } from '../lib/LayeredAssembly'
import { CORNER_LIFT_DURATION, EDGE_ROLL_DURATION, MAIN_SPIN_START, SpinSimulation } from '../lib/SpinSimulation'
```

### Ключевые константы в HeroScene.tsx

- `EMERALD = new Color('#18d383')`
- `ROLL_AXIS = (0,0,1)`, `PRECESSION_AXIS = (1,0,0)`
- `INITIAL_X = 1.2`, `SHELL_RADIUS = 1.22`
- sceneScale: 1.3 (desktop) / 0.82 (compact)
- `ROLL_ORIENTATION` = -90° вокруг Z
- `DIAMOND_ORIENTATION` = поворот из CORNER(-1,1,1) в UP + -30° вокруг UP

### Траекторные данные (`trajectoryData.ts`)

- `TRAJECTORY_DATA` — 26 записей по 21 числу: target, start, 4 control points quintic bezier
- `SPACETIME_DATA` — 26 записей по 8 чисел: delay, duration, brakeStart, 2 velocity waves (amplitude + phase), launch impulse
- Предвычислены внешним планировщиком — не редактировать вручную

### Вспомогательные функции

- `smoothstep(x)` — x²(3−2x)
- `smootherstep(x)` — x³(x(6x−15)+10)
- `setFreeOrbitOrientation` — свободное tumbling orientation (Euler-based)
- `setOrbitOrientationCurve` — cubic bezier slerp ориентации

## Стилевые предпочтения пользователя

- **Анимации**: медленные, плавные, без отскока — easeOutQuart с duration, не spring
- **MVP-first**: сначала визуал, линтеры/тесты потом
- **Язык**: русский
- **Работа**: Three.js / React Three Fiber / WebGL разработчик

## Планы (из предыдущих обсуждений, до рефакторинга)

- Структура сайта: home + /work/ + /blog/ + llms.txt + JSON-LD
- Blog по Three.js/R3F/WebGL темам для SEO-трафика
- MCP сервер для AI discoverability
- Эффекты: UnrealBloomPass, частицы, шейдеры

## Настройки Codex (из `config.toml`)

- Модель: `gpt-5.6-sol`
- Reasoning effort: `xhigh`
- Approvals: `user`
- MCP сервер: `hermes-tools` (Python)
- Плагины: figma, openai-templates
- Проекты trusted: `/home/vixkosla`, `replay-engine`
