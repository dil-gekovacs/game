# Multiplayer Browser Game Architecture Proposal

## What is a packet schema?

A **packet schema** is the contract for your network messages: the exact fields, types, order, and meaning of every message sent between client and server.  
It ensures both sides serialize/deserialize data the same way and enables versioning, validation, and compact binary encoding.

Example (conceptual):

- `InputCommand`: `{seq:u16, tick:u32, moveX:i8, moveY:i8, buttons:u8}`
- `WorldSnapshot`: `{tick:u32, entities:[{id:u16, x:i16, y:i16, vx:i16, vy:i16, hp:u8, state:u8}]}`
- `Event`: `{type:u8, entityId:u16, targetId:u16, value:i16}`

For low latency action games, packet schema design is critical for:

- minimizing bandwidth (quantized ints, bitfields, delta updates)
- deterministic interpretation (fixed types/ranges)
- forward compatibility (message version/type IDs)

## Executive recommendation

This game is feasible with an **authoritative Go server + WebSocket + client prediction/reconciliation** model.  
For this scope (3-player top-down action RPG), this is a better tradeoff than lockstep or full rollback.

## Multiplayer model comparison

| Model | Latency feel | Complexity | Cheat resistance | Fit |
|---|---:|---:|---:|---|
| Lockstep deterministic | Poor for action | Medium | Medium | Not ideal |
| Rollback | Excellent | High | Medium | Overkill here |
| Server authoritative + prediction | Very good | Medium | High | **Best fit** |

Recommended behavior:

- server authoritative over movement, hits, parry windows, AI, projectiles, inventory/loadouts
- client predicts local movement/actions immediately
- reconciliation with server snapshots
- interpolation buffer for remote entities (~80-120 ms)

## Frontend architecture and rendering

### Rendering choice

- Canvas 2D: workable but becomes CPU-bound sooner
- WebGL: best practical path now for smooth sprite batching and low overhead
- WebGPU: promising but unnecessary complexity for this project

### Engine/library comparison

| Option | Performance | Dev speed | Control | Fit |
|---|---:|---:|---:|---|
| Vanilla Canvas-only | Medium | Medium/slow | High | Possible, more engine work |
| Phaser | Good | Fastest | Medium | Great for rapid MVP |
| PixiJS | Very good | Medium | High | **Best balance** |
| Three.js/Babylon.js | High (3D focus) | Medium | Medium | Not needed for 2D |

Recommendation: **PixiJS + minimal ECS gameplay layer** (or Phaser if speed-to-prototype is top priority).

### Client systems

- fixed-step simulation (60 Hz) + render loop at display refresh
- input sampling every frame (`WASD`, `LMB`, `RMB`)
- tilemap rendering (Tiled JSON), sprite atlas animations
- broad-phase grid + simple AABB/circle collision
- network client with sequence-numbered input commands

## Backend runtime comparison

| Runtime | WebSocket performance | Latency profile | Concurrency model | Fit |
|---|---:|---:|---|---|
| **Go** | High | Very good | Goroutines/channels | **Best** |
| Java | Very high | Excellent with tuning | Threads/reactive | Strong, heavier ops |
| Node.js | Good | Good at small scale | Event loop + workers | Fine MVP, less ideal for authoritative sim |

Recommendation: **Go** for straightforward, efficient, low-latency authoritative simulation.

## Networking architecture

Recommended settings:

- server sim tick: **30 Hz** (safe) or **60 Hz** (tighter combat/parry feel)
- input send rate: **30-60 Hz**
- snapshot send rate: **15-20 Hz** with interpolation

Bandwidth expectations (3 players, moderate enemy/projectile counts, binary protocol):

- per-client upstream: ~0.8-1.5 KB/s
- per-client downstream: ~4-12 KB/s
- total room traffic typically under 50 KB/s aggregate

Sync strategy:

- input stream: seq/tick/buttons/axes
- snapshot stream: delta-compressed entity states
- reliable events: spawn/despawn, loot, equip changes, damage events

## Full technical architecture

### Frontend

- Renderer: PixiJS (WebGL)
- Game loop: fixed update + interpolated render
- Entity model: minimal ECS/components
- Input system: keyboard + mouse mapped to ability slots
- Networking: WebSocket client, prediction/reconciliation/interpolation

### Backend (Go)

- Networking layer: WebSocket hub + room sessions
- Simulation: authoritative per-room fixed tick loop
- Game state: entities/components/systems (player, AI, combat, abilities, loot)
- Physics/collision: tile + simple primitives
- Synchronization: snapshot delta encoder + event channel

## Feasibility, complexity, and risks

Feasible for a solo/small team if scope is constrained (one zone, limited enemy set, focused abilities).  
Biggest risks are reconciliation quality, parry timing fairness under latency, and protocol correctness.

Practical simplifications:

- start with one map/room and no zone streaming
- keep physics simple (no heavy physics engine at first)
- start with JSON packets for speed of iteration, then migrate to binary once schema stabilizes

## Recommended stack

- Frontend: **TypeScript + PixiJS + minimal ECS**
- Networking: **WebSocket + JSON protocol initially, then custom binary packet schema**
- Backend: **Go authoritative server**
- Map format: **Tiled JSON + tilesets**
- Asset pipeline: **Aseprite + atlas packing + Vite/esbuild**

Why this is optimal: it gives strong real-time responsiveness, low implementation risk, and enough performance headroom for your 3-player action-combat target.

## Development run plan (local machine)

- Frontend runs with a local **Vite dev server** (hot reload, source maps, fast iteration).
- Backend runs as a local **Go binary** (`go run` during iteration, built binary for production-like testing).
- Frontend points to backend WebSocket endpoint via environment config (`VITE_WS_URL` or similar).
