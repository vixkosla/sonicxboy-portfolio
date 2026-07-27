import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSceneViewport } from '../src/lib/viewportMode.ts'

test('desktop landscape above the compact height limit keeps one desktop camera owner', () => {
  assert.deepEqual(resolveSceneViewport(1180, 816), {
    compact: false,
    portraitCompact: false,
    desktopCamera: true,
  })
  assert.deepEqual(resolveSceneViewport(1179, 801), {
    compact: false,
    portraitCompact: false,
    desktopCamera: true,
  })
})

test('short landscape and portrait mobile retain their compact modes', () => {
  assert.deepEqual(resolveSceneViewport(1180, 800), {
    compact: true,
    portraitCompact: false,
    desktopCamera: false,
  })
  assert.deepEqual(resolveSceneViewport(390, 844), {
    compact: true,
    portraitCompact: true,
    desktopCamera: false,
  })
})
