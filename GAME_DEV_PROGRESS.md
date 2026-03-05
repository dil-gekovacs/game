# Game Dev Progress

## Implemented Features

### Priority 1: Player Respawn
- Added `RespawnTimer` and `SpawnX`/`SpawnY` fields to the `Player` struct
- When a player dies (HP reaches 0), `RespawnTimer` is set to 90 ticks (3 seconds)
- Each tick while dead, the timer decrements; when it hits 0, the player is restored:
  - HP reset to MaxHP
  - State reset to Idle
  - Position reset to spawn point
  - Flags restored (visible)
- Frontend already handles dead/alive state transitions via snapshots (gray tint, transparency)

### Priority 2: Aim-Direction Attack
- Replaced facing-direction attack hitbox (`inPrimaryAttackArc`) with aim-angle cone detection
- Attack now uses `player.LatestInput.AimAngle` (continuous angle from mouse) instead of `player.Facing` (4-directional)
- Hit detection: enemy must be within `PrimaryAttackRange` distance AND within a 60-degree cone centered on the aim direction
- Uses dot product of normalized vectors to check cone membership
- Removed `PrimaryAttackHalfWidth` constant, added `PrimaryAttackConeHalfAngle` (PI/6 = 30 degrees half-angle)

### Priority 3: Enemy Variety
- Added `Speed` and `ContactDamage` fields to the `Enemy` struct
- Defined 3 enemy archetypes assigned round-robin by spawn index:
  - **Standard**: speed 70, HP 100, damage 15
  - **Fast**: speed 100, HP 60, damage 10
  - **Tank**: speed 40, HP 200, damage 25
- Enemy movement and contact damage now use per-enemy stats instead of global constants

### Priority 4: Player Attack State in Snapshot
- Player state is now set to `2` (Attacking) when a primary attack fires
- State remains Attacking for the duration of the cooldown (12 ticks)
- When cooldown expires, state reverts to Idle (0) or Moving (1) based on current input
- Frontend receives this via the existing snapshot `state` field

## Files Changed
- `/Users/gekovacs/workspace/game/backend/internal/game/room.go` -- all 4 features
- `/Users/gekovacs/workspace/game/backend/internal/game/room_test.go` -- updated existing test, added 4 new tests

## Build/Test Results
- **Backend**: `go build ./...` -- success, `go test ./...` -- 11/11 tests pass
- **Frontend**: `npm run build` -- success (tsc + vite)
