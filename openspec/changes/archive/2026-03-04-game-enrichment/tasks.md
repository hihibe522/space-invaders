## 1. 波次推進

- [x] 1.1 新增 `const wave = ref(1)` 狀態與 `nextWave()` 函式到 composable
- [x] 1.2 實作 `nextWave()`：重置外星人（依波次調整列數）、重置護盾、重置計時器，`wave.value++`，保留 `score` 與 `lives`
- [x] 1.3 將 `endGame(true)` 改為呼叫 `nextWave()`，移除直接切換至 `'win'` 的路徑（玩家只有在 `lives === 0` 才結束）
- [x] 1.4 在 `makeAliens()` 改為接受 `rows` 與 `stepInterval` 參數，`nextWave()` 依公式計算傳入
- [x] 1.5 在 `drawHUD()` 中新增 `WAVE: N` 文字繪製
- [x] 1.6 將 `wave: readonly(wave)` 加入 composable 回傳物件
- [x] 1.7 手動測試：清除第一波後第二波正確生成，分數與生命保留

## 2. 音效系統

- [x] 2.1 在 composable 頂層宣告 `let audioCtx: AudioContext | null = null`
- [x] 2.2 在 `onKeyDown` 首次觸發時建立 `AudioContext`（判斷 `audioCtx === null`）
- [x] 2.3 實作 `playShoot()`：短促高頻音（頻率 880Hz，時長 80ms，類型 square）
- [x] 2.4 實作 `playExplosion()`：低頻噪音衰減（頻率 100→20Hz，時長 200ms）
- [x] 2.5 實作 `playUFOHum()`：回傳可停止的 oscillator，UFO 出現時啟動、離開時停止
- [x] 2.6 實作 `playLevelClear()`：上揚三音音階（C5→E5→G5，各 150ms）
- [x] 2.7 實作 `playGameOver()`：下降音調（G4→E4→C4，各 200ms）
- [x] 2.8 在對應事件點呼叫各音效函式（射擊、擊殺、UFO 出現/消失、過關、Game Over）
- [x] 2.9 新增 `const isMuted = ref(false)` 與 `toggleMute()`，所有 play 函式在 `isMuted.value` 時直接 return
- [x] 2.10 將 `isMuted: readonly(isMuted)` 與 `toggleMute` 加入 composable 回傳物件
- [x] 2.11 在 `App.vue` 新增靜音切換 `<button>`，連接 `toggleMute`，顯示 `🔊 / 🔇`

## 3. 強化道具

- [x] 3.1 新增 `PowerUp` 介面：`{ x, y, w, h, type: 'rapid' | 'double' | 'restore', dy }`
- [x] 3.2 宣告 `let powerUps: PowerUp[] = []`，並在 `initGame()` 中重置
- [x] 3.3 在外星人被擊殺時（碰撞偵測 hit 路徑）以 15% 機率呼叫 `spawnPowerUp(alien)`
- [x] 3.4 實作 `spawnPowerUp(alien)`：隨機選 type，建立 PowerUp 物件推入陣列
- [x] 3.5 在 `update()` 中移動道具（`p.y += p.dy`）並過濾超出畫面的物件
- [x] 3.6 新增 `rapidTimer`、`doubleTimer` 計時器（毫秒），每幀在 `update()` 中遞減
- [x] 3.7 在 `update()` 中實作玩家與道具的碰撞偵測，命中時呼叫 `applyPowerUp(type)` 並移除道具
- [x] 3.8 實作 `applyPowerUp(type)`：`rapid` 設 `shootCooldown = 150` 並重置 `rapidTimer = 8000`；`double` 設 `doubleShot = true` 並重置 `doubleTimer = 8000`；`restore` 找 hp 最低的護盾設為 4
- [x] 3.9 在每幀 `update()` 末端：`rapidTimer <= 0` 時將射擊冷卻恢復 400ms；`doubleTimer <= 0` 時將 `doubleShot` 重置為 `false`
- [x] 3.10 修改射擊邏輯：`doubleShot === true` 時推入兩顆子彈（x 偏移 ±6px）
- [x] 3.11 在 `draw()` 中繪製道具方塊（16×16）與首字母（R / D / S）
- [x] 3.12 手動測試：擊殺外星人多次後確認道具出現、拾取後效果生效且限時結束
