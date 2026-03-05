# MAP-HANDOFF

## Implementation priorities
1. **Schema alignment pass**
   - Enforce `Ground`, `Collision`, `Spawns` layers in each new room JSON.
   - Include `collidable:true` on all collision rectangles.
   - Include spawn `type` and `spawn_type` property for compatibility.
2. **Room-by-room blockout**
   - Build geometry and exits first, then add combat spawns.
3. **Transition gate implementation**
   - Use co-op gather requirement at exits (all players present).
4. **Script metadata plumbing**
   - Support trigger-driven waves and key/unlock events from spawn object properties.
5. **Balancing pass**
   - Tune enemy counts and wave timings after end-to-end traversal works.

## Map build order
1. `room-r0-entry.json` (onboarding baseline)
2. `room-r1-fork.json` (split/regroup)
3. `room-r2-switch-gallery.json` (trigger wave)
4. `room-r3-crossfire.json` (cover combat)
5. `room-r4-lock-key.json` (key loop)
6. `room-r5-mini-boss.json` (encounter climax)
7. `room-r6-sanctuary.json` (reward/checkpoint)

## Integration checklist
- Add each room to `assets/maps/maps.json` once file exists.
- Confirm each room has at least one valid player spawn ID used as `default_spawn`.
- Validate collision bounds against expected 16x10 tile extents.
- Smoke test room transitions and authoritative spawn events in multiplayer session.

## Source design docs
- `assets/maps/design/creative-map-kit.md`
- `assets/maps/design/room-index.json`
