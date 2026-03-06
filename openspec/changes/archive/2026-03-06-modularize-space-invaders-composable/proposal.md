## Why

`useSpaceInvaders.ts` 已成長至 ~1060 行，將型別定義、常數、音效、渲染、邏輯更新、輸入處理全部混在一個檔案裡，難以閱讀和維護。模組化能讓每個關注點有自己的邊界，未來新增功能或除錯時只需聚焦單一模組。

## What Changes

- 從 `useSpaceInvaders.ts` 拆出 **5 個獨立模組**：
  - `types.ts` — 所有 TypeScript 介面與型別
  - `constants.ts` — 所有遊戲常數
  - `useAudio.ts` — Web Audio API 封裝（shoot、explosion、UFO hum、level clear、game over）
  - `renderer.ts` — 所有 canvas 繪製函式（drawPlayer、drawAlien、drawUFO、drawHUD 等）
  - `entities.ts` — 實體工廠函式（makeAliens、makeShields）與純邏輯 helpers（collide、stepAliens、fireAlien）
- `useSpaceInvaders.ts` 保留為主要 orchestrator，管理 reactive state、game loop、input，並組合上述模組

## Capabilities

### New Capabilities

- `game-modules`: 將遊戲邏輯拆分為型別、常數、音效、渲染、實體等獨立模組，各模組有明確的輸入/輸出界面

### Modified Capabilities

<!-- 無 spec-level 行為變更，純重構 -->

## Impact

- `src/composables/useSpaceInvaders.ts` — 大幅縮減，改為 import 各模組
- 新增 `src/composables/game/types.ts`
- 新增 `src/composables/game/constants.ts`
- 新增 `src/composables/game/useAudio.ts`
- 新增 `src/composables/game/renderer.ts`
- 新增 `src/composables/game/entities.ts`
- `App.vue` 不受影響（API 不變）
- 無外部依賴變更
