import { getDocsMap } from './yjsRelay.js';

interface RoomInfo {
  lastActivity: number;
}

const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

const rooms = new Map<string, RoomInfo>();

/**
 * Mark a room as active (update its last activity timestamp).
 */
export function touchRoom(roomId: string): void {
  rooms.set(roomId, { lastActivity: Date.now() });
}

/**
 * Check if a room has expired (no activity for 2+ hours).
 */
export function isRoomExpired(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  return Date.now() - room.lastActivity > EXPIRY_MS;
}

/**
 * Get the count of tracked rooms.
 */
export function getRoomCount(): number {
  return rooms.size;
}

/**
 * Clean up rooms that have been idle for more than 2 hours.
 * Also removes the corresponding Y.Doc from the y-websocket docs map.
 */
export function cleanupExpiredRooms(): void {
  const now = Date.now();
  const docsMap = getDocsMap();

  for (const [roomId, info] of rooms.entries()) {
    if (now - info.lastActivity > EXPIRY_MS) {
      rooms.delete(roomId);

      // Destroy the Y.Doc if it exists
      const doc = docsMap.get(roomId);
      if (doc && typeof doc === 'object' && 'destroy' in doc) {
        (doc as { destroy: () => void }).destroy();
      }
      docsMap.delete(roomId);

      console.log(`Room expired and cleaned up: ${roomId}`);
    }
  }
}

/**
 * Start the periodic cleanup interval.
 * Returns the interval handle for cleanup.
 */
export function startCleanupInterval(): ReturnType<typeof setInterval> {
  return setInterval(cleanupExpiredRooms, CLEANUP_INTERVAL_MS);
}
