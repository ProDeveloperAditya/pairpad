# PairPad

**Real-time collaborative code execution environment.** Share a URL, type code together in a Monaco editor with live multi-cursor presence, then hit **Run** to execute it in an isolated Docker container and see the output. No login — generate a room, share the link, code.

Two people on two laptops can edit the same file simultaneously; their edits merge without conflict, and either can run the code in a sandbox.

---

## Features

- **Real-time collaborative editing** via [Yjs](https://yjs.dev) CRDTs — concurrent edits never conflict, even on poor networks
- **Live presence** — every user gets a color + name (editable), shown as a labeled cursor in the editor and a presence bar
- **Sandboxed code execution** in Docker with strict resource limits
- **Multiple languages** — Python, JavaScript (Node), C, C++, Java, Ruby, Go
- **No database** — rooms live in memory and expire after 2 hours idle
- **Glassmorphism UI** with light/dark themes, command palette (⌘J), and animated states

---

## Architecture

```
┌─────────────┐   Yjs sync (WebSocket, binary updates)   ┌──────────────────┐
│  Browser A  │ <--------------------------------------> │                  │
│  (Monaco +  │                                          │   Backend        │
│   Yjs)      │            POST /execute                 │   (Node + ws +   │
├─────────────┤ ---------------------------------------> │    y-websocket)  │
│  Browser B  │ <--------------------------------------> │                  │
└─────────────┘                                          └────────┬─────────┘
   (Vercel)                                                       │ dockerode
                                                          ┌───────▼─────────┐
                                                          │ Docker container │
                                                          │ (per execution)  │
                                                          └──────────────────┘
                                                              (Oracle Cloud)
```

### What is a CRDT, and why it beats Socket.IO broadcasting

A **CRDT (Conflict-free Replicated Data Type)** is a data structure that can be edited independently on many replicas and always converges to the same state — without a central server resolving conflicts. **Yjs** is a high-performance CRDT for JavaScript; it represents the document as a set of operations that can be applied in any order and still produce an identical result.

Most collaborative editors (e.g. the popular [Code-Sync](https://github.com/sahilatahar/Code-Sync)) instead **broadcast edits with Socket.IO** — effectively "last write wins." That approach has real problems PairPad avoids:

| Aspect | Socket.IO broadcasting | Yjs CRDTs (PairPad) |
|---|---|---|
| **Conflict resolution** | None — concurrent edits can be lost | Automatic — all edits merge deterministically |
| **Network tolerance** | Needs a constant connection | Works offline; syncs on reconnect |
| **Server complexity** | Server must understand & transform document state | Server is a **dumb relay** — forwards binary updates |
| **Latency** | Every keystroke round-trips the server | Edits apply locally first (instant), then sync |
| **Scalability** | Server is the conflict-resolution bottleneck | Peer-capable; the relay is optional |

`y-websocket` is the sync layer: on the server, `setupWSConnection()` relays binary Yjs updates between clients; on the client, `WebsocketProvider` syncs the `Y.Doc` and provides the **Awareness** protocol for ephemeral state like cursor positions, names, and colors.

### Docker security model

User code is untrusted, so every execution runs in a throwaway container with defense in depth:

| Control | Setting | What it prevents |
|---|---|---|
| **Network** | `NetworkMode: 'none'` | No internet/network access — no exfiltration, no callbacks |
| **Memory** | 128 MB (256 MB for Java/Go), swap disabled | OOM-killed instead of starving the host |
| **CPU** | `CpuShares: 512` (~0.5 CPU) | Can't monopolize the host CPU |
| **Time** | 10s hard `SIGKILL` | Infinite loops are terminated |
| **Processes** | `PidsLimit: 128` | Mitigates fork bombs |
| **Lifecycle** | `AutoRemove: true` | Container is destroyed after it exits |
| **Input** | code base64-decoded to a file inside the container | No shell-injection ambiguity on the host |

A program that runs `rm -rf /` or `os.system(...)` only affects its own ephemeral container — **the server process is never touched.** Output is also capped at 1 MB per stream so a `while True: print(...)` loop can't exhaust server memory.

> The container is the security boundary. Code passes through the API as plain text, gets base64-encoded, and is decoded to a source file *inside* the sandbox — so shell metacharacters in user code are meaningless on the host.

---

## Project structure

```
pairpad/
├── apps/
│   ├── web/                 Vite + React + TypeScript frontend (→ Vercel)
│   │   └── src/
│   │       ├── pages/       Home, Room
│   │       ├── components/  Editor, Output, Presence, Toolbar, NameEditor, ui/
│   │       └── lib/         yjsClient, languages, theme
│   └── server/              Node + TypeScript backend (→ Oracle Cloud)
│       └── src/
│           ├── index.ts     Express + WebSocket entry point
│           ├── yjsRelay.ts  y-websocket relay (CRDT sync)
│           ├── executor.ts  Docker execution via dockerode
│           └── rooms.ts     In-memory room registry + 2h expiry
└── README.md
```

---

## Local development

**Prerequisites:** Node.js 20+. Docker is only needed on the machine that runs the **backend**, and only to actually execute code — collaboration works without it.

```bash
npm install

# Terminal 1 — backend (http + ws on :4000)
npm run dev:server

# Terminal 2 — frontend (Vite on :5173)
npm run dev:web
```

Open http://localhost:5173, click **New Room**, then open the room URL in a second tab to see live sync. Copy `.env.example` to `.env` in each app if you need to override URLs.

> **No Docker locally?** Everything works except the Run button, which will report *"Execution service unavailable (Docker not reachable)."* Install Docker Desktop to run code locally, or rely on the deployed backend.

### Language note

For **Java**, the public class must be named `Main` (the file is written as `Main.java`). Other languages have no naming constraints.

---

## Deployment ($0 / month)

### Frontend → Vercel (free)

1. Import the repo in Vercel and set **Root Directory** to `apps/web`.
2. Add Environment Variables pointing at your backend:
   - `VITE_WS_URL` = `wss://<backend-host>:4000`
   - `VITE_API_URL` = `https://<backend-host>:4000`
3. Deploy. SPA routing is handled by `apps/web/vercel.json`.

### Backend → Oracle Cloud Always Free ARM VM (free)

Oracle's Always Free tier gives a 4-core / 24 GB ARM VM at $0 forever (card for verification only). On the VM:

```bash
# Install Node 20 + Docker
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs docker.io
sudo usermod -aG docker $USER   # re-login after this

# Clone & build
git clone <your-repo-url> pairpad && cd pairpad
npm install
npm run build:server

# Run with PM2, set the CORS origin to your Vercel URL
sudo npm i -g pm2
FRONTEND_URL=https://<your-app>.vercel.app PORT=4000 \
  pm2 start "npm run start --workspace=apps/server" --name pairpad
pm2 save && pm2 startup
```

Open port 4000 in the VM's security list / firewall. The execution images are pulled automatically on first boot. (Alternatively, containerize the server with `apps/server/Dockerfile` — mount `/var/run/docker.sock` so it can spawn sibling containers.)

### Will this cost money?

No, within the free tiers. Adding languages only uses more of a **fixed** free allocation (disk/RAM on the Oracle VM), which isn't metered. The only ways the $0 breaks: exceeding Vercel's bandwidth (unlikely for this), or Oracle reclaiming an **idle** Always Free VM — avoided by keeping the server running.

---

## Environment variables

| App | Variable | Default | Purpose |
|---|---|---|---|
| server | `PORT` | `4000` | HTTP + WebSocket port |
| server | `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| web | `VITE_WS_URL` | `ws://localhost:4000` | Backend WebSocket URL |
| web | `VITE_API_URL` | `http://localhost:4000` | Backend HTTP URL |

---

## Tech stack

**Frontend:** Vite, React 18, TypeScript, Tailwind CSS v3, `@monaco-editor/react`, `yjs`, `y-websocket`, `y-monaco`, `motion`, `lucide-react`, `react-router-dom`

**Backend:** Node 20, TypeScript (`tsx`), `ws`, `y-websocket`, `dockerode`, `express`, `cors`
