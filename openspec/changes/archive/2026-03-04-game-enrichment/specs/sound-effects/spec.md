## ADDED Requirements

### Requirement: 透過 Web Audio API 合成遊戲音效

系統 SHALL 使用瀏覽器原生 Web Audio API 合成所有音效，不依賴外部音訊資源。每種音效為獨立函式，呼叫後自動清理音訊節點。

#### Scenario: 玩家射擊音效
- **WHEN** 玩家成功發射子彈
- **THEN** 播放短促的高頻合成音（約 80ms）

#### Scenario: 外星人爆炸音效
- **WHEN** 玩家子彈擊中外星人或 UFO
- **THEN** 播放低頻噪音爆炸聲（約 200ms）

#### Scenario: UFO 出現音效
- **WHEN** UFO 進入畫面（`ufo.active` 變為 `true`）
- **THEN** 播放循環嗡嗡聲，UFO 離開後停止

#### Scenario: 過關音效
- **WHEN** 所有外星人被清除（波次完成）
- **THEN** 播放上揚音階音效（約 500ms）

#### Scenario: Game Over 音效
- **WHEN** 遊戲狀態切換至 `'gameover'`
- **THEN** 播放下降音調音效（約 800ms）

### Requirement: 延遲建立 AudioContext

系統 SHALL 在第一次鍵盤事件時才建立 `AudioContext`，以符合瀏覽器 autoplay 政策。

#### Scenario: 首次按鍵初始化音訊
- **WHEN** 使用者第一次按下任意鍵且 `AudioContext` 尚未建立
- **THEN** 建立 `AudioContext` 實例，後續音效使用此實例

### Requirement: 靜音切換

系統 SHALL 提供靜音切換機制，靜音時所有音效函式立即返回不發聲。

#### Scenario: 靜音狀態下不播放音效
- **WHEN** `isMuted` 為 `true` 且任何音效觸發條件成立
- **THEN** 不建立任何 AudioNode，無聲音輸出

#### Scenario: composable 回傳靜音狀態與切換方法
- **WHEN** `App.vue` 使用 composable
- **THEN** 可從回傳值解構 `isMuted`（`readonly Ref<boolean>`）與 `toggleMute`（`() => void`）
