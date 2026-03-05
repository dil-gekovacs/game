# BE Agent Handoff: Post One-Map Demo Backend Slice

## Mission
Build the next backend slice after the one-map playable demo: add class-ability combat depth (starting with Ranger bow/net), harden authoritative combat state, and prepare for multi-room progression.

## Class roster update
- Player roster is now four classes: **Knight, Mage, Cleric, Ranger**.
- Ranger requirements: **bow-and-arrow on primary input** and **thrown net on secondary input**.

## Current Status (from `backend/PROGRESS.md`)
- Authoritative movement is complete.
- Map-driven collision/spawn runtime is complete.
- Enemy MVP simulation and primary-attack damage/kill events are complete.
- Local multi-client smoke validation has passed.

## Definition of Success
In `starter-room`, 1-3 local clients can run class-aware combat where:
1. Ranger uses bow on primary and thrown net on secondary with authoritative resolution.
2. Projectile and crowd-control outcomes are fully server-owned and replicated via snapshots/events.
3. Enemy state transitions (normal, rooted, dead) remain deterministic and synchronized.
4. Existing movement/collision behavior and room stability remain intact.

## Mandatory Context
- `ARCHITECTURE.md`
- `go-guidelines.md`
- `shared/INTEGRATION_CONTRACT.md`
- `shared/protocol/messages.ts`
- `assets/maps/map-schema.json`
- `assets/maps/maps.json`
- `assets/maps/starter-room.json`

## File ownership
Edit only:
- `backend/internal/game/**`
- `backend/internal/server/**`
- `backend/internal/protocol/**` (only if required)
- `backend/README.md` (run/demo notes)

Do not edit:
- `frontend/**`, `shared/**`, `assets/sprites/**`, `tools/**`, `infra/**`

## Implementation Plan (ordered)

### Phase 1 — Add authoritative projectile layer
1. Add projectile entities to room state with owner, direction, speed, TTL.
2. Spawn projectile on Ranger primary (`bow`) input under server cooldown control.
3. Simulate projectile movement on fixed tick with map collision and enemy hit resolution.
4. Broadcast projectile entity deltas and despawn events deterministically.

### Phase 2 — Add authoritative Ranger net CC
1. Consume Ranger secondary (`net`) input with separate cooldown budget.
2. Apply hit test and assign rooted state to enemy with fixed root duration.
3. Ensure rooted enemies stop movement and resume cleanly after duration.
4. Emit event messages for net apply/expire for frontend feedback.

### Phase 3 — Harden combat/event model
1. Formalize per-entity combat states and durations in room simulation.
2. Ensure event sequencing is stable (damage before despawn, root before movement halt).
3. Prevent duplicate-hit edge cases from the same projectile/net instance.

### Phase 4 — Prep for room progression
1. Introduce minimal room-clear condition (all enemies dead) in server state.
2. Emit a deterministic room-complete event as a hook for FE transitions.
3. Preserve compatibility with current single-room flow.

## Validation (required)
```bash
cd backend
gofmt -w ./cmd ./internal
go test ./...
go build ./...
```

## Local Demo Smoke Test (required)
1. Run backend.
2. Run frontend and connect 2 browser tabs to same `roomId` (different `playerId`).
3. Verify:
   - Ranger primary spawns authoritative arrows that can hit/despawn enemies,
   - Ranger secondary net roots enemies and expires correctly,
   - projectiles and root states are synchronized across tabs,
   - both tabs remain stable during join/leave while combat is active.

## Definition of Done
- Ranger bow + net are authoritative and replicated.
- Projectile + root-control simulation is deterministic at current tick rate.
- Existing movement/collision/enemy baseline behavior is not regressed.
- Build/tests pass and local multi-client demo flow works.

## Agent response format
1. Files changed.
2. Projectile and net-control implementation details.
3. Enemy state transition handling for root/damage/death.
4. Any protocol/event shape updates.
5. Validation + smoke test results.
