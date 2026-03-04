## Why

目前的太空侵略者實作擁有扎實的核心機制，但缺乏重玩誘因與感官回饋——玩家清除第一波或耗盡生命後，幾乎沒有繼續遊玩的動力。加入波次推進、音效，以及強化道具，能將目前的技術展示轉化為完整的街機遊戲循環。

## What Changes

- **波次推進**：清除所有外星人後，新一波立即生成，外星人步進間隔縮短、最多增加一列（上限 8 列）。HUD 顯示目前波次編號。
- **音效系統**：透過 Web Audio API 合成射擊、爆炸、UFO 嗡嗡聲、過關與 Game Over 音效，無需外部音訊資源。
- **強化道具掉落**：擊殺外星人有機率掉落三種道具，向下墜落並由玩家碰觸拾取——*急速射擊*（縮短射擊冷卻）、*雙重射擊*（同時發射兩顆子彈）、*護盾修復*（隨機補滿一個護盾耐久）。
- **HUD 改善**：在分數與生命旁新增波次計數，以及靜音切換按鈕（HTML 覆蓋層）。

## Capabilities

### New Capabilities

- `wave-progression`：追蹤目前波次、以遞增難度重新生成外星人陣列，並在 composable 回傳值中新增 `wave` ref。
- `sound-effects`：透過 Web Audio API 合成遊戲音效（射擊、外星人爆炸、UFO、過關、Game Over），附帶主靜音切換，並將 `isMuted` 加入回傳值。
- `power-ups`：外星人擊殺時的道具掉落邏輯、下墜物件、與玩家的碰撞偵測，以及效果套用（急速射擊、雙重射擊、護盾修復）。

### Modified Capabilities

（無——不移除或破壞任何現有行為）

## Impact

- **`src/composables/useSpaceInvaders.ts`**：三項 capability 均在此擴充；`wave`、`isMuted` 新增至回傳物件。
- **`src/App.vue`**：新增靜音切換按鈕（HTML 元素），從 composable 讀取 `wave`。
- **無新外部依賴**：Web Audio API 為瀏覽器原生；波次與道具邏輯皆為純 TypeScript。
