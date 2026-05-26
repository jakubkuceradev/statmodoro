import { isGranted, requestPermission, notify } from '../lib/notifications/index'

type MockNotification = ReturnType<typeof vi.fn> & {
  permission: NotificationPermission
  requestPermission: ReturnType<typeof vi.fn>
}

let MockNotification: MockNotification

beforeEach(() => {
  MockNotification = Object.assign(vi.fn(), {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(),
  })
  vi.stubGlobal('Notification', MockNotification)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isGranted()', () => {
  it('returns false when permission is "default"', () => {
    MockNotification.permission = 'default'
    expect(isGranted()).toBe(false)
  })

  it('returns false when permission is "denied"', () => {
    MockNotification.permission = 'denied'
    expect(isGranted()).toBe(false)
  })

  it('returns true when permission is "granted"', () => {
    MockNotification.permission = 'granted'
    expect(isGranted()).toBe(true)
  })
})

describe('requestPermission()', () => {
  it('delegates to Notification.requestPermission', async () => {
    MockNotification.requestPermission.mockResolvedValue('granted')
    await requestPermission()
    expect(MockNotification.requestPermission).toHaveBeenCalledOnce()
  })

  it('returns true when browser grants permission', async () => {
    MockNotification.requestPermission.mockResolvedValue('granted')
    expect(await requestPermission()).toBe(true)
  })

  it('returns false when browser denies permission', async () => {
    MockNotification.requestPermission.mockResolvedValue('denied')
    expect(await requestPermission()).toBe(false)
  })

  it('returns false when browser dismisses the prompt ("default")', async () => {
    MockNotification.requestPermission.mockResolvedValue('default')
    expect(await requestPermission()).toBe(false)
  })
})

describe('notify()', () => {
  it('creates a Notification with the given title and body when permission is granted', () => {
    MockNotification.permission = 'granted'
    notify('Statmodoro', 'Time to rest!')
    expect(MockNotification).toHaveBeenCalledWith('Statmodoro', expect.objectContaining({ body: 'Time to rest!' }))
  })

  it('does not create a Notification when permission is "default"', () => {
    MockNotification.permission = 'default'
    notify('Statmodoro', 'Time to rest!')
    expect(MockNotification).not.toHaveBeenCalled()
  })

  it('does not create a Notification when permission is "denied"', () => {
    MockNotification.permission = 'denied'
    notify('Statmodoro', 'Time to rest!')
    expect(MockNotification).not.toHaveBeenCalled()
  })
})
