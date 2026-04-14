## MODIFIED Requirements

### Requirement: 清除波次後自動進入下一波

系統 SHALL 在玩家清除該波所有敵人後，自動重置敵人並開始下一波，遊戲狀態保持 `'playing'`，分數與生命數持續累積。普通波（`wave % 5 !== 0`）以外星人全滅為完成條件；Boss 波（`wave % 5 === 0`）以 Boss 消滅（`boss === null`）為完成條件。

#### Scenario: 清除第一波進入第二波
- **WHEN** 玩家擊殺最後一隻外星人
- **THEN** 外星人陣列重新生成，`wave` 增加 1，遊戲繼續運行不中斷

#### Scenario: 清除 Boss 波進入下一波
- **WHEN** Boss 血量歸零
- **THEN** `boss` 設為 `null`，`wave` 增加 1，遊戲繼續運行不中斷

#### Scenario: 生命與分數在波次間保留
- **WHEN** 新波次開始
- **THEN** `lives` 與 `score` 維持上一波結束時的數值，護盾陣列重置為滿血

## ADDED Requirements

### Requirement: Boss 波觸發條件
系統 SHALL 在 `wave % 5 === 0` 時初始化 Boss 而非外星人陣列。

#### Scenario: 第 5 波為 Boss 波
- **WHEN** `nextWave()` 被呼叫後 `wave.value` 變為 5
- **THEN** `aliens` 陣列為空，`boss` 被初始化為新的 Boss 實體

#### Scenario: 第 6 波恢復普通波
- **WHEN** `nextWave()` 被呼叫後 `wave.value` 變為 6
- **THEN** `boss` 為 `null`，`aliens` 陣列正常生成
