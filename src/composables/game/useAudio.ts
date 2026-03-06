import type { Ref } from 'vue'

export function useAudio(isMuted: Ref<boolean>) {
  let audioCtx: AudioContext | null = null
  let ufoHumNode: OscillatorNode | null = null

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

  function close() {
    stopUFOHum()
    void audioCtx?.close()
  }

  return { initAudio, playShoot, playExplosion, startUFOHum, stopUFOHum, playLevelClear, playGameOver, close }
}
