## 1. 型別與常數

- [x] 1.1 在 `types.ts` 新增 `Boss` interface（x, y, w, h, dx, dy, hp, hitFlashTimer）
- [x] 1.2 在 `constants.ts` 新增 Boss 常數（BOSS_W, BOSS_H, BOSS_HP, BOSS_SPEED_X, BOSS_SPEED_Y, BOSS_FIRE_INTERVAL, BOSS_HIT_FLASH, BOSS_SCORE, BOSS_LOWER_BOUND）

## 2. 實體邏輯

- [x] 2.1 在 `entities.ts` 新增 `spawnBoss()` — 回傳初始化的 Boss 實體（畫面頂部中央）
- [x] 2.2 在 `entities.ts` 新增 `fireBoss(boss)` — 從 Boss 中心底部生成向下子彈，回傳 `Bullet`

## 3. 遊戲狀態管理（useSpaceInvaders.ts）

- [x] 3.1 新增 `let boss: Boss | null = null` 與 `let bossFireTimer = 0` plain 變數
- [x] 3.2 新增 `isBossWave()` helper：`wave.value % 5 === 0`
- [x] 3.3 修改 `initGame()`：Boss 波時 `boss = spawnBoss()`、`aliens = []`；普通波維持原邏輯
- [x] 3.4 修改 `nextWave()`：同上，依 `isBossWave()` 分支處理
- [x] 3.5 在 `update()` 加入 Boss 移動邏輯（四方向 + 邊界反彈）
- [x] 3.6 在 `update()` 加入 Boss 射擊計時（`bossFireTimer`，觸發後呼叫 `fireBoss`）
- [x] 3.7 在 `update()` 加入 `hitFlashTimer` 倒數
- [x] 3.8 在碰撞偵測加入「玩家子彈 vs Boss」：扣血、設閃爍、hp=0 時觸發消滅流程
- [x] 3.9 修改波次完成判斷：Boss 波檢查 `boss === null`，普通波維持 `aliens.every(a => !a.alive)`
- [x] 3.10 將 `boss`, `bossFireTimer` 傳入 `renderFrame`（更新 render 呼叫簽名）

## 4. 渲染（renderer.ts）

- [x] 4.1 更新 `draw()` 函式簽名，接受 `boss: Boss | null`
- [x] 4.2 繪製 Boss 形狀（大型紅色矩形 + 簡單裝飾）
- [x] 4.3 實作閃爍效果：`hitFlashTimer > 0` 時填白色
- [x] 4.4 繪製 Boss 血量條（Boss 上方，底色暗紅，填充亮紅）
