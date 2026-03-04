## ADDED Requirements

### Requirement: 外星人擊殺時有機率掉落道具

系統 SHALL 在外星人被擊殺時以 15% 機率生成一個道具，道具類型隨機選取自三種類型之一。

#### Scenario: 道具隨機掉落
- **WHEN** 玩家子彈擊殺外星人（非 UFO）
- **THEN** 以 15% 機率在該外星人位置生成一個道具（`rapid`、`double`、`restore` 機率均等）

#### Scenario: UFO 不掉落道具
- **WHEN** 玩家子彈擊殺 UFO
- **THEN** 不生成任何道具

### Requirement: 道具向下墜落

系統 SHALL 讓道具以固定速度向下墜落，超出畫面底部後自動移除。

#### Scenario: 道具持續下落
- **WHEN** 道具物件存在於遊戲中
- **THEN** 每幀依 `POWER_UP_SPEED`（建議 2 px/frame）更新 y 座標

#### Scenario: 超出畫面自動移除
- **WHEN** 道具 y 座標超過畫布高度
- **THEN** 從 `powerUps` 陣列中移除該道具

### Requirement: 玩家碰觸道具後套用效果

系統 SHALL 在玩家飛船與道具發生碰撞時，立即套用對應效果並移除道具。

#### Scenario: 拾取急速射擊道具
- **WHEN** 玩家與 `type === 'rapid'` 的道具碰撞
- **THEN** 射擊冷卻縮短至 150ms，效果持續 8 秒後恢復原始值（400ms）

#### Scenario: 拾取雙重射擊道具
- **WHEN** 玩家與 `type === 'double'` 的道具碰撞
- **THEN** 射擊時同時發射兩顆子彈（左右各偏移 6px），效果持續 8 秒後恢復單發

#### Scenario: 拾取護盾修復道具
- **WHEN** 玩家與 `type === 'restore'` 的道具碰撞
- **THEN** 從 hp 最低的護盾中選一個，將其 hp 重置為 4

#### Scenario: 道具拾取後移除
- **WHEN** 碰撞偵測判定為命中
- **THEN** 從 `powerUps` 陣列中移除該道具，效果立即生效

### Requirement: 道具在畫面上有視覺區分

系統 SHALL 以不同顏色的方塊搭配文字標示繪製各類道具。

#### Scenario: 道具外觀
- **WHEN** 道具存在於遊戲中
- **THEN** 以 16×16 的彩色方塊繪製（`rapid` 為青色、`double` 為黃色、`restore` 為綠色），中心顯示首字母縮寫
