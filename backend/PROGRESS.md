# Backend Progress: Authoritative Movement Slice

## Date: 2026-03-05

## Status: COMPLETE

## Files Changed

1. `backend/internal/game/room.go` -- Added authoritative player simulation state, input ingestion, movement simulation, entity delta generation.
2. `backend/internal/server/ws.go` -- Updated input handling to pass full PlayerInput to room via `ApplyInput`; updated `newPlayerJoinedMsg` to use actual spawn positions from player state.
3. `backend/internal/game/room_test.go` -- New file; table-driven and unit tests for spawn positions, movement, clamping, idle state, diagonal normalization, snapshot entities, max capacity.

## What Was Implemented

### Movement State Added (per Player)
- `X`, `Y` (float64) -- authoritative position
- `VX`, `VY` (float64) -- current velocity
- `Facing` (uint8) -- 0=Down, 1=Up, 2=Left, 3=Right
- `State` (uint8) -- 0=Idle, 1=Moving
- `HP`, `MaxHP` (uint8) -- initialized to 100
- `Flags` (uint8) -- bit 0: visible (initialized to 1)
- `LatestInput` (PlayerInput struct) -- cached input from client

### How Input Is Consumed and Applied Each Tick
1. `ws.go` read loop receives `PlayerInputMsg`, performs stale-seq check.
2. Accepted input is passed to `room.ApplyInput(entityID, PlayerInput{...})` which stores it in the player's `LatestInput` field and updates `LastAppliedSeq`.
3. On each sim tick (~30 Hz), `simulateTick()` iterates all players:
   - Reads cached `LatestInput`.
   - Normalizes the (moveX, moveY) vector if magnitude > 1.
   - Computes velocity = normalized direction * PlayerSpeed (120 px/s).
   - Integrates position: pos += velocity * SimDeltaSec (0.033s).
   - Clamps position to world bounds (0,0)-(800,600).
   - Updates facing direction from dominant movement axis.
   - Sets state to Moving (1) or Idle (0) based on input magnitude.

### Spawn Positions
- Entity 1: (100, 300)
- Entity 2: (400, 300)
- Entity 3: (700, 300)
- `PlayerJoined` initial state now reflects actual spawn coordinates.

## Snapshot Payload Example After Change

```json
{
  "type": "WorldSnapshot",
  "tick": 42,
  "ackSeq": 7,
  "entities": [
    {
      "id": 1,
      "type": 0,
      "state": 1,
      "facing": 3,
      "hp": 100,
      "maxHp": 100,
      "animFrame": 0,
      "x": 103,
      "y": 300,
      "vx": 100,
      "vy": 0,
      "flags": 1
    },
    {
      "id": 2,
      "type": 0,
      "state": 0,
      "facing": 0,
      "hp": 100,
      "maxHp": 100,
      "animFrame": 0,
      "x": 400,
      "y": 300,
      "vx": 0,
      "vy": 0,
      "flags": 1
    }
  ]
}
```

## Build & Test Results

```
$ gofmt -w ./cmd ./internal
(no output -- formatted clean)

$ go build ./...
(no output -- build succeeded)

$ go test ./...
?       game/backend/cmd/server         [no test files]
ok      game/backend/internal/game      1.164s
?       game/backend/internal/protocol  [no test files]
?       game/backend/internal/server    [no test files]
```

All checks pass. 3-player room capacity behavior is intact. Protocol JSON field names match the shared contract exactly.

## One-map playable demo backend slice

### Additional status
- Map-driven runtime loading from `assets/maps/starter-room.json` is implemented.
- Collision rectangles and spawn points are parsed from map layers/properties.
- Enemy entities are simulated authoritatively and included in world snapshots.
- Primary attack damage/kill flow is authoritative and emits combat events.

### Integration validation
- Local multi-client smoke test confirms:
  - same-room join flow in multiple tabs,
  - synchronized movement and enemy updates,
  - map ID boot path (`starter-room`),
  - event feedback/despawn path active.
