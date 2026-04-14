import type { Rect, Alien, Shield, Bullet, Boss } from './types'
import {
  W, H,
  ALIEN_COLS, ALIEN_W, ALIEN_H, ALIEN_PAD_X, ALIEN_PAD_Y,
  ALIEN_STEP, ALIEN_DROP,
  SHIELD_COUNT,
  BULLET_W, BULLET_H, ALIEN_BULLET_SPEED,
  BOSS_W, BOSS_H, BOSS_HP, BOSS_SPEED_X, BOSS_SPEED_Y,
} from './constants'

export function collide(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function makeShields(): Shield[] {
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

export function makeAliens(rows: number): Alien[] {
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

/**
 * Moves the alien formation one step. Mutates aliens in place.
 * Returns the new alienDir (may flip if wall hit).
 */
export function stepAliens(aliens: Alien[], alienDir: number): number {
  const living = aliens.filter(a => a.alive)
  if (living.length === 0) return alienDir

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
    return alienDir * -1
  } else {
    for (const a of aliens) a.x += ALIEN_STEP * alienDir
    return alienDir
  }
}

/**
 * Returns the new currentStepInterval based on remaining alien count.
 */
export function speedUpAliens(aliens: Alien[], baseInterval: number): number {
  const remaining = aliens.filter(a => a.alive).length
  const ratio = remaining / aliens.length
  return Math.max(100, baseInterval * ratio)
}

export function spawnBoss(): Boss {
  return {
    x: W / 2 - BOSS_W / 2,
    y: 50,
    w: BOSS_W,
    h: BOSS_H,
    dx: BOSS_SPEED_X,
    dy: BOSS_SPEED_Y,
    hp: BOSS_HP,
    hitFlashTimer: 0,
  }
}

export function fireBoss(boss: Boss): Bullet {
  return {
    x: boss.x + boss.w / 2 - BULLET_W / 2,
    y: boss.y + boss.h,
    w: BULLET_W,
    h: BULLET_H,
    dy: ALIEN_BULLET_SPEED,
  }
}

/**
 * Fires a bullet from the bottom alien in a random column.
 * Returns a new Bullet or null if no living aliens.
 */
export function fireAlien(aliens: Alien[]): Bullet | null {
  const living = aliens.filter(a => a.alive)
  if (living.length === 0) return null

  const colMap: Map<number, Alien> = new Map()
  for (const a of living) {
    const col = Math.round(a.x / (ALIEN_W + ALIEN_PAD_X))
    const existing = colMap.get(col)
    if (!existing || a.y > existing.y) colMap.set(col, a)
  }
  const bottomRow = Array.from(colMap.values())
  const shooter = bottomRow[Math.floor(Math.random() * bottomRow.length)]
  if (!shooter) return null

  return {
    x: shooter.x + shooter.w / 2 - BULLET_W / 2,
    y: shooter.y + shooter.h,
    w: BULLET_W,
    h: BULLET_H,
    dy: ALIEN_BULLET_SPEED,
  }
}
