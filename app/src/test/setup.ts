import '@testing-library/jest-dom'
import { audioManager } from '../lib/audio/index'

// Prevent real audio loading in tests that don't mock the audio module.
// notifications-integration.test.tsx overrides this with vi.mock() for
// spy-able assertions.
vi.spyOn(audioManager, 'load').mockResolvedValue(undefined)
