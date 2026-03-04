<script setup lang="ts">
import { ref } from 'vue'
import { useSpaceInvaders } from './composables/useSpaceInvaders'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const { isMuted, toggleMute } = useSpaceInvaders(canvasRef)
</script>

<template>
  <div class="game-wrapper">
    <div class="canvas-container">
      <canvas ref="canvasRef" />
      <button class="mute-btn" @click="toggleMute" :title="isMuted ? '取消靜音' : '靜音'">
        {{ isMuted ? '🔇' : '🔊' }}
      </button>
    </div>
    <p class="hint">← → Move &nbsp;|&nbsp; Space Shoot &nbsp;|&nbsp; P Pause</p>
  </div>
</template>

<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.canvas-container {
  position: relative;
}

canvas {
  display: block;
  border: 2px solid #1a3a2a;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.15);
  max-width: 100vw;
  max-height: 90vh;
  image-rendering: pixelated;
}

.mute-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
}

.mute-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hint {
  color: #444;
  font: 12px 'Courier New', monospace;
  letter-spacing: 0.05em;
}
</style>
