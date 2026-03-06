export type GameState = 'idle' | 'playing' | 'paused' | 'gameover' | 'win'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Bullet extends Rect {
  dy: number // velocity: negative = up (player), positive = down (alien)
}

export interface Alien extends Rect {
  type: 0 | 1 | 2 // row group -> different sprite color
  alive: boolean
  animFrame: number // 0 or 1 for two-frame animation
}

export interface Shield extends Rect {
  hp: number
}

export interface UFO extends Rect {
  active: boolean
  dx: number
}

export interface PowerUp extends Rect {
  type: 'rapid' | 'double' | 'restore'
  dy: number
}

export interface Explosion {
  x: number
  y: number
  t: number
}
