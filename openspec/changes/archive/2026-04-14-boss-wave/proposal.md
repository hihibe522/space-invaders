## Why

Space Invaders 目前每波只有普通外星人，缺乏節奏變化。每 5 波加入一個 Boss 關卡，提供玩家明確的里程碑挑戰，讓遊戲更有層次感。

## What Changes

- 每當 `wave % 5 === 0` 時，該波替換為 Boss 戰（無普通外星人）
- 新增 Boss 實體：10 血、四方向移動（碰壁反彈）、固定間隔射擊
- 被擊中時視覺閃爍（白光），無行為改變
- Boss 消滅後得 500 分，進入下一波
- 畫面上方顯示 Boss 血量條

## Capabilities

### New Capabilities
- `boss-enemy`: Boss 敵人實體，包含移動邏輯、射擊、受擊閃爍、血量條顯示

### Modified Capabilities
- `wave-progression`: Boss 波觸發條件（wave % 5 === 0 時跳過普通外星人生成）

## Impact

- `src/composables/game/types.ts`：新增 `Boss` interface
- `src/composables/game/constants.ts`：新增 Boss 相關常數
- `src/composables/game/entities.ts`：新增 `spawnBoss()`、`fireBoss()` helper
- `src/composables/useSpaceInvaders.ts`：Boss 狀態管理、移動更新、碰撞偵測、波次判斷
- `src/composables/game/renderer.ts`：Boss 繪製（形狀、血量條、閃爍效果）
