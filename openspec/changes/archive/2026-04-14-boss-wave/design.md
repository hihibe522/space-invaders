## Context

目前 `useSpaceInvaders.ts` 的波次邏輯：每波生成 `makeAliens(waveRows())` 並在 `aliens.every(a => !a.alive)` 時推進波次。UFO 是獨立的計時器觸發實體，與波次無關。

Boss 波需要在這個架構上加一條平行路徑：當 `wave % 5 === 0` 時，初始化 `boss` 而非 `aliens`，並將波次完成條件改為 `boss === null`。

## Goals / Non-Goals

**Goals:**
- 第 5、10、15… 波替換為 Boss 戰
- Boss 四方向移動（碰壁反彈），固定間隔射擊
- 10 血、被擊中閃爍、消滅得 500 分
- 血量條顯示於 Boss 上方

**Non-Goals:**
- Boss 低血量行為改變
- Boss 召喚小兵
- 多種 Boss 類型
- Boss 專屬音效（可後續擴充）

## Decisions

**D1：Boss 作為獨立 plain variable，不進 aliens 陣列**
- Boss 有自己的 `dx`/`dy`/`hp`/`hitFlashTimer`，語意上與外星人完全不同
- 放進 aliens 陣列需要大量型別特例判斷，不值得
- 採用 `let boss: Boss | null = null`

**D2：Boss 波完全清空外星人，UFO 照常可出現**
- 簡化波次完成判斷：boss 波檢查 `boss === null`，一般波檢查 `aliens.every(a => !a.alive)`
- UFO 計時器不受影響，兩者獨立

**D3：Boss 移動邊界**
- 上邊界：y >= 40（讓出分數列空間）
- 下邊界：y <= H * 0.5（不讓 Boss 衝到玩家面前，仍保持挑戰感）
- 左右：0 ~ W - BOSS_W

**D4：Boss 閃爍實作方式**
- 新增 `hitFlashTimer: number`，被擊中時設為 300ms
- renderer 根據 `hitFlashTimer > 0` 決定填色（白色 vs 紅色）
- 不另開 RAF，直接用 `update(dt)` 遞減

## Risks / Trade-offs

- [Boss 在 H * 0.5 以上來回，玩家可能感覺 Boss 太遠] → 可調整 BOSS_LOWER_BOUND 常數，初期設 H * 0.6 試玩
- [Boss 射擊間隔固定，波數高時太簡單] → 此版本 Non-Goal，後續可依 wave 數縮短 interval
