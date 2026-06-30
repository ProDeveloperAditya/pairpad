import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import { handleYjsConnection, getActiveDocCount } from './yjsRelay.js';
import { touchRoom, getRoomCount, startCleanupInterval } from './rooms.js';
import {
  executeCode,
  pullImages,
  isDockerAvailable,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
} from './executor.js';
import type { ExecutionRequest } from './executor.js';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';

// ─── Express Setup ───
const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    rooms: getRoomCount(),
    activeDocs: getActiveDocCount(),
  });
});

// Docker availability health check
app.get('/health', async (_req, res) => {
  const dockerAvailable = await isDockerAvailable();
  res.status(dockerAvailable ? 200 : 503).json({
    status: dockerAvailable ? 'ok' : 'degraded',
    docker: dockerAvailable,
    rooms: getRoomCount(),
    activeDocs: getActiveDocCount(),
  });
});

// Code execution endpoint
app.post('/execute', async (req, res) => {
  const body = req.body as Partial<ExecutionRequest> | undefined;

  if (!body?.code || !body?.language) {
    res.status(400).json({ error: 'Missing required fields: code, language' });
    return;
  }

  if (!isSupportedLanguage(body.language)) {
    res.status(400).json({
      error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    });
    return;
  }

  try {
    const result = await executeCode({
      code: body.code,
      language: body.language,
    });
    res.json(result);
  } catch (executionError) {
    console.error('Execution error:', executionError);
    const code = (executionError as { code?: string } | undefined)?.code;
    const dockerDown = code === 'ECONNREFUSED' || code === 'ENOENT';
    res.status(dockerDown ? 503 : 500).json({
      error: dockerDown
        ? 'Execution service unavailable (Docker not reachable)'
        : 'Execution failed',
    });
  }
});

// ─── HTTP + WebSocket Server ───
const server = createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Parse room ID from URL path: /yjs/<roomId> or just /<roomId>
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Support both /yjs/roomId and /roomId
  let roomId: string;
  if (pathParts[0] === 'yjs' && pathParts[1]) {
    roomId = pathParts[1];
  } else if (pathParts[0]) {
    roomId = pathParts[0];
  } else {
    roomId = 'default';
  }

  // Track room activity
  touchRoom(roomId);

  // Wire up Yjs sync
  handleYjsConnection(ws, req, roomId);

  ws.on('message', () => {
    touchRoom(roomId);
  });

  ws.on('close', () => {
    touchRoom(roomId);
  });
});

// ─── Start ───
startCleanupInterval();

server.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │  PairPad Server                         │
  │  HTTP:      http://localhost:${PORT}       │
  │  WebSocket: ws://localhost:${PORT}         │
  │  CORS:      ${FRONTEND_URL}  │
  └─────────────────────────────────────────┘
  `);

  // Warm the execution images in the background so the first Run isn't slow.
  // Best-effort: if Docker isn't available, the /execute call will surface it.
  void (async () => {
    if (await isDockerAvailable()) {
      console.log('Docker detected — pulling execution images…');
      await pullImages();
    } else {
      console.warn('Docker not available — /execute will fail until Docker is running.');
    }
  })();
});
