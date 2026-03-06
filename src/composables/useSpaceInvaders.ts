import { ref, readonly, onUnmounted, watchEffect } from 'vue'
import type { Ref } from 'vue'
import type { Rect, Bullet, Alien, Shield, UFO, PowerUp, Explosion } from './game/types'
import {
  W, H,
  PLAYER_W, PLAYER_H, PLAYER_SPEED,
  BULLET_W, BULLET_H, PLAYER_BULLET_SPEED,
  UFO_W, UFO_H, UFO_SPEED, UFO_INTERVAL,
  ALIEN_ROWS, ALIEN_STEP_INTERVAL, ALIEN_FIRE_INTERVAL,
  MAX_LIVES,
  POWER_UP_SPEED, POWER_UP_DROP_CHANCE, POWER_UP_SIZE, POWER_UP_DURATION,
  BASE_SHOOT_COOLDOWN, RAPID_SHOOT_COOLDOWN,
  PLAYER_HIT_DURATION,
} from './game/constants'
import { collide, makeAliens, makeShields, stepAliens, speedUpAliens, fireAlien } from './game/entities'
import { useAudio } from './game/useAudio'
import { draw as renderFrame } from './game/renderer'

export type { GameState } from './game/types'

// ─── Composable ──────────────────────────────────────────────────────────────

export function useSpaceInvaders(canvasRef: Ref<HTMLCanvasElement | null>) {
  let ctx!: CanvasRenderingContext2D

  // ── Reactive UI state ──────────────────────────────────────────────────────
  const gameState = ref<import('./game/types').GameState>('idle')
  const score = ref(0)
  const hiScore = ref(Number(localStorage.getItem('si-hiscore') ?? 0))
  const lives = ref(MAX_LIVES)
  const wave = ref(1)
  const isMuted = ref(false)

  // ── Audio ──────────────────────────────────────────────────────────────────
  const audio = useAudio(isMuted)

  // ── Plain game state (not reactive) ───────────────────────────────────────
  let player: Rect = { x: W / 2 - PLAYER_W / 2, y: H - 60, w: PLAYER_W, h: PLAYER_H }
  let playerBullets: Bullet[] = []
  let alienBullets: Bullet[] = []
  let aliens: Alien[] = []
  let shields: Shield[] = []
  let ufo: UFO = { x: -UFO_W, y: 30, w: UFO_W, h: UFO_H, active: false, dx: UFO_SPEED }
  let powerUps: PowerUp[] = []
  let explosions: Explosion[] = []

  // Key tracking
  const keys: Record<string, boolean> = {}

  // Timing
  let lastTime = 0
  let alienStepTimer = 0
  let alienFireTimer = 0
  let ufoTimer = 0
  let alienDir = 1
  let currentStepInterval = ALIEN_STEP_INTERVAL
  let rafId = 0

  // Player state
  let playerHitTimer = 0
  let canShoot = true
  let shootCooldown = 0

  // Power-up state
  let rapidTimer = 0
  let doubleTimer = 0
  let doubleShot = false

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
    explosions = []
    alienDir = 1
    currentStepInterval = ALIEN_STEP_INTERVAL
    alienStepTimer = 0
    alienFireTimer = 0
    ufoTimer = 0
    playerHitTimer = 0
    rapidTimer = 0
    doubleTimer = 0
    doubleShot = false
    score.value = 0
    lives.value = MAX_LIVES
    wave.value = 1
    audio.stopUFOHum()
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
    explosions = []
    alienDir = 1
    currentStepInterval = waveStepInterval()
    alienStepTimer = 0
    alienFireTimer = 0
    ufoTimer = 0
    playerHitTimer = 0
    audio.stopUFOHum()
    audio.playLevelClear()
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
      const target = shields.filter(s => s.hp > 0).sort((a, b) => a.hp - b.hp)[0]
      if (target) target.hp = 4
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  function onKeyDown(e: KeyboardEvent) {
    audio.initAudio()
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
        audio.playShoot()
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

  // ── Update ─────────────────────────────────────────────────────────────────

  function update(dt: number) {
    if (gameState.value !== 'playing') return

    shootCooldown -= dt
    if (shootCooldown <= 0) canShoot = true

    playerHitTimer = Math.max(0, playerHitTimer - dt)

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

    // Bullets movement
    playerBullets = playerBullets.filter(b => b.y + b.h > 0)
    for (const b of playerBullets) b.y += b.dy
    alienBullets = alienBullets.filter(b => b.y < H)
    for (const b of alienBullets) b.y += b.dy

    // Power-ups movement
    powerUps = powerUps.filter(p => p.y < H)
    for (const p of powerUps) p.y += p.dy

    // Alien stepping
    alienStepTimer += dt
    if (alienStepTimer >= currentStepInterval) {
      alienStepTimer = 0
      alienDir = stepAliens(aliens, alienDir)
    }

    // Alien firing
    alienFireTimer += dt
    if (alienFireTimer >= ALIEN_FIRE_INTERVAL) {
      alienFireTimer = 0
      const bullet = fireAlien(aliens)
      if (bullet) alienBullets.push(bullet)
    }

    // UFO
    ufoTimer += dt
    if (ufoTimer >= UFO_INTERVAL && !ufo.active) {
      ufoTimer = 0
      ufo.active = true
      ufo.dx = Math.random() > 0.5 ? UFO_SPEED : -UFO_SPEED
      ufo.x = ufo.dx > 0 ? -UFO_W : W
      audio.startUFOHum()
    }
    if (ufo.active) {
      ufo.x += ufo.dx
      if (ufo.x > W + UFO_W || ufo.x < -UFO_W * 2) {
        ufo.active = false
        audio.stopUFOHum()
      }
    }

    // Alien animation frame toggle
    for (const a of aliens) {
      if (a.alive) a.animFrame = alienStepTimer < currentStepInterval / 2 ? 0 : 1
    }

    // Explosions
    explosions = explosions.filter(e => e.t > 0)
    for (const e of explosions) e.t -= dt

    // ── Collisions ──────────────────────────────────────────────────────────

    // Player bullets vs aliens & UFO & shields
    for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
      const b = playerBullets[bi]!
      let hit = false

      if (ufo.active && collide(b, ufo)) {
        ufo.active = false
        audio.stopUFOHum()
        score.value += 150
        explosions.push({ x: ufo.x + UFO_W / 2, y: ufo.y + UFO_H / 2, t: 400 })
        audio.playExplosion()
        playerBullets.splice(bi, 1)
        continue
      }

      for (const a of aliens) {
        if (!a.alive) continue
        if (collide(b, a)) {
          a.alive = false
          explosions.push({ x: a.x + a.w / 2, y: a.y + a.h / 2, t: 400 })
          score.value += a.type === 2 ? 30 : a.type === 1 ? 20 : 10
          playerBullets.splice(bi, 1)
          hit = true
          currentStepInterval = speedUpAliens(aliens, waveStepInterval())
          audio.playExplosion()
          if (Math.random() < POWER_UP_DROP_CHANCE) spawnPowerUp(a)
          break
        }
      }
      if (hit) continue

      for (const s of shields) {
        if (s.hp > 0 && collide(b, s)) {
          s.hp--
          playerBullets.splice(bi, 1)
          break
        }
      }
    }

    // Alien bullets vs player & shields
    for (let bi = alienBullets.length - 1; bi >= 0; bi--) {
      const b = alienBullets[bi]!
      let hit = false

      if (playerHitTimer <= 0 && collide(b, player)) {
        alienBullets.splice(bi, 1)
        loseLife()
        hit = true
      }
      if (hit) continue

      for (const s of shields) {
        if (s.hp > 0 && collide(b, s)) {
          s.hp--
          alienBullets.splice(bi, 1)
          break
        }
      }
    }

    // Power-ups vs player
    for (let pi = powerUps.length - 1; pi >= 0; pi--) {
      const p = powerUps[pi]!
      if (collide(p, player)) {
        applyPowerUp(p.type)
        powerUps.splice(pi, 1)
      }
    }

    // Aliens reached bottom
    for (const a of aliens) {
      if (a.alive && a.y + a.h >= player.y) {
        endGame(false)
        return
      }
    }

    // Wave clear
    if (aliens.every(a => !a.alive)) {
      nextWave()
    }
  }

  function loseLife() {
    lives.value--
    playerHitTimer = PLAYER_HIT_DURATION
    explosions.push({ x: player.x + PLAYER_W / 2, y: player.y + PLAYER_H / 2, t: 600 })
    alienBullets = []
    if (lives.value <= 0) endGame(false)
  }

  function endGame(won: boolean) {
    if (score.value > hiScore.value) {
      hiScore.value = score.value
      localStorage.setItem('si-hiscore', String(score.value))
    }
    audio.stopUFOHum()
    if (!won) audio.playGameOver()
    gameState.value = won ? 'win' : 'gameover'
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  function loop(time: number) {
    const dt = Math.min(time - lastTime, 50)
    lastTime = time
    update(dt)
    renderFrame(ctx, {
      player, playerBullets, alienBullets, aliens, shields, ufo, powerUps, explosions,
    }, {
      gameState: gameState.value,
      score: score.value,
      hiScore: hiScore.value,
      lives: lives.value,
      wave: wave.value,
      playerHitTimer,
      rapidTimer,
      doubleTimer,
    })
    rafId = requestAnimationFrame(loop)
  }

  function startGame() {
    initGame()
    gameState.value = 'playing'
    lastTime = performance.now()
  }

  // ── Canvas initialization ──────────────────────────────────────────────────

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

  // ── Cleanup ────────────────────────────────────────────────────────────────

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    audio.close()
  })

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (isMuted.value) audio.stopUFOHum()
  }

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
