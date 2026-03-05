# Frontend Progress: Prediction + Reconciliation Slice

## Files Changed

- `frontend/src/main.ts` — Rewired to use entity store and entity renderer; added handlers for `PLAYER_JOINED`, `PLAYER_LEFT`, `WORLD_SNAPSHOT`, and `GAME_START` messages; removed single hardcoded marker; prediction now occurs alongside input send.
- `frontend/src/entityStore.ts` — New file. Entity state store keyed by `EntityId`, pending input history for reconciliation, snapshot application with delta merging, and input replay.
- `frontend/src/entityRenderer.ts` — New file. Per-entity PixiJS marker management with automatic creation/removal, local marker direct positioning, and remote marker interpolation.

## How Local Prediction and Reconciliation Work

1. **Prediction:** Each time a `PlayerInput` message is sent (at ~30 Hz), the input is also stored in a `pendingInputs` array keyed by sequence number. The local entity position is immediately advanced using `PLAYER_SPEED_PX_PER_SEC = 120` and `SIM_DELTA_SEC = 33/1000`, with diagonal input normalization to mirror server behavior, giving instant visual feedback while minimizing reconciliation drift.

2. **Snapshot application:** When a `WorldSnapshot` arrives, all entity deltas are merged into the entity store (partial field updates). For the local player entity, acknowledged inputs (those with `seq <= ackSeq`) are dropped from the pending buffer.

3. **Reconciliation replay:** After applying the authoritative server position to the local entity, all remaining unacknowledged pending inputs are replayed on top of the server state. This produces a corrected predicted position that accounts for inputs the server hasn't processed yet, preventing rubber-banding while still converging to server truth.

4. **Overflow handling:** The pending input buffer is capped at 256 entries. Input sequence wraps at 65536 per the protocol contract.

## How Remote Rendering Works

- Remote entities are rendered as blue circles (distinct from the local green circle).
- Markers are created on demand when a new entity ID appears in the store, and destroyed when entities leave.
- Remote marker positions use exponential interpolation (`factor = 0.15`) toward the target position each render frame, smoothing the visual updates between snapshots rather than snapping to new positions.
- The `previousX`/`previousY` fields on each entity record track the position before the latest delta for potential future use with snapshot-based interpolation.

## Assumptions

- **Movement constants:** prediction uses `PLAYER_SPEED_PX_PER_SEC = 120` and `SIM_DELTA_SEC = 33/1000`, matching backend `PlayerSpeed` and `SimDeltaMs`; diagonal normalization is applied client-side to match server input processing.
- **Local player identification:** The local player's entity ID is determined by matching the `playerId` from the `PlayerJoined` message against the `playerId` query parameter in the `VITE_WS_URL` environment variable.
- **Entity creation from snapshots:** Entities appearing in `WorldSnapshot` deltas that don't already exist in the store are skipped (they should be added via `PlayerJoined` or similar lifecycle messages first). New entity types (enemies, projectiles) would need additional lifecycle message handling in a future iteration.
- **No collision prediction:** Client prediction does not account for tile/wall collisions. The server's authoritative state corrects any drift caused by this.

## Build Result

```
> tsc --noEmit && vite build

vite v5.4.21 building for production...
transforming...
720 modules transformed.
10 chunks rendered.
Built in 1.31s
```

No TypeScript errors. No warnings.

## One-map playable demo slice

- Added starter-room map rendering (ground grid + collision walls) with fixed single-room camera framing.
- Upgraded entity rendering with class/enemy/projectile distinction, facing indicators, and HP bars.
- Added combat feedback flashes from `Event` messages and despawn handling for enemy death visibility.
- Added in-game HUD with room, player, entity, connection state, and live enemy count.
- Added query-parameter WebSocket overrides for local multi-tab testing: `?roomId=...&playerId=...`.
- Prediction/reconciliation constants and diagonal normalization behavior remain unchanged (`PLAYER_SPEED_PX_PER_SEC = 120`, `SIM_DELTA_SEC = 33/1000`).
