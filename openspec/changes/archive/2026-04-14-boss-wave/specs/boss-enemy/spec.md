## ADDED Requirements

### Requirement: Boss 實體定義
系統 SHALL 定義 `Boss` 型別，包含位置、尺寸、速度向量、血量與受擊閃爍計時器。

#### Scenario: Boss 型別存在
- **WHEN** 程式碼引用 `Boss` interface
- **THEN** 包含 `x, y, w, h, dx, dy, hp: number, hitFlashTimer: number`

### Requirement: Boss 四方向移動
系統 SHALL 讓 Boss 在畫面內四方向移動，碰到邊界時對應軸速度反向。

#### Scenario: 碰左右邊界反彈
- **WHEN** Boss 的 `x <= 0` 或 `x + w >= W`
- **THEN** `dx` 反向（`dx = -dx`）

#### Scenario: 碰頂部邊界反彈
- **WHEN** Boss 的 `y <= 40`
- **THEN** `dy` 反向（`dy = -dy`）

#### Scenario: 碰下邊界反彈
- **WHEN** Boss 的 `y + h >= H * 0.6`
- **THEN** `dy` 反向（`dy = -dy`）

### Requirement: Boss 定時射擊
系統 SHALL 讓 Boss 每 800ms 發射一顆子彈向下。

#### Scenario: 射擊間隔觸發
- **WHEN** `bossFireTimer >= BOSS_FIRE_INTERVAL`
- **THEN** 從 Boss 中心底部生成一顆向下子彈，計時器歸零

### Requirement: Boss 受擊閃爍
系統 SHALL 在玩家子彈擊中 Boss 時，將 Boss 閃爍 300ms（顯示為白色），血量減 1。

#### Scenario: 子彈擊中觸發閃爍
- **WHEN** 玩家子彈與 Boss 碰撞
- **THEN** `boss.hp -= 1`，`boss.hitFlashTimer = BOSS_HIT_FLASH`，子彈移除

#### Scenario: 閃爍結束恢復原色
- **WHEN** `hitFlashTimer` 倒數至 0
- **THEN** Boss 恢復正常紅色顯示

### Requirement: Boss 消滅
系統 SHALL 在 Boss `hp <= 0` 時觸發爆炸、加 500 分，並進入下一波。

#### Scenario: Boss 血量歸零
- **WHEN** Boss 受到最後一擊，`hp` 變為 0
- **THEN** 生成爆炸效果、`score += 500`、`boss = null`、呼叫 `nextWave()`

### Requirement: Boss 血量條顯示
系統 SHALL 在 Boss 上方繪製血量條，顯示剩餘 HP / 最大 HP 比例。

#### Scenario: 血量條隨傷害縮短
- **WHEN** Boss 被擊中後 `hp` 減少
- **THEN** 血量條長度等比例縮短，條底色為暗紅，填充色為亮紅
