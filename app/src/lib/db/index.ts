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
    dbPromise = openDB<{
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
  }
  return dbPromise
}

export const _resetDb = (): void => {
  dbPromise = null
}
