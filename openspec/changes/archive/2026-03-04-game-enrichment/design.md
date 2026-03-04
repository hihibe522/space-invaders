## Context

遊戲邏輯集中於單一 composable `useSpaceInvaders`，透過 `watchEffect` 初始化 canvas 並自行管理 RAF 遊戲迴圈。所有遊戲實體（玩家、外星人、子彈、護盾）為普通 `let` 變數，僅有四個 UI 相關的 `ref`（`gameState`、`score`、`hiScore`、`lives`）透過 Vue 響應性暴露給外部。三項新功能都在此 composable 內延伸，不新增外部依賴。

## Goals / Non-Goals

**Goals:**
- 在同一個 composable 內加入波次推進、音效合成與道具掉落
- 以最小 API surface 暴露新狀態（`wave`、`isMuted`）
- 音效合成不依賴任何外部音訊檔案

**Non-Goals:**
- 多人模式、線上排行榜
- 外部音訊資源（.mp3 / .ogg）
- 行動裝置觸控控制（另立提案）
- 重構現有 composable 結構

## Decisions

### 1. 波次狀態以 `ref<number>` 追蹤

波次編號直接以 `const wave = ref(1)` 追蹤。`endGame(true)` 判斷為 win 時，改為呼叫 `nextWave()` 而非直接切換為 `'win'` 狀態；第 N 波的外星人步進初始間隔為 `max(200, ALIEN_STEP_INTERVAL - (wave - 1) * 60)`，列數為 `min(8, ALIEN_ROWS + floor(wave / 3))`。

**替代方案**：用獨立的 `waveConfig` 物件存放每波參數 → 過早抽象，目前公式即可。

### 2. 音效透過 Web Audio API 即時合成

每種音效以一個函式封裝，在 `AudioContext` 上動態建立 `OscillatorNode` + `GainNode`，播放結束後自動 disconnect。`AudioContext` 在首次按鍵時延遲建立（解決瀏覽器 autoplay 政策限制）。靜音時跳過 `oscillator.start()`。

**替代方案**：預先錄製音效檔案 → 需要額外資源，違背零外部依賴的目標。

### 3. 道具為獨立陣列，與子彈同等地位

新增 `let powerUps: PowerUp[]`，每個物件帶有 `type`（`'rapid' | 'double' | 'restore'`）、位置與墜落速度。碰撞偵測與子彈相同，在 `update()` 中統一處理。道具繪製在 `draw()` 中加入，以顏色區分類型。掉落機率固定為 15%（每次擊殺一次隨機判定）。

**替代方案**：道具綁定在外星人物件上 → 增加外星人型別複雜度，不必要。

### 4. `isMuted` 以 `ref<boolean>` 暴露

`App.vue` 讀取 `isMuted` 並渲染一個 HTML `<button>` 覆蓋於 canvas 上方，點擊時呼叫 composable 回傳的 `toggleMute()`。不在 canvas 內繪製靜音按鈕，避免混用 DOM 事件與 canvas 繪圖邏輯。

## Risks / Trade-offs

- **AudioContext autoplay 限制** → 在 `onKeyDown` 的第一次觸發時才建立 `AudioContext`，確保有使用者互動。
- **波次無限增長** → 步進間隔下限設為 200ms、列數上限設為 8，防止遊戲難度失控。
- **道具同時生效疊加** → 急速射擊與雙重射擊可同時存在，效果持續時間各自獨立計時（`rapidTimer`、`doubleTimer`），過期後重置回預設值。
- **composable 行數增長** → 三項功能新增後預計從 ~790 行增至 ~1000 行。可接受，仍是單一關注點的遊戲邏輯。
