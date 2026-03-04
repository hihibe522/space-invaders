# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check (vue-tsc) then build for production
npm run preview   # Preview production build locally
```

There is no test runner or linter configured in this project.

## Architecture

This is a single-page Vue 3 + TypeScript canvas game. All game logic lives in one composable; the Vue component is just a thin mount point.

### Data flow

```
App.vue
  └─ useSpaceInvaders(canvasRef)   ← composable called at setup level
       ├─ watchEffect({ flush: 'post' })  initialises ctx, starts RAF loop
       ├─ window keydown/keyup listeners  (cleaned up via onUnmounted)
       └─ returns readonly refs: gameState, score, hiScore, lives
```

### Key design decisions

- **Game state is NOT reactive** — `player`, `aliens`, `bullets`, `shields`, `ufo`, `explosions` are plain `let` variables mutated every frame. Only the four UI-relevant values (`gameState`, `score`, `hiScore`, `lives`) are `ref`.
- **Rendering is entirely canvas-based** — there are no reactive DOM updates during gameplay; Vue reactivity is only used for lifecycle management.
- **`watchEffect({ flush: 'post' })`** ensures the canvas element is in the DOM before `getContext('2d')` is called. The `onCleanup` callback cancels the RAF when the component unmounts.
- **One bullet at a time** — `canShoot` + `shootCooldown` gate player fire; alien fire is on a fixed `ALIEN_FIRE_INTERVAL` timer.
- **Alien speed** scales with survivors: `currentStepInterval = max(100, ALIEN_STEP_INTERVAL * (remaining/total))`.

### Game loop

`loop(time)` → `update(dt)` → `draw()` → `requestAnimationFrame(loop)`

Delta time is capped at 50 ms to prevent spiral-of-death on tab focus restore.
