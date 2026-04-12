const STORAGE_KEY = 'atlas_last_seen'

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function markSeen(uuid: string, time: number) {
  const map = read()
  map[uuid] = time
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getLastSeen(uuid: string): number | null {
  return read()[uuid] ?? null
}

export function hasUnread(uuid: string, lastMessageAt: Date | string | null | undefined): boolean {
  if (!lastMessageAt) return false
  const lastSeen = getLastSeen(uuid)
  const lastMessageTime = new Date(lastMessageAt).getTime()
  if (lastSeen === null) return true
  return lastMessageTime > lastSeen
}
