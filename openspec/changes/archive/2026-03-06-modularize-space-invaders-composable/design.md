## Context

`src/composables/useSpaceInvaders.ts` 目前是一個單一 1060 行的大型函式，包含：型別定義、遊戲常數、Web Audio 音效、canvas 繪製、遊戲邏輯更新、碰撞偵測、實體工廠。所有狀態透過閉包共享，無模組邊界。

**現有架構約束**（來自 CLAUDE.md）：
- 遊戲狀態（player、aliens、bullets 等）是 plain `let` 變數，非 reactive — 必須維持此設計
- 只有四個 UI ref（gameState、score、hiScore、lives）透過 Vue reactivity 管理
- canvas 渲染完全不使用 Vue reactivity
- `watchEffect({ flush: 'post' })` 管理 RAF lifecycle — 必須保留在主 composable

## Goals / Non-Goals

**Goals:**
- 降低每個檔案的認知負擔（目標每個模組 < 200 行）
- 建立清晰的模組邊界和依賴方向
- 不改變任何遊戲行為或對外 API
- `App.vue` 的 import 路徑不變

**Non-Goals:**
- 不引入 reactive store（Pinia 等）
- 不轉換為 class-based 設計
- 不改變 canvas 渲染策略
- 不新增遊戲功能

## Decisions

### 決策 1：模組結構放在 `src/composables/game/` 子目錄

**選擇**：建立 `src/composables/game/` 子目錄，主 composable 維持在 `src/composables/useSpaceInvaders.ts`

**理由**：App.vue import 路徑不需異動；子目錄清楚標示這些是 game-specific 模組，不是通用 composable。

**備選**：直接放在 `src/composables/` 根目錄 — 會造成大量 game-specific 檔案污染 composables 目錄。

---

### 決策 2：`renderer.ts` 接收 `ctx` 作為參數，而非全域共享

**選擇**：所有 draw 函式改為 `drawXxx(ctx: CanvasRenderingContext2D, ...)` 純函式

**理由**：繪製函式本身是無副作用的 pure functions（除了寫入 ctx），以參數傳遞讓依賴明確，也便於未來測試。

**備選**：在 renderer 模組建立 module-level `ctx` 變數，透過 `initRenderer(ctx)` 初始化 — 引入隱式全域狀態，較難追蹤。

---

### 決策 3：`useAudio.ts` 封裝為 composable，回傳函式物件

**選擇**：`useAudio(isMuted: Ref<boolean>)` 回傳 `{ playShoot, playExplosion, startUFOHum, stopUFOHum, playLevelClear, playGameOver }`

**理由**：isMuted 是 reactive ref，音效模組需要讀取它；以 composable 形式封裝，讓主 composable 可以直接解構使用，語意清晰。

**備選**：純函式並傳遞 `isMuted` 至每個 play 函式 — 每次呼叫都需傳遞，增加呼叫端的負擔。

---

### 決策 4：`entities.ts` 只包含純函式，不持有狀態

**選擇**：`makeAliens`、`makeShields`、`collide`、`stepAliens`、`fireAlien`、`speedUpAliens` 等函式接受所需參數並回傳結果

**理由**：這些函式不需要 Vue reactivity，也不依賴 AudioContext；保持為純函式讓邊界最清晰，也最容易測試。

---

### 決策 5：依賴方向（單向）

```
useSpaceInvaders.ts
    ├── game/types.ts
    ├── game/constants.ts
    ├── game/useAudio.ts        → game/types.ts, game/constants.ts
    ├── game/renderer.ts        → game/types.ts, game/constants.ts
    └── game/entities.ts        → game/types.ts, game/constants.ts
```

模組間不互相 import（useAudio 不 import renderer 等），所有共享狀態由主 composable 持有並傳入。

## Risks / Trade-offs

- **函式簽章變長** → 接受；透過解構可保持呼叫端簡潔，且 TypeScript 型別安全
- **renderer.ts 繪製函式需要大量 game state 參數** → 將相關狀態群組化為物件傳遞（如 `GameObjects`），避免 10+ 個參數的 function signature
- **重構過程中可能遺漏 import** → 每次移動一個模組後立即用 `npm run build` 驗證，確保 zero regressions

## Migration Plan

1. 建立 `src/composables/game/` 目錄
2. 依序建立各模組（types → constants → entities → renderer → useAudio）
3. 每個模組建立後，在 `useSpaceInvaders.ts` 中替換對應程式碼並驗證 build
4. 最終確認 `App.vue` 無需修改，`npm run build` 通過
