import { AudioManager } from '../lib/audio/index'

let mockStart: ReturnType<typeof vi.fn>
let mockConnect: ReturnType<typeof vi.fn>
let mockGainValue: { value: number }
let mockDecodeAudioData: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockStart = vi.fn()
  mockConnect = vi.fn()
  mockGainValue = { value: 0 }
  mockDecodeAudioData = vi.fn().mockResolvedValue({} as AudioBuffer)

  const mockGain = { connect: vi.fn(), gain: mockGainValue }

  const mockCtx = {
    createGain: vi.fn(() => mockGain),
    createBufferSource: vi.fn(() => ({ connect: mockConnect, start: mockStart, buffer: null })),
    decodeAudioData: mockDecodeAudioData,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    state: 'running',
  }
  vi.stubGlobal('AudioContext', function MockAudioContext() { return mockCtx })

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('play() before load()', () => {
  it('does not throw', () => {
    const manager = new AudioManager()
    expect(() => manager.play()).not.toThrow()
  })

  it('does not start any audio source', () => {
    const manager = new AudioManager()
    manager.play()
    expect(mockStart).not.toHaveBeenCalled()
  })
})

describe('play() after load()', () => {
  it('starts an audio buffer source', async () => {
    const manager = new AudioManager()
    await manager.load('/chime.mp3')
    manager.play()
    expect(mockStart).toHaveBeenCalledOnce()
  })

  it('each call to play() starts a new source', async () => {
    const manager = new AudioManager()
    await manager.load('/chime.mp3')
    manager.play()
    manager.play()
    expect(mockStart).toHaveBeenCalledTimes(2)
  })
})

describe('load()', () => {
  it('fetches the provided URL', async () => {
    const manager = new AudioManager()
    await manager.load('/sounds/chime.mp3')
    expect(fetch).toHaveBeenCalledWith('/sounds/chime.mp3')
  })
})

describe('setVolume()', () => {
  it('does not throw when called before load', () => {
    const manager = new AudioManager()
    expect(() => manager.setVolume(0.3)).not.toThrow()
  })

  it('updates gain node value after load', async () => {
    const manager = new AudioManager()
    await manager.load('/chime.mp3')
    manager.setVolume(0.5)
    expect(mockGainValue.value).toBe(0.5)
  })

  it('volume set before load is applied once load completes', async () => {
    const manager = new AudioManager()
    manager.setVolume(0.4)
    await manager.load('/chime.mp3')
    expect(mockGainValue.value).toBe(0.4)
  })
})
