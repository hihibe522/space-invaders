## 1. 建立模組骨架

- [x] 1.1 建立 `src/composables/game/` 目錄
- [x] 1.2 建立 `src/composables/game/types.ts`，移入所有 TypeScript 介面（Rect、Bullet、Alien、Shield、UFO、PowerUp、Explosion）和 `GameState` 型別
- [x] 1.3 建立 `src/composables/game/constants.ts`，移入所有遊戲常數（W、H、PLAYER_*、ALIEN_*、UFO_*、SHIELD_*、BULLET_*、POWER_UP_*、MAX_LIVES 等）

## 2. 實體與邏輯模組

- [x] 2.1 建立 `src/composables/game/entities.ts`，移入 `collide`、`makeShields`、`makeAliens` 純函式
- [x] 2.2 移入 `stepAliens`、`speedUpAliens`、`fireAlien` 至 entities.ts（調整為接受 aliens、alienDir、currentStepInterval 等參數，回傳需要的結果）
- [x] 2.3 在 `useSpaceInvaders.ts` 中 import entities.ts，確認 `npm run build` 通過

## 3. 音效模組

- [x] 3.1 建立 `src/composables/game/useAudio.ts`，移入 AudioContext 初始化及 `initAudio`、`playShoot`、`playExplosion`、`startUFOHum`、`stopUFOHum`、`playLevelClear`、`playGameOver` 函式
- [x] 3.2 `useAudio` 接受 `isMuted: Ref<boolean>` 參數，回傳 audio 控制函式物件
- [x] 3.3 在 `useSpaceInvaders.ts` 中替換為 `const audio = useAudio(isMuted)` 並解構使用，確認 `npm run build` 通過

## 4. 渲染模組

- [x] 4.1 建立 `src/composables/game/renderer.ts`，移入所有 draw 函式：`drawHUD`、`drawPowerUpIndicators`、`drawMiniPlayer`、`drawPlayer`、`drawAlien`、`drawUFO`、`drawTitleScreen`、`drawOverlay`
- [x] 4.2 所有 draw 函式改為接受 `ctx: CanvasRenderingContext2D` 作為第一個參數；需要的 game state 以參數群組傳入（避免超過 5 個獨立參數時改用物件）
- [x] 4.3 建立主 `draw` 函式於 renderer.ts，接受 ctx 和所有 game objects，替換 `useSpaceInvaders.ts` 中的 `draw()` 呼叫
- [x] 4.4 在 `useSpaceInvaders.ts` 中 import renderer.ts，確認 `npm run build` 通過

## 5. 驗證與收尾

- [x] 5.1 執行 `npm run build`，確認零 TypeScript 錯誤
- [x] 5.2 確認 `App.vue` 無需修改，public API（gameState、score、hiScore、lives、wave、isMuted、toggleMute）不變
- [x] 5.3 在瀏覽器中手動測試：遊戲開始、移動、射擊、UFO、power-up、wave 進階、game over 流程均正常
- [x] 5.4 確認音效正常（shoot、explosion、UFO hum、level clear、game over、mute toggle）
