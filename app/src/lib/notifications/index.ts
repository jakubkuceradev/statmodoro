export const isGranted = (): boolean =>
  typeof Notification !== 'undefined' && Notification.permission === 'granted'

export const requestPermission = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export const notify = (title: string, body: string): void => {
  if (!isGranted()) return
  new Notification(title, { body })
}
