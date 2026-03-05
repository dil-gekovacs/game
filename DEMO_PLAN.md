# Demo Plan — Sub-5-Hour Path to Playable Demo

---

## Part 1: Network Analysis (DiligentWlan)

### Machine Specs

| Spec | Value |
|---|---|
| Machine | MacBook Pro 18,1 (M1 Pro, 10-core, 32GB RAM) |
| OS | Darwin 24.6.0 (macOS Sequoia) |
| Node.js | v24.1.0 |
| Go | 1.24.0 (darwin/arm64) |
| Vite | 7.3.1 |

All required tooling is already installed. No setup time needed.

### WiFi Network Details

| Setting | Value |
|---|---|
| Interface | en0 (Wi-Fi) |
| IP Address | 10.36.17.126 |
| Subnet | 10.36.16.0/23 (255.255.254.0) — 512 addresses |
| Gateway | 10.36.16.1 |
| DNS | 10.36.24.50, 10.36.24.52, 10.30.24.117, 10.30.24.118 (internal corporate DNS) |
| DNS search domain | boardbooks.com |
| DHCP | Yes |
| PHY Mode | 802.11ax (Wi-Fi 6) |
| Channel | 116 (5GHz, **20MHz** width) |
| Security | **WPA2 Enterprise** |
| Signal / Noise | -63 dBm / -96 dBm (SNR: 33 dB — decent) |
| Transmit Rate | 229–258 Mbps |
| MCS Index | 9–10 |
| Proxy | None configured |
| IPv6 | None |

### Network Constraints

**Channel width: 20MHz** — This is the main throughput limiter. The AP is configured for 20MHz channels (likely to maximize client density in an enterprise environment). Max theoretical throughput is ~287 Mbps on Wi-Fi 6 with MCS 10. Real-world usable is ~100–150 Mbps. For our game (< 50 KB/s total), this is a non-issue.

**WPA2 Enterprise** — This is the biggest concern for multiplayer. Enterprise networks commonly enable:
- **Client isolation (AP isolation)**: Prevents WiFi clients from communicating directly with each other. Traffic must route through the corporate network infrastructure instead of being forwarded at the AP.
- **Port filtering**: Corporate firewalls may block non-standard ports.
- **802.1X authentication**: Each device authenticates individually — no shared PSK.

### Client Isolation Test Results

```
Peer 10.36.16.83:  avg 44ms, 0% loss — REACHABLE
Peer 10.36.17.155: avg 44ms, 0% loss — REACHABLE
Gateway 10.36.16.1: avg 7ms, 0% loss
```

**Client isolation is NOT enabled.** Peers on the same subnet are reachable. However, the peer-to-peer latency is **high** — 26–62ms between WiFi clients compared to 3–5ms to the gateway. This is typical of enterprise WiFi where traffic between clients is routed through the AP/controller rather than forwarded directly.

### Port Binding Test

Binding to `0.0.0.0:8080` and `10.36.17.126:8080` both succeeded. The OS does not restrict server socket creation on arbitrary ports.

### Firewall Status

macOS Application Firewall state could not be read (no sudo, `defaults` key not present). However, the port binding test succeeded, and existing services already listen on `0.0.0.0` (clamd on 3310, beam.smp/RabbitMQ on multiple ports, ssh tunnels on 9042/8910). This strongly suggests the firewall allows incoming connections or is disabled.

### Latency Analysis for Multiplayer

| Path | Latency | Jitter | Acceptable? |
|---|---|---|---|
| Gateway (10.36.16.1) | 3–19ms, avg 7ms | ~6ms stddev | Yes |
| WiFi peer-to-peer | 26–62ms, avg 44ms | ~15ms stddev | Marginal |

For a game server running on this machine with two other players connecting from the same WiFi network:
- Client 1 (local): 0ms latency
- Client 2 (WiFi peer): ~30–60ms RTT
- Client 3 (WiFi peer): ~30–60ms RTT

With client prediction and 80–120ms interpolation buffer, 30–60ms RTT is playable but not ideal. The **jitter** (15ms stddev) is the real concern — it causes inconsistent interpolation timing. Occasional spikes to 60ms+ on a 20MHz enterprise channel under load are expected.

### Multiplayer Demo Verdict

| Scenario | Feasibility | Notes |
|---|---|---|
| **Single machine, multiple browser tabs** | Excellent | 0ms latency, perfect for demo |
| **3 laptops on DiligentWlan** | Possible but risky | 30–60ms RTT, 15ms jitter, enterprise network may throttle game traffic |
| **Localhost + 1 remote peer** | Good compromise | 1 player local + 1 player on WiFi = easier to demo |

**Recommendation for demo day:** Run the Go server on this machine. Demo with **multiple browser tabs on localhost** (proves the multiplayer architecture works with 0ms latency). If time permits, test with a second laptop on the same network — it will work but the feel will be noticeably less crisp.

If a true multi-machine demo is important, consider:
1. A USB-C Ethernet switch between laptops (sub-1ms latency, no WiFi jitter)
2. A personal hotspot from a phone (often lower latency than enterprise WiFi)
3. Running all 3 clients on this machine in separate browser windows (32GB RAM is plenty)

---

## Part 2: 5-Hour Demo Plan

### What the demo shows

A single screen (Zelda-style room) with:
- One player character (Knight) moving with WASD
- Tile-based map rendered via PixiJS
- A Go server running the authoritative simulation
- WebSocket connection between browser and server
- Server-authoritative movement (client sends input, server responds with position)
- 2–3 simple enemies that move in basic patterns (server-controlled)
- Basic melee attack (left click) with hit detection
- Health bars on player and enemies
- Enemies die when health reaches 0

This demonstrates: real-time multiplayer architecture, server-authoritative movement, WebSocket networking, PixiJS rendering, and the combat foundation.

### What the demo does NOT include (cut for time)

- Client-side prediction/reconciliation (server-authoritative with direct rendering is enough for demo)
- Full class roster (Knight, Mage, Cleric, Ranger)
- Secondary ability / parry
- Items/equipment
- Multiple rooms/screen transitions
- Sound
- Polished art (colored rectangles or minimal placeholder sprites)

### Hour-by-hour breakdown

#### Hour 1: Project scaffolding + rendering (0:00–1:00)

**Frontend (Vite + TypeScript + PixiJS):**
- `npm create vite@latest` with TypeScript template in `frontend/`
- Install PixiJS: `npm install pixi.js`
- Create PixiJS Application, attach to DOM
- Load a placeholder tileset (16x16 colored tiles or a free NES-style tileset)
- Render a single hardcoded Zelda-sized room (16x11 tiles) from a 2D array
- Render a player sprite (colored rectangle or simple spritesheet) at a position

**Backend (Go):**
- `go mod init` in `backend/`
- Basic HTTP server serving static files
- WebSocket upgrade endpoint using `nhooyr.io/websocket` (or `gorilla/websocket`)
- Accept connections, log "player connected"

**Deliverable:** Browser shows a tile map with a square on it. Go server runs and accepts WebSocket connections.

#### Hour 2: Input + server-authoritative movement (1:00–2:00)

**Frontend:**
- Capture WASD keydown/keyup, store input state
- Each frame, send current input state to server via WebSocket (JSON: `{type: "input", moveX, moveY}`)
- Receive position updates from server, move player sprite to server position

**Backend:**
- Parse incoming input messages
- Game loop: `time.NewTicker(33ms)` — 30 Hz
- Each tick: read latest input per player, update position (speed * direction * dt), clamp to map bounds
- Broadcast world state to all clients (JSON: `{type: "snapshot", entities: [{id, x, y, type}]}`)

**Deliverable:** WASD moves the character. Movement is processed by the server and rendered by the client. Opening a second browser tab shows two players moving independently.

#### Hour 3: Enemies + basic AI (2:00–3:00)

**Backend:**
- Spawn 2–3 enemy entities at fixed positions
- Simple AI: patrol (walk back and forth) or chase (move toward nearest player within range)
- Enemies included in world snapshot broadcasts

**Frontend:**
- Render enemy sprites (different color rectangles or simple sprites)
- Interpolate enemy positions between snapshots for smooth movement
- Add basic health bar rendering (thin rectangle above entities)

**Deliverable:** Enemies move around the room. Multiple browser tabs show all players and enemies in sync.

#### Hour 4: Combat — melee attack + hit detection (3:00–4:00)

**Frontend:**
- Left click sends attack input to server: `{type: "input", ..., primary: true, aimAngle}`
- Play a simple attack animation (sprite flash or a brief hitbox visual)
- Receive damage events from server, update health bars
- Show enemy death (remove sprite when health <= 0)

**Backend:**
- When player input has `primary: true`, create a melee hitbox in the aim direction
- Check hitbox overlap with enemies (AABB)
- Apply damage, broadcast damage event
- Remove enemy entity when health <= 0
- Add attack cooldown (prevent spam)

**Deliverable:** Click to attack enemies. Enemies take damage and die. Health bars update in real-time.

#### Hour 5: Polish + tile collision + demo prep (4:00–5:00)

**Backend:**
- Add tile collision: mark certain tiles as solid, prevent player/enemy movement through walls
- Add enemy respawn after a delay (or just have enough enemies)

**Frontend:**
- Add a wall/obstacle layer to the tilemap
- Basic camera/viewport if needed (probably not — single screen)
- Add a simple HUD: player health, maybe enemy count
- Visual polish: different colored tiles for floor/wall, different colors per entity type
- Test with 2–3 browser tabs simultaneously

**Deliverable:** Playable demo. Walk around a room, fight enemies, walls block movement, multiple browser tabs show synchronized multiplayer.

### Risk buffer

The plan is designed for ~4.5 hours with 30 minutes of buffer. The most likely time sink is:
- WebSocket message serialization bugs (JSON parsing mismatches between Go and TS)
- Coordinate system mismatches (PixiJS vs server coordinates)
- Game loop timing issues

If running behind, cut enemies (Hour 3) to just 1 stationary enemy and skip AI patrolling.

### File structure after demo

```
frontend/
  src/
    main.ts          — Vite entry, PixiJS app init
    renderer.ts      — Tilemap + entity rendering
    input.ts         — WASD + mouse capture
    network.ts       — WebSocket client, message handling
    types.ts         — Shared message types
  index.html
  package.json
  tsconfig.json
  vite.config.ts

backend/
  main.go            — HTTP server, WebSocket, game loop
  game.go            — Entity state, tick logic, collision
  go.mod
```

Intentionally flat. No premature package splitting for a 5-hour demo.
