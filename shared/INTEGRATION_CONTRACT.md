# Integration Contract — Frontend ↔ Backend

> **Scope:** This document is the authoritative integration contract for the
> game's client (TypeScript/PixiJS) and server (Go) teams. All shared type
> definitions and protocol message schemas live exclusively under `shared/`.

---

## 1. File Map

| File | Consumers | Purpose |
|------|-----------|---------|
| `shared/types/entities.ts` | FE (import), BE (reference) | Entity/component types, enums |
| `shared/protocol/messages.ts` | FE (import), BE (reference) | All WS message interfaces, `MSG` constants |
| `shared/protocol/schema.json` | BE (validate/generate), tooling | JSON Schema — language-agnostic canonical source |
| `shared/INTEGRATION_CONTRACT.md` | Both | This document |

**Rule:** FE imports TypeScript files directly. BE derives Go structs from
`schema.json` (manually or via `go-jsonschema` / `quicktype`). Neither side
edits the other's implementation files.

---

## 2. Transport

- **Protocol:** WebSocket (`ws://` dev, `wss://` prod).
- **Framing:** Text frames during JSON phase; binary frames when migrated.
- **Message format (JSON):** Each frame is a single JSON object with a `"type"`
  string discriminant matching a `MSG.*` constant in `messages.ts`.
- **Message format (binary):** Single `u8` opcode at byte offset 0. See §4.

### WebSocket endpoint

```
ws://<host>/ws?roomId=<uuid>&playerId=<uuid>
```

The server upgrades the HTTP connection, assigns an `EntityId`, and sends
`PlayerJoined` + `GameStart` before beginning the snapshot stream.

---

## 3. Message Flow

```
Client                              Server
  |                                   |
  |-- (HTTP GET /ws?...) ----------->|  upgrade to WebSocket
  |<-- PlayerJoined (self) ----------|  entityId assigned
  |<-- PlayerJoined (peers) ---------|  one per already-connected player
  |<-- GameStart -------------------|  mapId + serverTick for clock sync
  |                                   |
  |  ← game loop begins →            |
  |-- PlayerInput (30–60 Hz) ------->|  seq-numbered; server buffers
  |<-- WorldSnapshot (~20 Hz) -------|  delta entities + ackSeq
  |<-- Event (as needed) ------------|  damage, spawns, loot, etc.
  |                                   |
  |-- Ping (1 Hz) ------------------>|
  |<-- Pong --------------------------|
  |                                   |
  |<-- PlayerJoined/PlayerLeft -------|  on peer connect/disconnect
  |<-- GameOver ---------------------|  on victory or total party wipe
```

### Ordering guarantees

- WebSocket frames are ordered within a connection.
- `PlayerInput.seq` is monotonically increasing per client; the server drops
  stale/duplicate seqs.
- `WorldSnapshot.ackSeq` is the last `seq` the server applied. Clients discard
  predicted states at or before `ackSeq` during reconciliation.

---

## 4. Binary Migration Plan

The current phase uses **JSON text frames**. When the packet schema stabilises
(post-MVP), migrate to binary frames for a ~3× bandwidth reduction.

### Binary framing contract

Every binary frame:

```
[u8: opcode] [payload bytes...]
```

Opcodes are stable (never reuse a retired opcode):

| Opcode | Message |
|--------|---------|
| 0x01 | PlayerInput |
| 0x02 | AbilitySwap |
| 0x03 | Ping |
| 0x10 | WorldSnapshot |
| 0x11 | Event |
| 0x12 | Pong |
| 0x13 | PlayerJoined |
| 0x14 | PlayerLeft |
| 0x15 | GameStart |
| 0x16 | GameOver |

Exact binary layouts are documented inline in `messages.ts` and `entities.ts`.
Key encoding decisions:

- **Integers:** network byte order (big-endian).
- **Floats:** `f64` IEEE-754 big-endian (only for timestamps; prefer fixed-point
  elsewhere).
- **Booleans:** packed into a `u8` bitfield per message.
- **Strings (mapId, playerId):** length-prefixed `u16` + UTF-8 bytes; UUIDs as
  16 raw bytes.
- **EntityDelta presence:** `u16` bitmask immediately after `entityId` — bit N
  set means field N follows in the stream. Field order matches
  `EntitySnapshot` field order.

### Migration steps (phased)

1. **Add `Content-Type` header negotiation** on the WebSocket handshake
   (`subprotocol: "game-json"` vs `"game-binary"`). No other code changes yet.
2. **Add binary serialisers alongside JSON** in both FE and BE, gated by the
   negotiated subprotocol.
3. **Test in parallel** — send both; compare outputs in dev tools.
4. **Switch default** to binary. Keep JSON fallback for debug builds.

No schema changes are required for the migration — all field ranges are already
sized for binary encoding.

---

## 5. Tick & Timing

| Parameter | Value | Notes |
|-----------|-------|-------|
| Server simulation tick rate | 30 Hz (33 ms) | `time.Ticker(33ms)` in Go |
| Snapshot send rate | 20 Hz (50 ms) | Decoupled from sim tick |
| Client input send rate | 30–60 Hz | Matches or doubles sim tick |
| Client render rate | 60 FPS | Interpolates between snapshots |
| Remote entity interpolation buffer | 80–120 ms | ~2 snapshots |

**Clock sync:** On `GameStart`, clients record `serverTick` alongside their
local `performance.now()`. RTT is estimated via Ping/Pong. Clients add
`halfRTT` to derive the server's current tick.

---

## 6. Client Prediction & Reconciliation

The server is authoritative. Clients predict local player movement only.

1. Client applies `PlayerInput` locally and advances predicted state.
2. Client stores pending inputs in a ring buffer keyed by `seq`.
3. On `WorldSnapshot` receipt, client fast-forwards to `ackSeq` state.
4. Client replays inputs with `seq > ackSeq` on top of the server state.
5. If predicted position diverges by more than a threshold (~1 tile), snap;
   otherwise lerp over ~100 ms to avoid visible jitter.

**What is NOT predicted client-side:**
- Enemy positions (interpolated from snapshots).
- Damage resolution.
- Other players' health/state.
- Loot drops.

---

## 7. Entity ID Allocation

- Allocated by the server only. Clients never assign EntityIds.
- `0` is reserved (null/invalid).
- Player entities: 1–8 (max room size).
- Enemies/projectiles/items: 9–65535.
- IDs are reused only after a full room reset.

---

## 8. Error Handling

- **Unknown `type` field:** ignore the message, log a warning.
- **Schema validation failure (BE):** drop the message, do not disconnect.
- **Connection drop:** server holds entity state for 10 s, then broadcasts
  `PlayerLeft` and removes the entity.
- **Seq overflow (u16):** wrap around to 0; server treats seq < lastSeen as
  stale only if the gap is > 32768.

---

## 9. Adding New Messages

1. Add the TypeScript interface to `messages.ts` with a new `MSG.*` constant.
2. Add the JSON Schema variant to `schema.json` under `oneOf`.
3. Assign a new opcode (never reuse). Document binary layout in a comment.
4. Update `ClientMessage` or `ServerMessage` union type.
5. Update this document's message flow and opcode table.
6. Notify both FE and BE implementers before merging.
