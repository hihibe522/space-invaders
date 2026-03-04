import { ref, readonly, onUnmounted, watchEffect } from 'vue'
import type { Ref } from 'vue'

// ─── Types ──────────────────────────────────────────────────────────────────

export type GameState = 'idle' | 'playing' | 'paused' | 'gameover' | 'win'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Bullet extends Rect {
  dy: number // velocity: negative = up (player), positive = down (alien)
}

interface Alien extends Rect {
  type: 0 | 1 | 2 // row group -> different sprite color
  alive: boolean
  animFrame: number // 0 or 1 for two-frame animation
}

interface Shield extends Rect {
  hp: number
}

interface UFO extends Rect {
  active: boolean
  dx: number
}

interface PowerUp extends Rect {
  type: 'rapid' | 'double' | 'restore'
  dy: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const W = 800
const H = 600
const PLAYER_W = 48
const PLAYER_H = 24
const PLAYER_SPEED = 4
const BULLET_W = 4
const BULLET_H = 12
const PLAYER_BULLET_SPEED = 7
const ALIEN_BULLET_SPEED = 3
const ALIEN_COLS = 11
const ALIEN_ROWS = 5
const ALIEN_W = 36
const ALIEN_H = 28
const ALIEN_PAD_X = 16
const ALIEN_PAD_Y = 14
const ALIEN_STEP = 10          // pixels moved each step
const ALIEN_STEP_INTERVAL = 600 // ms between steps (speeds up over time)
const ALIEN_DROP = 16           // pixels dropped when hitting wall
const UFO_W = 48
const UFO_H = 22
const UFO_SPEED = 2
const UFO_INTERVAL = 25000     // ms between UFO appearances
const SHIELD_COUNT = 4
const MAX_LIVES = 3
const ALIEN_FIRE_INTERVAL = 1200 // ms between alien shots
const POWER_UP_SPEED = 2
const POWER_UP_DROP_CHANCE = 0.15
const POWER_UP_SIZE = 16
const POWER_UP_DURATION = 8000  // ms effect duration
const BASE_SHOOT_COOLDOWN = 400
const RAPID_SHOOT_COOLDOWN = 150

// ─── Helpers ────────────────────────────────────────────────────────────────

function collide(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function makeShields(): Shield[] {
  const shields: Shield[] = []
  const shieldW = 64
  const shieldH = 40
  const gap = (W - SHIELD_COUNT * shieldW) / (SHIELD_COUNT + 1)
  for (let i = 0; i < SHIELD_COUNT; i++) {
    shields.push({
      x: gap + i * (shieldW + gap),
      y: H - 140,
      w: shieldW,
      h: shieldH,
      hp: 4,
    })
  }
  return shields
}

function makeAliens(rows: number): Alien[] {
  const aliens: Alien[] = []
  const startX = (W - (ALIEN_COLS * (ALIEN_W + ALIEN_PAD_X) - ALIEN_PAD_X)) / 2
  const startY = 80
  for (let row = 0; row < rows; row++) {
    const type = row === 0 ? 2 : row <= 2 ? 1 : 0
    for (let col = 0; col < ALIEN_COLS; col++) {
      aliens.push({
        x: startX + col * (ALIEN_W + ALIEN_PAD_X),
        y: startY + row * (ALIEN_H + ALIEN_PAD_Y),
        w: ALIEN_W,
        h: ALIEN_H,
        type: type as 0 | 1 | 2,
        alive: true,
        animFrame: 0,
      })
    }
  }
  return aliens
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useSpaceInvaders(canvasRef: Ref<HTMLCanvasElement | null>) {
  // ctx is set inside watchEffect before the game loop starts
  let ctx!: CanvasRenderingContext2D

  // ── State ──────────────────────────────────────────────────────────────────
  const gameState = ref<GameState>('idle')
  const score = ref(0)
  const hiScore = ref(Number(localStorage.getItem('si-hiscore') ?? 0))
  const lives = ref(MAX_LIVES)
  const wave = ref(1)
  const isMuted = ref(false)

  let player: Rect = { x: W / 2 - PLAYER_W / 2, y: H - 60, w: PLAYER_W, h: PLAYER_H }
  let playerBullets: Bullet[] = []
  let alienBullets: Bullet[] = []
  let aliens: Alien[] = []
  let shields: Shield[] = []
  let ufo: UFO = { x: -UFO_W, y: 30, w: UFO_W, h: UFO_H, active: false, dx: UFO_SPEED }
  let powerUps: PowerUp[] = []

  // Key tracking
  const keys: Record<string, boolean> = {}

  // Timing
  let lastTime = 0
  let alienStepTimer = 0
  let alienFireTimer = 0
  let ufoTimer = 0
  let alienDir = 1 // 1 = right, -1 = left
  let currentStepInterval = ALIEN_STEP_INTERVAL
  let rafId = 0

  // Explosion animation
  interface Explosion { x: number; y: number; t: number }
  let explosions: Explosion[] = []

  // Player invincibility after hit
  let playerHitTimer = 0
  const PLAYER_HIT_DURATION = 2000

  // Power-up state
  let rapidTimer = 0   // ms remaining for rapid-fire effect
  let doubleTimer = 0  // ms remaining for double-shot effect
  let doubleShot = false

  // Audio
  let audioCtx: AudioContext | null = null
  let ufoHumNode: OscillatorNode | null = null

  // ── Audio ──────────────────────────────────────────────────────────────────

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  }

  function playShoot() {
    if (isMuted.value || !audioCtx) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.08)
  }

  function playExplosion() {
    if (isMuted.value || !audioCtx) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(100, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.2)
  }

  function startUFOHum() {
    if (isMuted.value || !audioCtx || ufoHumNode) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const lfo = audioCtx.createOscillator()
    const lfoGain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 220
    lfo.frequency.value = 8
    lfoGain.gain.value = 10
    gain.gain.value = 0.15
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    lfo.start()
    osc.start()
    ufoHumNode = osc
  }

  function stopUFOHum() {
    if (ufoHumNode) {
      try { ufoHumNode.stop() } catch { /* already stopped */ }
      ufoHumNode = null
    }
  }

  function playLevelClear() {
    if (isMuted.value || !audioCtx) return
    const notes = [523, 659, 784] // C5, E5, G5
    const ac = audioCtx
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const t = ac.currentTime + i * 0.15
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.15)
    })
  }

  function playGameOver() {
    if (isMuted.value || !audioCtx) return
    const notes = [392, 330, 262] // G4, E4, C4
    const ac = audioCtx
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const t = ac.currentTime + i * 0.22
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.22)
    })
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (isMuted.value) stopUFOHum()
  }

  // ── Wave helpers ───────────────────────────────────────────────────────────

  function waveRows(): number {
    return Math.min(8, ALIEN_ROWS + Math.floor(wave.value / 3))
  }

  function waveStepInterval(): number {
    return Math.max(200, ALIEN_STEP_INTERVAL - (wave.value - 1) * 60)
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function initGame() {
    player = { x: W / 2 - PLAYER_W / 2, y: H - 60, w: PLAYER_W, h: PLAYER_H }
    playerBullets = []
    alienBullets = []
    aliens = makeAliens(ALIEN_ROWS)
    shields = makeShields()
    ufo = { x: -UFO_W, y: 30, w: UFO_W, h: UFO_H, active: false, dx: UFO_SPEED }
    powerUps = []
    alienDir = 1
    currentStepInterval = ALIEN_STEP_INTERVAL
    alienStepTimer = 0
    alienFireTimer = 0
    ufoTimer = 0
    explosions = []
    playerHitTimer = 0
    rapidTimer = 0
    doubleTimer = 0
    doubleShot = false
    score.value = 0
    lives.value = MAX_LIVES
    wave.value = 1
    stopUFOHum()
  }

  function nextWave() {
    wave.value++
    player = { x: W / 2 - PLAYER_W / 2, y: H - 60, w: PLAYER_W, h: PLAYER_H }
    playerBullets = []
    alienBullets = []
    aliens = makeAliens(waveRows())
    shields = makeShields()
    ufo = { x: -UFO_W, y: 30, w: UFO_W, h: UFO_H, active: false, dx: UFO_SPEED }
    powerUps = []
    alienDir = 1
    currentStepInterval = waveStepInterval()
    alienStepTimer = 0
    alienFireTimer = 0
    ufoTimer = 0
    explosions = []
    playerHitTimer = 0
    stopUFOHum()
    playLevelClear()
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  let canShoot = true
  let shootCooldown = 0

  function onKeyDown(e: KeyboardEvent) {
    // Initialise AudioContext on first user interaction (browser autoplay policy)
    initAudio()
    keys[e.code] = true
    if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState.value === 'playing') {
      e.preventDefault()
      if (canShoot && shootCooldown <= 0) {
        const bx = player.x + PLAYER_W / 2 - BULLET_W / 2
        if (doubleShot) {
          playerBullets.push(
            { x: bx - 6, y: player.y - BULLET_H, w: BULLET_W, h: BULLET_H, dy: -PLAYER_BULLET_SPEED },
            { x: bx + 6, y: player.y - BULLET_H, w: BULLET_W, h: BULLET_H, dy: -PLAYER_BULLET_SPEED },
          )
        } else {
          playerBullets.push({ x: bx, y: player.y - BULLET_H, w: BULLET_W, h: BULLET_H, dy: -PLAYER_BULLET_SPEED })
        }
        canShoot = false
        shootCooldown = rapidTimer > 0 ? RAPID_SHOOT_COOLDOWN : BASE_SHOOT_COOLDOWN
        playShoot()
      }
    }
    if (e.code === 'KeyP' && gameState.value === 'playing') {
      gameState.value = 'paused'
    } else if (e.code === 'KeyP' && gameState.value === 'paused') {
      gameState.value = 'playing'
      lastTime = performance.now()
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      if (gameState.value === 'idle' || gameState.value === 'gameover' || gameState.value === 'win') {
        e.preventDefault()
        startGame()
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // ── Canvas initialization and game loop ────────────────────────────────────
  // Uses watchEffect with flush: 'post' so the canvas DOM element is mounted
  // before we access it; onCleanup cancels the RAF when the canvas changes/unmounts
  watchEffect((onCleanup) => {
    const canvas = canvasRef.value
    if (!canvas) return
    ctx = canvas.getContext('2d')!
    canvas.width = W
    canvas.height = H

    rafId = requestAnimationFrame((t) => {
      lastTime = t
      loop(t)
    })

    onCleanup(() => cancelAnimationFrame(rafId))
  }, { flush: 'post' })

  // ── Update ─────────────────────────────────────────────────────────────────

  function update(dt: number) {
    if (gameState.value !== 'playing') return

    shootCooldown -= dt
    if (shootCooldown <= 0) canShoot = true

    playerHitTimer = Math.max(0, playerHitTimer - dt)

    // Power-up timers
    if (rapidTimer > 0) rapidTimer -= dt
    if (doubleTimer > 0) {
      doubleTimer -= dt
      if (doubleTimer <= 0) doubleShot = false
    }

    // Player movement
    if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) {
      player.x = Math.max(0, player.x - PLAYER_SPEED)
    }
    if ((keys['ArrowRight'] || keys['KeyD']) && player.x + player.w < W) {
      player.x = Math.min(W - player.w, player.x + PLAYER_SPEED)
    }

    // Player bullets
    playerBullets = playerBullets.filter(b => b.y + b.h > 0)
    for (const b of playerBullets) b.y += b.dy

    // Alien bullets
    alienBullets = alienBullets.filter(b => b.y < H)
    for (const b of alienBullets) b.y += b.dy

    // Power-ups: move down and remove when off-screen
    powerUps = powerUps.filter(p => p.y < H)
    for (const p of powerUps) p.y += p.dy

    // Alien stepping
    alienStepTimer += dt
    if (alienStepTimer >= currentStepInterval) {
      alienStepTimer = 0
      stepAliens()
    }

    // Alien firing
    alienFireTimer += dt
    if (alienFireTimer >= ALIEN_FIRE_INTERVAL) {
      alienFireTimer = 0
      fireAlien()
    }

    // UFO
    ufoTimer += dt
    if (ufoTimer >= UFO_INTERVAL && !ufo.active) {
      ufoTimer = 0
      ufo.active = true
      ufo.dx = Math.random() > 0.5 ? UFO_SPEED : -UFO_SPEED
      ufo.x = ufo.dx > 0 ? -UFO_W : W
      startUFOHum()
    }
    if (ufo.active) {
      ufo.x += ufo.dx
      if (ufo.x > W + UFO_W || ufo.x < -UFO_W * 2) {
        ufo.active = false
        stopUFOHum()
      }
    }

    // Alien animation frame toggle
    for (const a of aliens) {
      if (a.alive) a.animFrame = alienStepTimer < currentStepInterval / 2 ? 0 : 1
    }

    // Explosions
    explosions = explosions.filter(e => e.t > 0)
    for (const e of explosions) e.t -= dt

    // ── Collision: player bullets vs aliens ──────────────────────────────────
    for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
      const b = playerBullets[bi]!
      let hit = false

      // vs UFO
      if (ufo.active && collide(b, ufo)) {
        ufo.active = false
        stopUFOHum()
        score.value += 150
        explosions.push({ x: ufo.x + UFO_W / 2, y: ufo.y + UFO_H / 2, t: 400 })
        playExplosion()
        playerBullets.splice(bi, 1)
        continue
      }

      // vs aliens
      for (const a of aliens) {
        if (!a.alive) continue
        if (collide(b, a)) {
          a.alive = false
          explosions.push({ x: a.x + a.w / 2, y: a.y + a.h / 2, t: 400 })
          score.value += a.type === 2 ? 30 : a.type === 1 ? 20 : 10
          playerBullets.splice(bi, 1)
          hit = true
          speedUpAliens()
          playExplosion()
          if (Math.random() < POWER_UP_DROP_CHANCE) spawnPowerUp(a)
          break
        }
      }
      if (hit) continue

      // vs shields
      for (const s of shields) {
        if (s.hp > 0 && collide(b, s)) {
          s.hp--
          playerBullets.splice(bi, 1)
          break
        }
      }
    }

    // ── Collision: alien bullets vs player/shields ───────────────────────────
    for (let bi = alienBullets.length - 1; bi >= 0; bi--) {
      const b = alienBullets[bi]!
      let hit = false

      // vs player
      if (playerHitTimer <= 0 && collide(b, player)) {
        alienBullets.splice(bi, 1)
        loseLife()
        hit = true
      }
      if (hit) continue

      // vs shields
      for (const s of shields) {
        if (s.hp > 0 && collide(b, s)) {
          s.hp--
          alienBullets.splice(bi, 1)
          break
        }
      }
    }

    // ── Collision: power-ups vs player ───────────────────────────────────────
    for (let pi = powerUps.length - 1; pi >= 0; pi--) {
      const p = powerUps[pi]!
      if (collide(p, player)) {
        applyPowerUp(p.type)
        powerUps.splice(pi, 1)
      }
    }

    // ── Check aliens reached bottom ──────────────────────────────────────────
    for (const a of aliens) {
      if (a.alive && a.y + a.h >= player.y) {
        endGame(false)
        return
      }
    }

    // ── Check wave clear ──────────────────────────────────────────────────────
    if (aliens.every(a => !a.alive)) {
      nextWave()
    }
  }

  function stepAliens() {
    const living = aliens.filter(a => a.alive)
    if (living.length === 0) return

    const leftmost = Math.min(...living.map(a => a.x))
    const rightmost = Math.max(...living.map(a => a.x + a.w))

    let drop = false
    if (alienDir === 1 && rightmost + ALIEN_STEP > W - 10) {
      drop = true
    } else if (alienDir === -1 && leftmost - ALIEN_STEP < 10) {
      drop = true
    }

    if (drop) {
      for (const a of aliens) a.y += ALIEN_DROP
      alienDir *= -1
    } else {
      for (const a of aliens) a.x += ALIEN_STEP * alienDir
    }
  }

  function speedUpAliens() {
    const remaining = aliens.filter(a => a.alive).length
    // aliens.length = total this wave (dead ones stay in array with alive: false)
    const ratio = remaining / aliens.length
    currentStepInterval = Math.max(100, waveStepInterval() * ratio)
  }

  function fireAlien() {
    const living = aliens.filter(a => a.alive)
    if (living.length === 0) return
    // Pick a random alien from the bottom row of each column
    const colMap: Map<number, Alien> = new Map()
    for (const a of living) {
      const col = Math.round(a.x / (ALIEN_W + ALIEN_PAD_X))
      const existing = colMap.get(col)
      if (!existing || a.y > existing.y) colMap.set(col, a)
    }
    const bottomRow = Array.from(colMap.values())
    const shooter = bottomRow[Math.floor(Math.random() * bottomRow.length)]
    if (!shooter) return
    alienBullets.push({
      x: shooter.x + shooter.w / 2 - BULLET_W / 2,
      y: shooter.y + shooter.h,
      w: BULLET_W,
      h: BULLET_H,
      dy: ALIEN_BULLET_SPEED,
    })
  }

  function loseLife() {
    lives.value--
    playerHitTimer = PLAYER_HIT_DURATION
    explosions.push({ x: player.x + PLAYER_W / 2, y: player.y + PLAYER_H / 2, t: 600 })
    alienBullets = []
    if (lives.value <= 0) {
      endGame(false)
    }
  }

  function endGame(won: boolean) {
    if (score.value > hiScore.value) {
      hiScore.value = score.value
      localStorage.setItem('si-hiscore', String(score.value))
    }
    stopUFOHum()
    if (!won) playGameOver()
    gameState.value = won ? 'win' : 'gameover'
  }

  // ── Power-ups ──────────────────────────────────────────────────────────────

  function spawnPowerUp(alien: Alien) {
    const types: PowerUp['type'][] = ['rapid', 'double', 'restore']
    const type = types[Math.floor(Math.random() * types.length)]!
    powerUps.push({
      x: alien.x + (alien.w - POWER_UP_SIZE) / 2,
      y: alien.y,
      w: POWER_UP_SIZE,
      h: POWER_UP_SIZE,
      type,
      dy: POWER_UP_SPEED,
    })
  }

  function applyPowerUp(type: PowerUp['type']) {
    if (type === 'rapid') {
      rapidTimer = POWER_UP_DURATION
    } else if (type === 'double') {
      doubleShot = true
      doubleTimer = POWER_UP_DURATION
    } else {
      // restore: find shield with lowest hp (> 0) and fill it
      const target = shields.filter(s => s.hp > 0).sort((a, b) => a.hp - b.hp)[0]
      if (target) target.hp = 4
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  function draw() {
    // Background
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, W, H)

    // Stars (static seed)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137.5) % W)
      const sy = ((i * 97.3) % H)
      ctx.fillRect(sx, sy, 1, 1)
    }

    if (gameState.value === 'idle') {
      drawTitleScreen()
      return
    }

    // HUD
    drawHUD()

    // Shields
    for (const s of shields) {
      if (s.hp <= 0) continue
      const alpha = s.hp / 4
      ctx.fillStyle = `rgba(0, 220, 100, ${alpha})`
      ctx.fillRect(s.x, s.y, s.w, s.h)
      // pixelated notch effect
      ctx.fillStyle = '#0a0a1a'
      const notch = 10
      ctx.fillRect(s.x, s.y + s.h - notch, notch, notch)
      ctx.fillRect(s.x + s.w - notch, s.y + s.h - notch, notch, notch)
    }

    // UFO
    if (ufo.active) drawUFO()

    // Aliens
    for (const a of aliens) {
      if (!a.alive) continue
      drawAlien(a)
    }

    // Player (blink when hit)
    if (playerHitTimer <= 0 || Math.floor(playerHitTimer / 150) % 2 === 0) {
      drawPlayer()
    }

    // Player bullets
    ctx.fillStyle = '#00ffff'
    for (const b of playerBullets) {
      ctx.fillRect(b.x, b.y, b.w, b.h)
      // glow
      ctx.shadowColor = '#00ffff'
      ctx.shadowBlur = 6
      ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.shadowBlur = 0
    }

    // Alien bullets
    ctx.fillStyle = '#ff4444'
    for (const b of alienBullets) {
      ctx.shadowColor = '#ff4444'
      ctx.shadowBlur = 6
      ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.shadowBlur = 0
    }

    // Power-ups
    const POWER_UP_COLORS: Record<PowerUp['type'], string> = {
      rapid: '#00ffff',
      double: '#ffff00',
      restore: '#00ff88',
    }
    const POWER_UP_LABELS: Record<PowerUp['type'], string> = {
      rapid: 'R',
      double: 'D',
      restore: 'S',
    }
    for (const p of powerUps) {
      ctx.fillStyle = POWER_UP_COLORS[p.type]
      ctx.shadowColor = POWER_UP_COLORS[p.type]
      ctx.shadowBlur = 8
      ctx.fillRect(p.x, p.y, p.w, p.h)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(POWER_UP_LABELS[p.type], p.x + p.w / 2, p.y + p.h - 3)
    }

    // Explosions
    for (const e of explosions) {
      const progress = 1 - e.t / 600
      const r = progress * 28
      ctx.beginPath()
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, ${Math.floor(180 * (1 - progress))}, 0, ${1 - progress})`
      ctx.fill()
    }

    // Ground line
    ctx.strokeStyle = '#1a3a1a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, H - 30)
    ctx.lineTo(W, H - 30)
    ctx.stroke()

    // Active power-up indicators (HUD bottom-left)
    drawPowerUpIndicators()

    // Overlays
    if (gameState.value === 'paused') drawOverlay('PAUSED', 'Press P to resume')
    if (gameState.value === 'gameover') drawOverlay('GAME OVER', 'Press Enter or Space to restart')
    if (gameState.value === 'win') drawOverlay('YOU WIN!', 'Press Enter or Space to play again', '#00ff88')
  }

  function drawHUD() {
    ctx.font = 'bold 16px "Courier New", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${String(score.value).padStart(5, '0')}`, 16, 24)
    ctx.textAlign = 'center'
    ctx.fillText(`HI: ${String(hiScore.value).padStart(5, '0')}`, W / 2, 24)
    ctx.textAlign = 'right'
    ctx.fillText('LIVES:', W - 100, 24)
    ctx.fillText(`WAVE: ${wave.value}`, W - 16, 44)
    // Draw life icons
    for (let i = 0; i < lives.value; i++) {
      drawMiniPlayer(W - 90 + i * 24, 14)
    }
  }

  function drawPowerUpIndicators() {
    let xOff = 16
    const y = 44
    ctx.font = 'bold 11px monospace'
    if (rapidTimer > 0) {
      ctx.fillStyle = '#00ffff'
      ctx.textAlign = 'left'
      ctx.fillText(`R ${Math.ceil(rapidTimer / 1000)}s`, xOff, y)
      xOff += 40
    }
    if (doubleTimer > 0) {
      ctx.fillStyle = '#ffff00'
      ctx.textAlign = 'left'
      ctx.fillText(`D ${Math.ceil(doubleTimer / 1000)}s`, xOff, y)
    }
  }

  function drawMiniPlayer(x: number, y: number) {
    ctx.fillStyle = '#00ff88'
    ctx.fillRect(x + 5, y, 8, 6)
    ctx.fillRect(x, y + 4, 18, 7)
    ctx.fillRect(x + 7, y - 3, 4, 5)
  }

  function drawPlayer() {
    const x = player.x
    const y = player.y
    ctx.fillStyle = '#00ff88'
    // Body
    ctx.fillRect(x + 4, y + 8, PLAYER_W - 8, PLAYER_H - 8)
    // Cannon
    ctx.fillRect(x + PLAYER_W / 2 - 3, y, 6, 12)
    // Wings
    ctx.fillRect(x, y + 12, 10, 8)
    ctx.fillRect(x + PLAYER_W - 10, y + 12, 10, 8)
    // Glow
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 8
    ctx.fillRect(x + 4, y + 8, PLAYER_W - 8, PLAYER_H - 8)
    ctx.shadowBlur = 0
  }

  const ALIEN_COLORS: Record<0 | 1 | 2, string> = { 0: '#ff6688', 1: '#ffaa00', 2: '#44aaff' }

  function drawAlien(a: Alien) {
    const { x, y, type, animFrame } = a
    ctx.fillStyle = ALIEN_COLORS[type]

    if (type === 0) {
      // Classic octopus style
      if (animFrame === 0) {
        ctx.fillRect(x + 4, y, ALIEN_W - 8, 8)
        ctx.fillRect(x, y + 8, ALIEN_W, 10)
        ctx.fillRect(x + 4, y + 18, 8, 6)
        ctx.fillRect(x + ALIEN_W - 12, y + 18, 8, 6)
        ctx.fillRect(x, y + 20, 6, 8)
        ctx.fillRect(x + ALIEN_W - 6, y + 20, 6, 8)
      } else {
        ctx.fillRect(x + 4, y, ALIEN_W - 8, 8)
        ctx.fillRect(x, y + 8, ALIEN_W, 10)
        ctx.fillRect(x + 2, y + 18, 8, 6)
        ctx.fillRect(x + ALIEN_W - 10, y + 18, 8, 6)
        ctx.fillRect(x + 6, y + 20, 6, 8)
        ctx.fillRect(x + ALIEN_W - 12, y + 20, 6, 8)
      }
    } else if (type === 1) {
      // Crab style
      if (animFrame === 0) {
        ctx.fillRect(x + 2, y + 4, ALIEN_W - 4, 8)
        ctx.fillRect(x + 6, y, ALIEN_W - 12, 6)
        ctx.fillRect(x, y + 8, ALIEN_W, 10)
        ctx.fillRect(x + 8, y + 18, ALIEN_W - 16, 8)
        ctx.fillRect(x + 2, y + 18, 4, 4)
        ctx.fillRect(x + ALIEN_W - 6, y + 18, 4, 4)
      } else {
        ctx.fillRect(x + 2, y + 4, ALIEN_W - 4, 8)
        ctx.fillRect(x + 6, y, ALIEN_W - 12, 6)
        ctx.fillRect(x, y + 8, ALIEN_W, 10)
        ctx.fillRect(x + 8, y + 18, ALIEN_W - 16, 8)
        ctx.fillRect(x + 6, y + 22, 4, 6)
        ctx.fillRect(x + ALIEN_W - 10, y + 22, 4, 6)
      }
    } else {
      // Squid style (top row, highest value)
      if (animFrame === 0) {
        ctx.fillRect(x + 10, y, ALIEN_W - 20, 6)
        ctx.fillRect(x + 4, y + 4, ALIEN_W - 8, 10)
        ctx.fillRect(x, y + 10, ALIEN_W, 8)
        ctx.fillRect(x + 6, y + 18, 6, 6)
        ctx.fillRect(x + ALIEN_W - 12, y + 18, 6, 6)
        ctx.fillRect(x + 2, y + 22, 4, 6)
        ctx.fillRect(x + ALIEN_W - 6, y + 22, 4, 6)
      } else {
        ctx.fillRect(x + 10, y, ALIEN_W - 20, 6)
        ctx.fillRect(x + 4, y + 4, ALIEN_W - 8, 10)
        ctx.fillRect(x, y + 10, ALIEN_W, 8)
        ctx.fillRect(x + 4, y + 18, 8, 6)
        ctx.fillRect(x + ALIEN_W - 12, y + 18, 8, 6)
        ctx.fillRect(x + 4, y + 22, 4, 6)
        ctx.fillRect(x + ALIEN_W - 8, y + 22, 4, 6)
      }
    }

    // Eyes
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(x + 8, y + 10, 4, 4)
    ctx.fillRect(x + ALIEN_W - 12, y + 10, 4, 4)

    // Shadow glow
    ctx.shadowColor = ALIEN_COLORS[type]
    ctx.shadowBlur = 6
    ctx.fillStyle = ALIEN_COLORS[type]
    ctx.fillRect(x, y + 8, ALIEN_W, 2)
    ctx.shadowBlur = 0
  }

  function drawUFO() {
    const x = ufo.x
    const y = ufo.y
    ctx.fillStyle = '#ff00ff'
    ctx.shadowColor = '#ff00ff'
    ctx.shadowBlur = 10
    // Body
    ctx.fillRect(x + 10, y + 8, UFO_W - 20, 10)
    // Dome
    ctx.fillRect(x + 16, y, UFO_W - 32, 10)
    // Bottom fins
    ctx.fillRect(x + 4, y + 14, 8, 8)
    ctx.fillRect(x + UFO_W - 12, y + 14, 8, 8)
    ctx.shadowBlur = 0
    // Score hint
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('150', x + UFO_W / 2, y - 4)
  }

  function drawTitleScreen() {
    ctx.textAlign = 'center'

    // Title
    ctx.font = 'bold 52px "Courier New", monospace'
    ctx.fillStyle = '#00ff88'
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 20
    ctx.fillText('SPACE', W / 2, 160)
    ctx.fillText('INVADERS', W / 2, 220)
    ctx.shadowBlur = 0

    // Alien preview
    const previewAliens = [
      { type: 2, label: '= 30 pts', color: '#44aaff' },
      { type: 1, label: '= 20 pts', color: '#ffaa00' },
      { type: 0, label: '= 10 pts', color: '#ff6688' },
    ]
    previewAliens.forEach((pa, i) => {
      const ax = W / 2 - 60
      const ay = 270 + i * 50
      const fakeAlien: Alien = { x: ax, y: ay, w: ALIEN_W, h: ALIEN_H, type: pa.type as 0 | 1 | 2, alive: true, animFrame: 0 }
      drawAlien(fakeAlien)
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px "Courier New", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(pa.label, ax + ALIEN_W + 12, ay + ALIEN_H / 2 + 5)
    })

    // UFO row
    const ux = W / 2 - UFO_W / 2
    const uy = 420
    ctx.fillStyle = '#ff00ff'
    ctx.shadowColor = '#ff00ff'
    ctx.shadowBlur = 10
    ctx.fillRect(ux + 10, uy + 8, UFO_W - 20, 10)
    ctx.fillRect(ux + 16, uy, UFO_W - 32, 10)
    ctx.fillRect(ux + 4, uy + 14, 8, 8)
    ctx.fillRect(ux + UFO_W - 12, uy + 14, 8, 8)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('= 150 pts', ux + UFO_W + 12, uy + UFO_H / 2 + 5)

    // Controls
    ctx.textAlign = 'center'
    ctx.font = '13px "Courier New", monospace'
    ctx.fillStyle = '#aaaaaa'
    ctx.fillText('← → / A D  Move    Space  Shoot    P  Pause', W / 2, 490)

    // Blink start
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#ffff00'
      ctx.font = 'bold 20px "Courier New", monospace'
      ctx.fillText('PRESS ENTER OR SPACE TO START', W / 2, 540)
    }

    // Hi Score
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px "Courier New", monospace'
    ctx.fillText(`HI-SCORE: ${String(hiScore.value).padStart(5, '0')}`, W / 2, 580)
  }

  function drawOverlay(title: string, subtitle: string, color = '#ff4444') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.font = 'bold 56px "Courier New", monospace'
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 30
    ctx.fillText(title, W / 2, H / 2 - 30)
    ctx.shadowBlur = 0

    ctx.font = '20px "Courier New", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(subtitle, W / 2, H / 2 + 30)

    ctx.font = '18px "Courier New", monospace'
    ctx.fillStyle = '#ffff00'
    ctx.fillText(`SCORE: ${score.value}`, W / 2, H / 2 + 70)

    ctx.font = '16px "Courier New", monospace'
    ctx.fillStyle = '#aaaaaa'
    ctx.fillText(`WAVE: ${wave.value}`, W / 2, H / 2 + 100)
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  function loop(time: number) {
    const dt = Math.min(time - lastTime, 50) // cap at 50ms to avoid spiral
    lastTime = time

    update(dt)
    draw()

    rafId = requestAnimationFrame(loop)
  }

  function startGame() {
    initGame()
    gameState.value = 'playing'
    lastTime = performance.now()
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    stopUFOHum()
    void audioCtx?.close()
  })

  return {
    gameState: readonly(gameState),
    score: readonly(score),
    hiScore: readonly(hiScore),
    lives: readonly(lives),
    wave: readonly(wave),
    isMuted: readonly(isMuted),
    toggleMute,
  }
}
