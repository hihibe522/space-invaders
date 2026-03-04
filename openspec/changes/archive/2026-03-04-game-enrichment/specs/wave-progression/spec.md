## ADDED Requirements

### Requirement: 清除波次後自動進入下一波

系統 SHALL 在玩家清除所有外星人後，自動重置外星人陣列並開始下一波，遊戲狀態保持 `'playing'`，分數與生命數持續累積。

#### Scenario: 清除第一波進入第二波
- **WHEN** 玩家擊殺最後一隻外星人
- **THEN** 外星人陣列重新生成，`wave` 增加 1，遊戲繼續運行不中斷

#### Scenario: 生命與分數在波次間保留
- **WHEN** 新波次開始
- **THEN** `lives` 與 `score` 維持上一波結束時的數值，護盾陣列重置為滿血

### Requirement: 波次難度遞增

系統 SHALL 每波增加外星人步進速度，並每三波新增一列外星人（上限 8 列）。

#### Scenario: 步進間隔隨波次縮短
- **WHEN** 第 N 波開始（N ≥ 2）
- **THEN** 初始步進間隔為 `max(200, 600 - (N - 1) * 60)` 毫秒

#### Scenario: 列數每三波增加
- **WHEN** 第 N 波開始且 `N mod 3 === 0`
- **THEN** 外星人列數為 `min(8, 5 + floor(N / 3))`

### Requirement: HUD 顯示目前波次

系統 SHALL 在 HUD 區域顯示目前波次編號。

#### Scenario: 波次編號顯示於畫面
- **WHEN** 遊戲狀態為 `'playing'`
- **THEN** HUD 右側顯示 `WAVE: N`（N 為當前波次數字）

### Requirement: composable 回傳 wave ref

`useSpaceInvaders` SHALL 在回傳物件中包含 `wave`（`readonly Ref<number>`）。

#### Scenario: 外部元件可讀取 wave
- **WHEN** `App.vue` 使用 composable
- **THEN** 可從回傳值解構 `wave` 並在模板中使用
