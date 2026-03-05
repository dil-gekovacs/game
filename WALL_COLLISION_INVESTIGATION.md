# Wall Collision Bug Investigation

## Summary

The player sprite visually moves through walls because the client-side prediction does not perform any wall collision checks. The server enforces collisions correctly, but by the time the server correction arrives and reconciliation occurs, the player has already visually clipped through walls.

## Observations in Browser

- Game loads at `http://localhost:5173/?roomId=demo&playerId=p1` and connects successfully.
- A green circle (player entity 1) spawns in the upper-left area of a rectangular room.
- Two vertical wall rectangles are rendered on the left (x=0, w=16) and right (x=240, w=16) edges.
- No runtime errors in the console (only a favicon 404 and PixiJS v8 deprecation warnings).
- The HUD reads: room=demo, player=p1, entity=1, connection=connected.

## Root Cause Analysis

### Client-side prediction ignores wall collisions entirely

The function `applyInputToPosition` in `entityStore.ts` (lines 45-63) computes the next position using only velocity and delta time:

```typescript
return {
  nextX: positionX + dirX * PLAYER_SPEED_PX_PER_SEC * SIM_DELTA_SEC,
  nextY: positionY + dirY * PLAYER_SPEED_PX_PER_SEC * SIM_DELTA_SEC,
};
```

There is **no collision check** against wall rects. This function is called in two places:
1. `predictFixedStep` (line 203) -- called every ~16ms (60Hz) to continuously move the player locally.
2. `replayPendingInputs` (line 156) -- called during server reconciliation to replay unacknowledged inputs.

Neither path checks for wall collisions.

### Server-side enforces collisions correctly

In contrast, the server's `moveWithCollisionLocked` in `room.go` (lines 553-570) performs proper axis-separated collision detection:
- It moves on X, checks `collidesCircleLocked`, and reverts X if colliding.
- It then moves on Y, checks again, and reverts Y if colliding.
- Collision uses circle-vs-AABB intersection (`circleIntersectsRect`, lines 581-587).

The server loads collision rects from the Tiled map file (`starter-room.json`) via `loadStarterRoomRuntime` (line 788).

### The timing gap causes visual wall clipping

The game loop runs prediction at 60Hz (`gameLoop.ts`, FIXED_STEP_MS = 1000/60), while:
- Input is sent to the server at 30Hz (`INPUT_SEND_INTERVAL_MS = 1000/30`).
- Server sim ticks at 30Hz (`SimTickRate = 30`).
- Server snapshots are broadcast at 20Hz (`snapTicker = 50ms`).

This means there is a minimum ~50-100ms window where the client's predicted position has moved freely through a wall before the server's corrected position arrives. During reconciliation (`applySnapshot` at line 170 of `entityStore.ts`), `replayPendingInputs` replays all unacknowledged inputs -- but again without collision checks -- so the predicted position drifts back through the wall immediately.

### Wall collision data is not shared with the client prediction layer

The client renders walls using a hardcoded `STARTER_ROOM_COLLISIONS` array in `mapRenderer.ts` (lines 26-29), but this data is only used for rendering. The `entityStore.ts` module has no access to collision rectangles and no collision logic whatsoever.

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `frontend/src/entityStore.ts` | 45-63 | `applyInputToPosition` -- no collision check |
| `frontend/src/entityStore.ts` | 193-212 | `predictFixedStep` -- calls `applyInputToPosition` without walls |
| `frontend/src/entityStore.ts` | 151-168 | `replayPendingInputs` -- reconciliation replay also lacks collision |
| `frontend/src/mapRenderer.ts` | 26-29 | `STARTER_ROOM_COLLISIONS` -- wall rects exist but are render-only |
| `backend/internal/game/room.go` | 553-570 | `moveWithCollisionLocked` -- proper server collision |
| `backend/internal/game/room.go` | 572-587 | `collidesCircleLocked` / `circleIntersectsRect` |
| `frontend/src/main.ts` | 245 | `entityStore.predictFixedStep(currentInput)` -- the call site |
| `frontend/src/gameLoop.ts` | 1 | Client runs prediction at 60Hz |

## Recommended Fix

1. **Export collision rects from the map renderer** (or a shared map data module) so the entity store can access them.

2. **Port the server's collision logic to the client.** Implement a TypeScript equivalent of `moveWithCollisionLocked` that does axis-separated circle-vs-AABB checks. This must be used in both:
   - `applyInputToPosition` (for continuous prediction)
   - `replayPendingInputs` (for reconciliation replay)

3. **Pass collision rects and world bounds into `createEntityStore`** (or into `applyInputToPosition`) so the prediction function can clamp and reject movement into walls, matching the server's behavior.

4. **Ensure constants match.** The client must use the same `PlayerRadius` (6.0) and world bounds as the server. Currently, the client has no concept of player radius.

The fix should be straightforward since the collision algorithm is simple (circle-vs-AABB with axis separation). The key architectural change is making `entityStore` aware of the map's collision geometry.
