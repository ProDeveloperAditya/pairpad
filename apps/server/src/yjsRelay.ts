import { createRequire } from 'module';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';

// y-websocket/bin/utils is a CommonJS module, need createRequire in ESM context
const require = createRequire(import.meta.url);
const utils = require('y-websocket/bin/utils') as {
  setupWSConnection: (conn: WebSocket, req: IncomingMessage, options?: { docName?: string }) => void;
  docs: Map<string, unknown>;
};

/**
 * Handle a new WebSocket connection for Yjs CRDT sync.
 * This wires up the y-websocket relay protocol:
 * 1. Gets or creates a Y.Doc for the given room
 * 2. Registers the WebSocket connection
 * 3. Handles Yjs sync protocol (sync step 1 & 2) and awareness updates
 * 4. Cleans up when the connection closes
 */
export function handleYjsConnection(
  ws: WebSocket,
  req: IncomingMessage,
  roomId: string
): void {
  utils.setupWSConnection(ws, req, { docName: roomId });
}

/**
 * Returns the number of active Yjs documents (rooms with at least one connection).
 */
export function getActiveDocCount(): number {
  return utils.docs.size;
}

/**
 * Checks if a specific room document exists in memory.
 */
export function hasDoc(roomId: string): boolean {
  return utils.docs.has(roomId);
}

/**
 * Returns the internal docs map for room cleanup purposes.
 */
export function getDocsMap(): Map<string, unknown> {
  return utils.docs;
}
