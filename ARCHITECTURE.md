# Multiplayer Browser Game — Technical Investigation & Architecture Proposal

---

## 1. Multiplayer Networking Model Analysis

### 1.1 Model Comparison

There are three primary networking models for real-time multiplayer games:

| Model | Description | Latency Tolerance | Complexity | Best For |
|---|---|---|---|---|
| **Lockstep** | All clients simulate same inputs in sync | Low tolerance for jitter | Medium | RTS, fighting games |
| **Server Authoritative + Client Prediction** | Server owns state, clients predict locally | High tolerance | High | Action games, FPS, ARPGs |
| **Rollback (GGPO-style)** | Clients simulate ahead, rollback on mismatch | Very high tolerance | Very high | Fighting games, 1v1 |

**Recommendation: Server Authoritative with Client-Side Prediction**

Rationale:
- **Lockstep** fails with 3 players because it runs at the speed of the slowest connection. One player with 150ms ping degrades the experience for everyone. It also makes enemy AI synchronization trivial (deterministic) but at a huge latency cost.
- **Rollback** is excellent for 2-player fighting games but scales poorly to 3 players with shared enemy AI state. Rolling back dozens of AI entities, projectiles, and environmental effects across 3 divergent timelines is extremely complex.
- **Server authoritative** is the industry standard for this type of game. The server runs the canonical simulation. Clients send inputs, predict locally, and reconcile when the server corrects them. This naturally handles enemy AI (server-owned), projectiles, and 3-player interactions.

### 1.2 Client-Side Prediction & Reconciliation

For responsive combat (Dead Cells feel), client prediction is **mandatory**. Without it, every action has a round-trip delay (50–150ms typically), which makes melee combat feel sluggish.

**How it works:**

1. Client presses attack → immediately plays animation and applies predicted effect locally
2. Client sends input to server with a sequence number and timestamp
3. Server processes input against authoritative state, broadcasts result
4. Client receives server state → compares against predicted state
5. If mismatch → client rewinds to last confirmed server state and replays unconfirmed inputs

**What to predict:**
- Player movement (high priority — most noticeable)
- Player attack animations (visual only; damage confirmed by server)
- Ability cooldowns

**What NOT to predict:**
- Enemy AI state
- Other players' health
- Loot drops
- Damage resolution (server authoritative)

### 1.3 Synchronization Strategy

**Delta compression** is essential. Instead of sending full game state every tick:

1. Server maintains a "last acknowledged state" per client
2. Each tick, server computes diff from client's last ack'd state
3. Only changed fields are sent
4. Client ACKs received snapshots

**Estimated bandwidth (3 players + ~20 enemies):**

Per entity snapshot (minimal):
- Entity ID: 2 bytes
- Position (x, y): 4 bytes (16-bit fixed point each)
- State flags (health, animation, facing): 4 bytes
- Velocity: 4 bytes
- **~14 bytes per entity**

With 3 players + 20 enemies + 10 projectiles = 33 entities:
- Full snapshot: ~462 bytes
- Delta (typically 30–50% change): ~150–230 bytes
- At 20 snapshots/sec: **3–4.6 KB/s per client** (binary), **~10–15 KB/s per client** (JSON dev)

This is well within browser WebSocket capacity.

### 1.4 Tick Rate Recommendation

| Tick Rate | Latency Budget | Suitability |
|---|---|---|
| 10 Hz | 100ms between updates | Turn-based or slow-paced |
| 20 Hz | 50ms between updates | Slow action RPGs |
| **30 Hz** | 33ms between updates | **Action RPGs, top-down combat** |
| 60 Hz | 16ms between updates | Competitive shooters |

**Recommendation: 30 Hz server tick rate, 60 FPS client rendering with interpolation.**

The client renders at 60 FPS and interpolates between the two most recent server snapshots. This gives smooth visuals without requiring high-frequency server updates. 30 Hz (33ms ticks) provides good granularity for parry timing — a 100ms parry window spans ~3 ticks, giving the server enough resolution to validate frame-precise mechanics. 20 Hz would be too coarse (only ~2 ticks per parry window). Snapshot send rate can be decoupled at 20 Hz with an **80–120ms interpolation buffer** for remote entities.

---

## 2. Frontend Analysis

### 2.1 Framework: React vs Vanilla JS

**React is definitively wrong for the game rendering layer.** Here's why:

- React's reconciliation algorithm (virtual DOM diffing) runs per frame if state changes. For a game updating 60 times/second with dozens of entities, this is pure overhead.
- React batches state updates and renders asynchronously — the opposite of what a game loop needs (deterministic, synchronous frame timing).
- React's event system adds ~2–4ms of indirection to input handling.

However, React is fine for **UI overlays** (inventory, menus, HUD) if desired. But for a small project, vanilla DOM manipulation for UI is simpler and avoids the dependency.

**Verdict: TypeScript for everything, built with Vite.** TypeScript's type system catches entity/component mismatches and network message schema errors that would otherwise be runtime bugs — essential for a project with shared state between client prediction and server authority. Vite provides near-instant HMR during development and efficient production builds with minimal configuration.

### 2.2 Rendering: Canvas 2D vs WebGL vs WebGPU

| Approach | Draw calls/frame | Sprite batching | Tilemap perf | Complexity | Browser support |
|---|---|---|---|---|---|
| **Canvas 2D** | Hundreds OK | Manual (drawImage) | Good for <1000 tiles | Low | Universal |
| **WebGL (via PixiJS)** | Thousands OK | Automatic batching | Excellent | Medium | Universal |
| **WebGL (raw)** | Thousands OK | Manual | Excellent | Very High | Universal |
| **WebGPU** | Massive | Automatic | Excellent | Very High | Chrome/Edge only (2026) |

**Analysis for this game:**

A Zelda-style screen is 16x11 tiles (176 tiles) + ~25 sprites (players, enemies, projectiles) + HUD elements. Total draw calls per frame: **~200–250**.

Canvas 2D could handle this, but **PixiJS (WebGL)** is the better choice:
- Automatic sprite batching reduces draw calls significantly
- Built-in spritesheet/texture atlas support
- Tilemap rendering via `@pixi/tilemap` or CompositeTilemap
- Future headroom for particle effects, hit flashes, and shader-based visual effects without an engine swap
- The API complexity cost over Canvas 2D is minimal — PixiJS abstracts WebGL boilerplate cleanly

**Verdict: PixiJS (WebGL) as the rendering layer.** It provides the right balance of performance headroom and API simplicity without the opinionated architecture of a full game engine like Phaser.

### 2.3 Engine vs Custom

| Option | Pros | Cons |
|---|---|---|
| **Phaser 3** | Full-featured, tilemap support, input handling, animation system, physics | 1MB+ bundle, opinionated architecture, abstractions may fight custom networking |
| **PixiJS** | Fast WebGL renderer, sprite batching, lightweight-ish | Renderer only — no physics, no tilemap, no game loop |
| **Custom Canvas 2D** | Full control, minimal overhead, no dependency, easy to integrate custom networking | Must build tilemap rendering, animation, collision yourself |
| **Three.js / Babylon.js** | 3D engines | Completely irrelevant for 2D pixel art |

**Deep comparison: Phaser vs Custom**

Phaser provides:
- Tilemap loader (Tiled JSON format) — saves ~2 days of work
- Sprite animation system — saves ~1 day
- Input manager — saves ~0.5 days
- Game loop with fixed timestep — saves ~0.5 days
- Arcade physics — partially useful but you'll override for server authoritative

Phaser costs:
- Learning Phaser's architecture and conventions
- Fighting Phaser's scene management when you need custom networking integration
- Bundle size (~1MB minified, ~300KB gzipped)
- Phaser's built-in physics assumes client authority — you'll need to bypass it for server-authoritative collision

**For a multiplayer game with server-authoritative physics, a game engine's built-in physics is mostly useless on the client side.** The client is just rendering what the server tells it, with prediction. Phaser's biggest value-add (physics) is the thing you least need.

**Verdict: PixiJS as renderer + custom gameplay layer.** PixiJS handles WebGL rendering, sprite batching, and texture management without imposing game architecture opinions. The game loop, ECS, input handling, and networking are all custom — giving full control where it matters for multiplayer. This avoids Phaser's opinionated scene management while still getting high-quality rendering out of the box.

### 2.4 ECS Architecture

An Entity-Component-System architecture is **beneficial but should be kept simple**.

For a game with ~30–50 entities and 3 players, a full ECS framework (bitECS, ECSY) is overkill. Instead, a minimal custom ECS:

```
Entity: just an integer ID
Components: plain objects in typed arrays or Maps
  - Position { x, y }
  - Velocity { vx, vy }
  - Sprite { pixiSprite, currentFrame, animation }
  - Health { current, max }
  - Input { moveX, moveY, primary, secondary }
  - NetworkSync { lastServerState, predictedState }
Systems: functions that iterate over entities with specific components
  - InputSystem
  - MovementSystem
  - AnimationSystem
  - PixiRenderSystem (syncs ECS state → PixiJS display objects)
  - NetworkSyncSystem
```

This provides clean separation between rendering, networking, and game logic — which is critical for multiplayer because you need to clearly separate "what the server says" from "what the client predicts."

### 2.5 Game Loop Architecture

```
Fixed timestep (16.67ms / 60 FPS):

loop(timestamp):
  deltaTime = timestamp - lastTime
  accumulator += deltaTime

  while accumulator >= FIXED_STEP:
    processInput()
    sendInputToServer()
    predictLocalState()       // client prediction
    accumulator -= FIXED_STEP

  interpolationAlpha = accumulator / FIXED_STEP

  receiveServerState()        // process incoming snapshots
  reconcile()                 // correct prediction errors
  interpolateRemoteEntities() // smooth other players/enemies
  render(interpolationAlpha)  // draw with sub-step interpolation

  requestAnimationFrame(loop)
```

Key points:
- **Fixed timestep** for physics/prediction ensures deterministic results
- **Interpolation** between frames for visual smoothness
- **Server state processing** is decoupled from the fixed step — applied when received

### 2.6 Input Handling

For Dead Cells-like responsiveness:

- Capture input at the **OS event level** (keydown/keyup, mousedown/mouseup)
- Store input state in a buffer — don't process during events
- Process input buffer once per fixed timestep
- **Input buffering**: store 2–3 frames of input to allow "just pressed" detection for parry timing
- **Mouse position**: track continuously, convert to game-world direction for aiming
- Use `pointer lock` API for consistent mouse behavior during combat

Parry timing window: Dead Cells uses ~6 frames at 60 FPS = 100ms. This is achievable even with server authority — the client sends the parry input with a timestamp, and the server validates within a tolerance window (100ms + half RTT).

### 2.7 Tilemap & Collision

**Tilemap format:** Use **Tiled** (mapeditor.org) to create maps, export as JSON. Write a custom loader that reads the JSON and renders tile layers via PixiJS (using `@pixi/tilemap` or CompositeTilemap for efficient batched rendering).

**Collision detection:**
- Tile-based collision: simple grid lookup, O(1) per entity
- Entity-entity collision: with <50 entities, brute-force AABB is fine (O(n^2) where n~50 = 2500 checks per tick — trivial)
- No need for spatial partitioning (quadtree, etc.) at this entity count

**Collision runs on the server.** Client predicts collisions locally for responsiveness but defers to server resolution.

---

## 3. Backend Analysis

### 3.1 Language Comparison

| Factor | Go | Java | Node.js |
|---|---|---|---|
| **WebSocket performance** | Excellent (gorilla/websocket, nhooyr) | Excellent (Netty, Undertow) | Good (ws, uWebSockets) |
| **Concurrency model** | Goroutines — lightweight, millions possible | Threads (virtual threads in Java 21+) | Single-threaded event loop |
| **Game loop** | `time.Ticker` — simple, precise | `ScheduledExecutorService` or custom | `setInterval` — imprecise, single-threaded |
| **GC latency** | Very low (<1ms typical) | Tunable but can spike (G1/ZGC: <5ms) | V8 GC can cause 5–15ms pauses |
| **Memory usage** | Very low (~10–50MB for this game) | Higher baseline (~100–200MB JVM) | Medium (~50–100MB) |
| **Binary deployment** | Single static binary | JAR + JVM runtime | Node runtime + node_modules |
| **Ecosystem for games** | Sparse but sufficient | Rich (LibGDX, etc.) | Moderate |
| **Learning curve** | Low | Medium-High | Low |

**Deep analysis:**

**Go** is exceptionally well-suited for this:
- Goroutines map perfectly to the server architecture: one goroutine per WebSocket connection, one for the game loop, one for broadcasting state. No thread pool tuning needed.
- GC pauses are sub-millisecond — critical for a 30 Hz game loop (33ms budget per tick). Go's GC will never cause a frame skip.
- `time.Ticker` provides reliable 33ms ticks without drift.
- Single binary deployment makes hosting trivial.
- The standard library has everything needed: `net/http` for WebSocket upgrade, `encoding/json` or `encoding/binary` for serialization.

**Java** advantages:
- Virtual threads (Java 21+) match Go's goroutine model closely.
- Netty is arguably the highest-performance WebSocket server available.
- Better profiling tools (JFR, VisualVM).
- More game networking libraries exist.

**Java** disadvantages:
- JVM startup time and memory overhead are unnecessary for a small game server.
- GC tuning is a rabbit hole — Go's GC just works.
- Deployment is more complex (JVM version management).
- For 3 players, Netty's performance advantage is irrelevant — you're handling ~60 messages/second total.

**Node.js** disadvantages:
- Single-threaded: the game loop and WebSocket I/O share one thread. A slow tick blocks networking.
- `setInterval` is not precise enough for a game loop without workarounds.
- GC pauses are the worst of the three options.
- Sharing code between client and server (often cited as the reason to use Node) is less valuable when the client is doing prediction and the server is authoritative — they run different logic.

**Verdict: Go.** It's the best fit by a clear margin for a small-scale, low-latency game server. Java would work but adds unnecessary complexity. Node.js is the weakest choice.

### 3.2 Server Architecture

```
+--------------------------------------------------+
|                   Go Server                       |
|                                                   |
|  +-----------+  +-----------+  +-----------+     |
|  | WS Conn   |  | WS Conn   |  | WS Conn   |    |
|  | Player 1  |  | Player 2  |  | Player 3  |    |
|  +-----+-----+  +-----+-----+  +-----+-----+    |
|        |               |               |          |
|        v               v               v          |
|  +-------------------------------------------+   |
|  |         Input Queue (chan)                 |   |
|  +---------------------+---------------------+   |
|                        v                          |
|  +-------------------------------------------+   |
|  |          Game Loop (30 Hz)                 |   |
|  |                                            |   |
|  |  1. Drain input queue                      |   |
|  |  2. Apply player inputs                    |   |
|  |  3. Update enemy AI                        |   |
|  |  4. Move entities                          |   |
|  |  5. Resolve collisions                     |   |
|  |  6. Process combat (damage, parry)         |   |
|  |  7. Update health/status                   |   |
|  |  8. Generate delta snapshots               |   |
|  |  9. Broadcast to clients                   |   |
|  +-------------------------------------------+   |
|                                                   |
|  +-------------------------------------------+   |
|  |         Game State (ECS)                   |   |
|  |  - Entity positions                        |   |
|  |  - Health/mana                             |   |
|  |  - Enemy AI state                          |   |
|  |  - Projectiles                             |   |
|  |  - Active abilities                        |   |
|  |  - Tilemap collision data                  |   |
|  +-------------------------------------------+   |
|                                                   |
|  +-------------------------------------------+   |
|  |        Room/Session Manager                |   |
|  |  - Player join/leave                       |   |
|  |  - Character selection                     |   |
|  |  - Map loading                             |   |
|  +-------------------------------------------+   |
+--------------------------------------------------+
```

### 3.3 Message Protocol

**Development phase: JSON over WebSocket.** This allows easy debugging with browser DevTools and rapid iteration on the schema. Once the packet schema stabilizes, switch to a binary protocol for production (1-byte message type header + packed fields via Go's `encoding/binary`).

Binary will provide 2–3x size reduction and lower parse overhead, but premature optimization here slows down iteration when the schema is still changing.

**Client -> Server messages:**

| Message Type | Payload | Binary Size (future) |
|---|---|---|
| PlayerInput | tick, moveX, moveY, primary, secondary, aimAngle | 10 bytes |
| AbilitySwap | slotIndex, itemId | 4 bytes |
| Ping | clientTimestamp | 8 bytes |

**Server -> Client messages:**

| Message Type | Payload | Binary Size (future) |
|---|---|---|
| WorldSnapshot (delta) | tick, [entityId, changedFields, values...] | 100–400 bytes |
| EventNotification | eventType, entityId, data | 8–20 bytes |
| Pong | clientTimestamp, serverTimestamp | 16 bytes |

JSON overhead during development: ~3–5x larger than binary. At 3 players and 20 Hz snapshots, this means ~10–15 KB/s per client — still trivial for WebSocket.

### 3.4 Go Server Game Loop (Pseudocode)

```go
func (g *Game) Run() {
    ticker := time.NewTicker(33 * time.Millisecond) // 30 Hz
    defer ticker.Stop()

    for range ticker.C {
        g.tick++

        // 1. Collect inputs from all players
        g.drainInputQueue()

        // 2. Apply inputs to player entities
        g.applyPlayerInputs()

        // 3. Update AI
        g.updateEnemyAI()

        // 4. Physics step
        g.moveEntities()
        g.resolveCollisions()

        // 5. Combat resolution
        g.processCombat()

        // 6. Generate and send snapshots
        for _, player := range g.players {
            delta := g.computeDelta(player.lastAckedSnapshot)
            player.send(delta)
        }
    }
}
```

---

## 4. Full System Architecture

```
+--------------------------------------------------------------+
|                        BROWSER CLIENT                         |
|                                                               |
|  +------------+  +--------------+  +--------------------+    |
|  |   Input    |  |  Game Loop   |  |   Renderer         |    |
|  |   Handler  |->|  (60 FPS)    |->|   (PixiJS/WebGL)   |    |
|  |            |  |              |  |                     |    |
|  |  WASD      |  |  Fixed step  |  |  Tilemap layer      |    |
|  |  Mouse     |  |  Prediction  |  |  Entity sprites     |    |
|  |  Abilities |  |  Interpolate |  |  Effects/particles  |    |
|  +------------+  +------+-------+  |  HUD overlay        |    |
|                         |          +--------------------+    |
|                         v                                     |
|  +-------------------------------------------------------+   |
|  |                 Network Client                         |   |
|  |  - WebSocket connection                                |   |
|  |  - Input serialization & send (JSON → binary later)    |   |
|  |  - Snapshot receive & deserialize                      |   |
|  |  - Client prediction state                             |   |
|  |  - Reconciliation logic                                |   |
|  |  - RTT estimation                                      |   |
|  +----------------------------+---------------------------+   |
|                               |                               |
+-------------------------------+-------------------------------+
                                | WebSocket (JSON dev / binary prod)
                                v
+--------------------------------------------------------------+
|                         GO SERVER                             |
|                                                               |
|  +--------------+                                            |
|  |  HTTP Server  | <- serves static files + WS upgrade        |
|  +------+-------+                                            |
|         |                                                     |
|  +------v-------+  +-------------+  +-------------------+   |
|  |  Connection  |  |  Game Loop  |  |  Game State       |   |
|  |  Manager     |->|  (30 Hz)    |->|  (Server ECS)     |   |
|  |              |  |             |  |                    |   |
|  |  Per-player  |  |  Input      |  |  Players           |   |
|  |  goroutines  |  |  AI         |  |  Enemies           |   |
|  |  Read/Write  |  |  Physics    |  |  Projectiles       |   |
|  |              |  |  Combat     |  |  Items              |   |
|  +--------------+  |  Snapshot   |  |  Map/Collision      |   |
|                    +-------------+  +-------------------+   |
|                                                               |
|  +-------------------------------------------------------+   |
|  |                  Map / Room Manager                    |   |
|  |  - Load Tiled JSON maps                                |   |
|  |  - Screen transitions                                  |   |
|  |  - Enemy spawning                                      |   |
|  |  - Item placement                                      |   |
|  +-------------------------------------------------------+   |
+--------------------------------------------------------------+
```

### 4.1 Client Module Breakdown

| Module | Responsibility |
|---|---|
| `main.ts` | Entry point, initializes PixiJS Application and all systems |
| `gameLoop.ts` | Fixed timestep loop, orchestrates systems |
| `input.ts` | Keyboard/mouse capture, input buffer |
| `network.ts` | WebSocket connection, JSON serialization (binary later), prediction/reconciliation |
| `renderer.ts` | PixiJS scene graph management, camera, layers |
| `tilemap.ts` | Load Tiled JSON, render tile layers via PixiJS, collision grid |
| `sprites.ts` | Spritesheet/texture atlas loading, animated sprites |
| `entities.ts` | Minimal ECS — entity creation, component storage |
| `systems/movement.ts` | Local movement prediction |
| `systems/animation.ts` | Sprite animation state machine |
| `systems/combat.ts` | Local combat prediction (visual only) |
| `ui.ts` | HUD, health bars, ability icons (DOM or PixiJS overlay) |
| `audio.ts` | Sound effects, music (Web Audio API) |

### 4.2 Server Module Breakdown (Go packages)

| Package | Responsibility |
|---|---|
| `main.go` | Entry point, HTTP server, WebSocket upgrade |
| `network/` | Connection management, JSON serialization (binary later) |
| `game/` | Game loop, tick management |
| `ecs/` | Entity-component storage, system interface |
| `systems/input.go` | Process player inputs |
| `systems/ai.go` | Enemy AI (simple state machines) |
| `systems/movement.go` | Entity movement, velocity |
| `systems/collision.go` | AABB collision, tile collision |
| `systems/combat.go` | Damage calculation, parry validation, spell effects |
| `maps/` | Tiled JSON loader, room management |
| `snapshot/` | Delta computation, JSON encoding (binary later) |

---

## 5. Specific Technical Challenges & Solutions

### 5.1 Parry Timing (Knight)

This is the hardest networking problem in the game. A "perfect parry" requires frame-precise timing.

**Solution:**
- Client sends parry input with local timestamp
- Server receives it with a known RTT estimate
- Server checks if an enemy attack hitbox was active within a **tolerance window** of `parryWindow +/- halfRTT`
- This means players with higher ping get a slightly larger effective parry window — a fair tradeoff
- The parry window should be tuned: ~100ms base + up to 50ms network tolerance

### 5.2 Screen Transitions (Zelda-style)

When a player walks to a screen edge:
- **Option A (simpler):** All 3 players must be near the same exit to transition (co-op gating)
- **Option B (complex):** Players can be on different screens — server simulates all active screens

**Recommendation:** Option A for initial implementation. It's dramatically simpler and fits the co-op design. Option B requires the server to simulate multiple rooms simultaneously and handle cross-room interactions.

### 5.3 Enemy AI Synchronization

Enemies are **server-authoritative only**. Clients do not predict enemy behavior — they interpolate between server snapshots.

This means enemies will appear to move with a slight delay (one snapshot interval = 50ms). For NES-style enemies with simple movement patterns, this is imperceptible.

### 5.4 Ability/Spell Projectiles

Projectiles are server-owned entities. When a mage casts a spell:
1. Client sends "cast spell" input with aim direction
2. Client immediately spawns a **visual-only** predicted projectile
3. Server spawns the authoritative projectile, broadcasts it
4. Client replaces predicted projectile with server entity
5. If prediction was close (usual case), the transition is seamless

### 5.5 Shared Collision Data

Both client and server need the same collision map. Solution:
- Use Tiled JSON format
- Server loads it at startup (Go reads JSON, extracts collision layer)
- Client loads same file for rendering and local prediction
- Single source of truth for map data

---

## 6. Feasibility Analysis

### 6.1 Is This Feasible?

**Yes, definitively.** This is a well-scoped project. The technical requirements (3 players, ~50 entities, simple physics, pixel art) are modest. The hardest part is not performance — it's getting the networking "feel" right.

### 6.2 Difficulty Assessment

| Component | Difficulty | Estimated Effort (solo dev) |
|---|---|---|
| PixiJS renderer setup + Vite project | Easy | 1 day |
| Tilemap loading & rendering (PixiJS) | Easy | 1–2 days |
| Sprite animation system | Easy | 1 day |
| Input handling | Easy | 0.5 days |
| Client game loop (fixed timestep) | Medium | 1 day |
| WebSocket client | Easy | 0.5 days |
| Go WebSocket server | Easy | 1 day |
| Server game loop | Medium | 1–2 days |
| Server ECS & game state | Medium | 2–3 days |
| JSON protocol (binary later) | Easy | 1 day |
| Client prediction & reconciliation | **Hard** | 3–5 days |
| Delta snapshot system | Medium-Hard | 2–3 days |
| Enemy AI (basic state machines) | Medium | 2–3 days |
| Combat system (melee, spells, healing) | Medium | 3–5 days |
| 3 character classes & abilities | Medium | 3–5 days |
| Map/room design | Medium | 3–5 days |
| Pixel art assets | Varies | Ongoing |
| Polish, tuning, bug fixing | High | 5–10 days |

**Total estimate: 30–50 days of focused solo development** for a playable prototype. This assumes prior experience with game development and networking.

### 6.3 Biggest Risks

1. **Client prediction/reconciliation bugs** — This is where most multiplayer indie games get stuck. Prediction jitter, rubber-banding, and desync are subtle and hard to debug. Start with movement-only prediction and add combat prediction later.

2. **Combat feel over network** — Making melee combat feel responsive with 50–100ms latency requires careful animation design. Use generous hit-confirm animations (screen shake, hit flash) to mask the delay between client action and server confirmation.

3. **Scope creep** — Four character classes with unique abilities is significant content. Start with one class (Knight, simplest networking), get the multiplayer working, then add Mage/Cleric, then Ranger (bow primary, thrown net secondary).

### 6.4 Recommended Simplifications

1. **Start without client prediction.** Get the authoritative server working with direct state rendering first. Add prediction later — it's easier to add prediction to a working system than to debug prediction on a broken one.

2. **Use JSON protocol initially, optimize to binary later.** JSON WebSocket messages are fine for 3 players during development — easy to inspect in DevTools. Switch to binary once the packet schema stabilizes.

3. **Single screen first, multi-room later.** Get combat working in one room before implementing screen transitions.

4. **Placeholder art.** Use colored rectangles until the gameplay works. Art can be swapped in at any time.

---

## 7. Recommended Stack

### Final Recommendation

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend rendering** | **TypeScript + PixiJS (WebGL)** | Automatic sprite batching, texture atlas support, future headroom for effects/shaders. Avoids Phaser's opinionated architecture while getting high-quality rendering. |
| **Frontend language** | **TypeScript** | Type safety for entity/component systems and network message schemas prevents entire categories of bugs. Essential for shared protocol types. |
| **Frontend build** | **Vite** | Near-instant HMR during development, efficient production builds, first-class TypeScript support, minimal configuration. |
| **Backend** | **Go** | Best concurrency model (goroutines), sub-ms GC, simple deployment, excellent WebSocket libraries, precise game loop timing. |
| **Networking** | **WebSocket (JSON dev / binary prod)** | JSON during development for easy debugging. Switch to binary (1-byte header + packed fields) once schema stabilizes for 2–3x size reduction. |
| **Networking model** | **Server authoritative + client prediction** | Industry standard for action games. Server owns truth, clients predict for responsiveness. |
| **Server tick rate** | **30 Hz sim / 20 Hz snapshots** | 30 Hz gives good parry timing granularity. Snapshots sent at 20 Hz with 80–120ms interpolation buffer. |
| **Map format** | **Tiled (JSON export)** | Free, mature map editor. JSON format is easy to parse in both TS and Go. Supports tile layers, object layers, collision. |
| **Asset pipeline** | **Aseprite -> spritesheet PNG + JSON** | Aseprite is the standard for pixel art. Export as spritesheet atlas with frame data JSON. Load atlas once, draw regions. |
| **Architecture** | **Minimal custom ECS (both client and server)** | Clean separation of concerns. Shared entity model makes networking straightforward. Keep it simple — no framework needed. |

### Why This Stack Is Optimal

1. **TypeScript + PixiJS + Vite** gives type-safe rendering code with automatic WebGL sprite batching, near-instant dev rebuilds, and future headroom for visual effects. PixiJS is a renderer, not a game engine — it doesn't fight custom networking or game loop architecture.

2. **JSON-first protocol** allows rapid schema iteration with browser DevTools inspection. The switch to binary is a well-defined optimization step once the message types stabilize — not a rewrite, just a serialization swap behind the same TypeScript/Go interfaces.

3. **Go** is the sweet spot of simplicity and performance. Its goroutine model means each WebSocket connection is a simple blocking read loop — no callback hell, no thread pool tuning. The GC is fast enough to never interfere with a 30 Hz game loop. A single Go binary serves both the static files and WebSocket connections.

4. **Server authoritative with client prediction** is the only networking model that provides both cheat resistance and responsive feel for action combat. Lockstep would make combat feel sluggish; pure client authority would allow cheating.

5. **Tiled + Aseprite** is the standard indie pixel art pipeline because both tools are built specifically for this purpose, and their export formats are simple structured data (JSON) that requires no special parsing libraries.

6. **The stack has minimal dependencies** — PixiJS, Vite, and Go's standard library (plus a WebSocket package). This means low supply chain risk, straightforward deployment, and fast onboarding. For a small team, operational simplicity is as important as technical capability.

---

## 8. Project Directory Structure

```
game/
├── frontend/        Browser client (PixiJS rendering, input, UI, client prediction, networking)
├── backend/         Go authoritative server (WebSocket, rooms, simulation tick, combat/AI, state sync)
├── shared/          Protocol and shared definitions (packet schema constants, entity/ability IDs, enums, validation)
├── assets/          Source and built game content (tilesets, sprites, animations, audio, Tiled map files)
├── tools/           Build/import scripts and dev utilities (atlas packing, map export, asset converters, codegen)
└── infra/           Deployment/runtime config (Docker, reverse proxy, env templates, CI/CD, server provisioning)
```

### Directory Responsibilities

| Directory | Language | Contents |
|---|---|---|
| `frontend/` | TypeScript | Vite project, PixiJS renderer, game loop, ECS, input, networking client, UI |
| `backend/` | Go | HTTP/WebSocket server, game loop, server ECS, AI, combat, collision, snapshots |
| `shared/` | TypeScript + Go | Message type constants, entity IDs, ability IDs, map enums, shared validation. Kept in sync manually or via codegen. |
| `assets/` | — | Aseprite source files, exported spritesheets (PNG + JSON), Tiled maps (JSON), audio files |
| `tools/` | TypeScript/Shell | Atlas packer scripts, Tiled map validation, asset pipeline automation, protocol codegen |
| `infra/` | YAML/Dockerfile/Shell | Docker Compose, nginx/Caddy config, `.env` templates, GitHub Actions, deploy scripts |

---

## Summary

This project is technically straightforward but requires careful implementation of the networking layer. The game's scope (3 players, NES-style graphics, top-down combat) is well within what a solo developer or small team can achieve. The primary challenge is not performance or architecture — it's tuning the multiplayer combat to feel responsive despite network latency. Start simple, iterate, and add complexity only when the foundation is solid.
