import { openDB, type IDBPDatabase } from 'idb'
import type { SessionRecord } from '../../types/session'

const DB_NAME = 'statmodoro'
const DB_VERSION = 1

type StatmodoroDb = IDBPDatabase<{
  sessions: {
    key: string
    value: SessionRecord
    indexes: { 'by-started-at': number; 'by-session-type': string }
  }
}>

let dbPromise: Promise<StatmodoroDb> | null = null

export const getDb = (): Promise<StatmodoroDb> => {
  if (!dbPromise) {
    const p = openDB<{
      sessions: {
        key: string
        value: SessionRecord
        indexes: { 'by-started-at': number; 'by-session-type': string }
      }
    }>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' })
          store.createIndex('by-started-at', 'startedAt')
          store.createIndex('by-session-type', 'sessionType')
        }
      },
    })
    dbPromise = p
    // Clear the cached promise on failure so the next call can retry rather
    // than permanently returning a rejected promise (e.g. IDB unavailable).
    p.catch(() => { if (dbPromise === p) dbPromise = null })
  }
  return dbPromise
}

export const _resetDb = (): void => {
  dbPromise = null
}
