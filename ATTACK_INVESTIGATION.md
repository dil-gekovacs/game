# Attack System Investigation Report

## What was tested

The attack system was tested end-to-end using Playwright MCP against a live
game instance (`localhost:5173`). WebSocket messages were intercepted on both
send and receive paths to trace inputs from client through to server events.

Multiple test rooms were created (`attack-test` through `attack-verify`).
Tests included:

1. Verifying mouse clicks produce `primary: true` in PlayerInput messages
2. Verifying the server receives and processes those inputs
3. Monitoring WorldSnapshot positions and Event damage messages
4. Comparing server-reported entity positions to client-rendered positions

## What works

**The server-side attack logic is fully functional.** Evidence:

- `primary: true` is correctly sent over WebSocket when the mouse button is held
- The server correctly processes the attack when `input.Primary` is true and
  `PrimaryCooldownRemaining` is 0
- Damage events are broadcast: player (entity 1) dealing 50 damage per hit to
  enemies in the aim cone within 28 px range
- Enemies are killed (despawn event fired) after enough hits
- Attack cooldown of 12 ticks (0.4s) is respected between hits
- Unit tests in `room_test.go` all pass for attack logic

## What didn't work (root cause)

**Client-side prediction speed mismatch** caused the player's visual position
to drift significantly from the authoritative server position, making movement
and attacks appear broken to the user.

### The bug

In `frontend/src/entityStore.ts` line 51:

```typescript
const PLAYER_SPEED_PX_PER_SEC = 96;  // was wrong
```

The backend (`backend/internal/game/room.go` line 19) uses:

```go
PlayerSpeed = 120  // pixels per second
```

The client-side prediction replayed inputs at 96 px/s while the server moved
the player at 120 px/s. This 25% speed mismatch caused:

1. Client-predicted position to systematically lag behind the server position
2. Each reconciliation cycle to jerk the player backward (from the client's
   perspective), making the player appear nearly stuck
3. The `LOCAL_CORRECTION_FACTOR` (0.3) smoothing to dampen visual updates so
   heavily that the player appeared stationary in screenshots

Because the player visually appeared near the spawn while the server had moved
them into enemy range, all combat activity (enemy damage to player, player
damage to enemies) was invisible -- the rendered positions didn't match the
actual gameplay.

## What was fixed

**File:** `/Users/gekovacs/workspace/game/frontend/src/entityStore.ts`

Changed the prediction speed constant from 96 to 120 to match the backend:

```typescript
const PLAYER_SPEED_PX_PER_SEC = 120;
```

After this fix, the player's visual position correctly tracks the server
position, movement is smooth, and attacks are visually perceptible.
