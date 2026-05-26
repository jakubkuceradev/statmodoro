export class AudioManager {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private buffer: AudioBuffer | null = null
  private pendingVolume: number | null = null

  async load(url: string): Promise<void> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    this.ctx = new AudioContext()
    this.gainNode = this.ctx.createGain()
    this.gainNode.connect(this.ctx.destination)
    if (this.pendingVolume !== null) {
      this.gainNode.gain.value = this.pendingVolume
      this.pendingVolume = null
    }
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer)
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    } else {
      this.pendingVolume = volume
    }
  }

  play(): void {
    if (!this.ctx || !this.buffer || !this.gainNode) return
    const source = this.ctx.createBufferSource()
    source.buffer = this.buffer
    source.connect(this.gainNode)
    source.start()
  }
}

export const audioManager = new AudioManager()
