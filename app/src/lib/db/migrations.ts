import type { SessionRecord } from '../../types/session'

export const migrate = (record: any): SessionRecord => {
  // v1 is the only version; pass through unchanged.
  // Future versions: add migration branches here, incrementing schemaVersion.
  return record as SessionRecord
}
