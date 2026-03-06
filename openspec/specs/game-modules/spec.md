# game-modules

Modular architecture for the Space Invaders game composable.

## Requirements

### Requirement: Types and constants are isolated in dedicated modules
The codebase SHALL have a `src/composables/game/types.ts` file containing all TypeScript interfaces and types, and a `src/composables/game/constants.ts` file containing all game constants. No game logic or side effects SHALL exist in these files.

#### Scenario: Types module contains all interfaces
- **WHEN** a developer opens `src/composables/game/types.ts`
- **THEN** it contains all interfaces (`Rect`, `Bullet`, `Alien`, `Shield`, `UFO`, `PowerUp`, `Explosion`) and the `GameState` type, with no imports from Vue or Web APIs

#### Scenario: Constants module contains all numeric/string constants
- **WHEN** a developer opens `src/composables/game/constants.ts`
- **THEN** it contains all game constants (W, H, PLAYER_SPEED, ALIEN_COLS, UFO_INTERVAL, etc.) and no mutable state or functions

### Requirement: Audio logic is encapsulated in useAudio composable
The system SHALL provide a `src/composables/game/useAudio.ts` composable that accepts `isMuted: Ref<boolean>` and returns audio control functions. The Web AudioContext SHALL be created lazily on first user interaction.

#### Scenario: Audio composable returns expected API
- **WHEN** `useAudio(isMuted)` is called
- **THEN** it returns an object with `{ initAudio, playShoot, playExplosion, startUFOHum, stopUFOHum, playLevelClear, playGameOver, toggleMute }`

#### Scenario: Sounds are silent when muted
- **WHEN** `isMuted.value` is `true` and any play function is called
- **THEN** no audio oscillators are created or started

### Requirement: Rendering logic is isolated in a pure renderer module
The system SHALL provide a `src/composables/game/renderer.ts` module exporting pure functions that accept `CanvasRenderingContext2D` as their first argument. Renderer functions SHALL NOT import from Vue or hold module-level mutable state.

#### Scenario: Renderer functions are pure with ctx as first argument
- **WHEN** a renderer function such as `drawAlien` is called with a valid `ctx` and alien data
- **THEN** it draws to the provided canvas context and returns void, with no side effects outside the canvas

#### Scenario: draw function renders full frame
- **WHEN** `draw(ctx, gameObjects, gameState, ...)` is called
- **THEN** it clears the canvas background and renders all visible entities (aliens, player, bullets, shields, UFO, power-ups, HUD, overlays) in the correct draw order

### Requirement: Entity factory and logic functions are in entities module
The system SHALL provide a `src/composables/game/entities.ts` module containing `makeAliens`, `makeShields`, `collide`, `stepAliens`, `fireAlien`, and `speedUpAliens` as pure functions. These functions SHALL NOT access Vue reactivity or Web APIs.

#### Scenario: makeAliens generates correct alien grid
- **WHEN** `makeAliens(rows)` is called with `rows = 5`
- **THEN** it returns an array of `5 × 11 = 55` aliens with correct `type`, `alive: true`, and `animFrame: 0`

#### Scenario: collide returns true for overlapping rects
- **WHEN** `collide(a, b)` is called where rects `a` and `b` overlap
- **THEN** it returns `true`

#### Scenario: collide returns false for non-overlapping rects
- **WHEN** `collide(a, b)` is called where rects `a` and `b` do not overlap
- **THEN** it returns `false`

### Requirement: Main composable is reduced to orchestration only
`src/composables/useSpaceInvaders.ts` SHALL import from all game sub-modules and be responsible only for: Vue lifecycle management (watchEffect, onUnmounted), reactive state (gameState, score, hiScore, lives, wave, isMuted), the game loop (RAF), and input handling. It SHALL NOT contain any draw functions or Web Audio API calls directly.

#### Scenario: Public API is unchanged
- **WHEN** `useSpaceInvaders(canvasRef)` is called from `App.vue`
- **THEN** it returns `{ gameState, score, hiScore, lives, wave, isMuted, toggleMute }` — identical to before the refactor

#### Scenario: Build succeeds after refactor
- **WHEN** `npm run build` is executed after the refactor
- **THEN** it completes without TypeScript errors or missing import errors
