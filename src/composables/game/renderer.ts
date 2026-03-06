import type { GameState, Alien, Shield, UFO, Bullet, PowerUp, Explosion, Rect } from './types'
import {
  W, H,
  PLAYER_W, PLAYER_H,
  ALIEN_W, ALIEN_H,
  UFO_W, UFO_H,
} from './constants'

export interface GameObjects {
  player: Rect
  playerBullets: Bullet[]
  alienBullets: Bullet[]
  aliens: Alien[]
  shields: Shield[]
  ufo: UFO
  powerUps: PowerUp[]
  explosions: Explosion[]
}

export interface GameUIState {
  gameState: GameState
  score: number
  hiScore: number
  lives: number
  wave: number
  playerHitTimer: number
  rapidTimer: number
  doubleTimer: number
}

const ALIEN_COLORS: Record<0 | 1 | 2, string> = { 0: '#ff6688', 1: '#ffaa00', 2: '#44aaff' }

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

export function draw(
  ctx: CanvasRenderingContext2D,
  objects: GameObjects,
  ui: GameUIState,
): void {
  const { player, playerBullets, alienBullets, aliens, shields, ufo, powerUps, explosions } = objects
  const { gameState, playerHitTimer, rapidTimer, doubleTimer } = ui

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

  if (gameState === 'idle') {
    drawTitleScreen(ctx, ui.hiScore)
    return
  }

  drawHUD(ctx, ui)

  // Shields
  for (const s of shields) {
    if (s.hp <= 0) continue
    const alpha = s.hp / 4
    ctx.fillStyle = `rgba(0, 220, 100, ${alpha})`
    ctx.fillRect(s.x, s.y, s.w, s.h)
    ctx.fillStyle = '#0a0a1a'
    const notch = 10
    ctx.fillRect(s.x, s.y + s.h - notch, notch, notch)
    ctx.fillRect(s.x + s.w - notch, s.y + s.h - notch, notch, notch)
  }

  // UFO
  if (ufo.active) drawUFO(ctx, ufo)

  // Aliens
  for (const a of aliens) {
    if (!a.alive) continue
    drawAlien(ctx, a)
  }

  // Player (blink when hit)
  if (playerHitTimer <= 0 || Math.floor(playerHitTimer / 150) % 2 === 0) {
    drawPlayer(ctx, player)
  }

  // Player bullets
  ctx.fillStyle = '#00ffff'
  for (const b of playerBullets) {
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

  // Active power-up indicators
  drawPowerUpIndicators(ctx, rapidTimer, doubleTimer)

  // Overlays
  if (gameState === 'paused') drawOverlay(ctx, 'PAUSED', 'Press P to resume', ui.score, ui.wave)
  if (gameState === 'gameover') drawOverlay(ctx, 'GAME OVER', 'Press Enter or Space to restart', ui.score, ui.wave)
  if (gameState === 'win') drawOverlay(ctx, 'YOU WIN!', 'Press Enter or Space to play again', ui.score, ui.wave, '#00ff88')
}

function drawHUD(ctx: CanvasRenderingContext2D, ui: GameUIState) {
  ctx.font = 'bold 16px "Courier New", monospace'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.fillText(`SCORE: ${String(ui.score).padStart(5, '0')}`, 16, 24)
  ctx.textAlign = 'center'
  ctx.fillText(`HI: ${String(ui.hiScore).padStart(5, '0')}`, W / 2, 24)
  ctx.textAlign = 'right'
  ctx.fillText('LIVES:', W - 100, 24)
  ctx.fillText(`WAVE: ${ui.wave}`, W - 16, 44)
  for (let i = 0; i < ui.lives; i++) {
    drawMiniPlayer(ctx, W - 90 + i * 24, 14)
  }
}

function drawPowerUpIndicators(ctx: CanvasRenderingContext2D, rapidTimer: number, doubleTimer: number) {
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

function drawMiniPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#00ff88'
  ctx.fillRect(x + 5, y, 8, 6)
  ctx.fillRect(x, y + 4, 18, 7)
  ctx.fillRect(x + 7, y - 3, 4, 5)
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Rect) {
  const { x, y } = player
  ctx.fillStyle = '#00ff88'
  ctx.fillRect(x + 4, y + 8, PLAYER_W - 8, PLAYER_H - 8)
  ctx.fillRect(x + PLAYER_W / 2 - 3, y, 6, 12)
  ctx.fillRect(x, y + 12, 10, 8)
  ctx.fillRect(x + PLAYER_W - 10, y + 12, 10, 8)
  ctx.shadowColor = '#00ff88'
  ctx.shadowBlur = 8
  ctx.fillRect(x + 4, y + 8, PLAYER_W - 8, PLAYER_H - 8)
  ctx.shadowBlur = 0
}

function drawAlien(ctx: CanvasRenderingContext2D, a: Alien) {
  const { x, y, type, animFrame } = a
  ctx.fillStyle = ALIEN_COLORS[type]

  if (type === 0) {
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

function drawUFO(ctx: CanvasRenderingContext2D, ufo: UFO) {
  const { x, y } = ufo
  ctx.fillStyle = '#ff00ff'
  ctx.shadowColor = '#ff00ff'
  ctx.shadowBlur = 10
  ctx.fillRect(x + 10, y + 8, UFO_W - 20, 10)
  ctx.fillRect(x + 16, y, UFO_W - 32, 10)
  ctx.fillRect(x + 4, y + 14, 8, 8)
  ctx.fillRect(x + UFO_W - 12, y + 14, 8, 8)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('150', x + UFO_W / 2, y - 4)
}

function drawTitleScreen(ctx: CanvasRenderingContext2D, hiScore: number) {
  ctx.textAlign = 'center'

  ctx.font = 'bold 52px "Courier New", monospace'
  ctx.fillStyle = '#00ff88'
  ctx.shadowColor = '#00ff88'
  ctx.shadowBlur = 20
  ctx.fillText('SPACE', W / 2, 160)
  ctx.fillText('INVADERS', W / 2, 220)
  ctx.shadowBlur = 0

  const previewAliens = [
    { type: 2, label: '= 30 pts', color: '#44aaff' },
    { type: 1, label: '= 20 pts', color: '#ffaa00' },
    { type: 0, label: '= 10 pts', color: '#ff6688' },
  ]
  previewAliens.forEach((pa, i) => {
    const ax = W / 2 - 60
    const ay = 270 + i * 50
    const fakeAlien: Alien = { x: ax, y: ay, w: ALIEN_W, h: ALIEN_H, type: pa.type as 0 | 1 | 2, alive: true, animFrame: 0 }
    drawAlien(ctx, fakeAlien)
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(pa.label, ax + ALIEN_W + 12, ay + ALIEN_H / 2 + 5)
  })

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

  ctx.textAlign = 'center'
  ctx.font = '13px "Courier New", monospace'
  ctx.fillStyle = '#aaaaaa'
  ctx.fillText('← → / A D  Move    Space  Shoot    P  Pause', W / 2, 490)

  if (Math.floor(performance.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#ffff00'
    ctx.font = 'bold 20px "Courier New", monospace'
    ctx.fillText('PRESS ENTER OR SPACE TO START', W / 2, 540)
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = '14px "Courier New", monospace'
  ctx.fillText(`HI-SCORE: ${String(hiScore).padStart(5, '0')}`, W / 2, 580)
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  score: number,
  wave: number,
  color = '#ff4444',
) {
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
  ctx.fillText(`SCORE: ${score}`, W / 2, H / 2 + 70)

  ctx.font = '16px "Courier New", monospace'
  ctx.fillStyle = '#aaaaaa'
  ctx.fillText(`WAVE: ${wave}`, W / 2, H / 2 + 100)
}

