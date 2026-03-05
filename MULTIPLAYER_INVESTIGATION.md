# Multiplayer Investigation Report

**Symptom:** Only the number of players is communicated (HUD updates on join/leave), but movement and combat of remote players and enemies are not visible.

---

## Data Flow Trace

### Server Side (Working Correctly)

1. **`room.go:681` `sendSnapshots()`** builds entity deltas for ALL players and ALL enemies via `buildEntityDeltasLocked()` (line 599), then sends the same entity list to every connected player. This is correct -- every client receives deltas for every entity.

2. **`room.go:623` `buildEntityDeltaFromPlayer()`** and **`room.go:652` `buildEntityDeltaFromEnemy()`** both populate all fields (x, y, vx, vy, facing, state, hp, etc.) as non-nil pointers, so they always serialize to JSON.

3. **`messages.go:40-53` `EntityDelta`** struct uses `omitempty` JSON tags. Since all pointer fields are non-nil (set in build functions), all fields are included in the JSON output. Field names match the TypeScript/schema (`id`, `type`, `state`, `facing`, `hp`, `maxHp`, `animFrame`, `x`, `y`, `vx`, `vy`, `flags`).

4. **`messages.go:78-83` `WorldSnapshotMsg`** uses `"type": "WorldSnapshot"` which matches `MSG.WORLD_SNAPSHOT` in TypeScript. All field names match (`tick`, `ackSeq`, `entities`).

5. **`ws.go:57-62`** On player join, the server sends `PlayerJoined` for all existing peers to the new client, AND broadcasts the new player's `PlayerJoined` to existing clients. This means all connected players know about each other.

### Client Side (Where It Breaks)

6. **`wsClient.ts:17-25`** Message validation checks `serverMessageTypes` set which includes `MSG.WORLD_SNAPSHOT`. Messages pass validation.

7. **`main.ts:160-162`** `WORLD_SNAPSHOT` handler calls `entityStore.applySnapshot(serverMessage.entities, serverMessage.ackSeq)`.

8. **`entityStore.ts:170-176` `applySnapshot()` -- THIS IS THE ROOT CAUSE:**
   ```typescript
   const applySnapshot = (entityDeltas: EntityDelta[], ackSeq: number) => {
     for (const delta of entityDeltas) {
       const record = entities.get(delta.id);
       if (!record) {
         continue;  // <--- SILENTLY DROPS UNKNOWN ENTITIES
       }
       applyDeltaToEntity(record, delta);
     }
   ```

   The entity store **only applies deltas to entities that already exist in the store**. If an entity ID is not in the `entities` Map, the delta is silently skipped.

   Entities are added to the store ONLY via:
   - `upsertEntity()` -- called from `handleServerMessage` when `MSG.PLAYER_JOINED` is received (main.ts:147)

   **Enemies are NEVER added to the entity store.** The server creates enemies in `initEnemies()` (room.go:727) with IDs starting at 1000, but there is no "EnemyJoined" or "EntitySpawned" lifecycle message. Enemies only appear in `WorldSnapshot` entity deltas, which are dropped because their IDs don't exist in the store.

9. **Remote players joining BEFORE the current client** are handled: `ws.go:57-59` sends `PlayerJoined` for each existing peer. So remote player entities ARE created in the store and their snapshot deltas ARE applied. **Remote player movement should work.**

---

## Root Causes

### Root Cause #1 (Critical): Enemies never added to entity store

**File:** `entityStore.ts:172-174`

Enemies (entity IDs >= 1000) are created server-side in `room.go:727-745` but no lifecycle message is sent to clients. The server sends enemy state in every `WorldSnapshot`, but `applySnapshot()` skips them because `entities.get(delta.id)` returns `undefined`.

**Impact:** All enemies are invisible. No enemy movement, no enemy combat visible.

**Fix:** In `applySnapshot()`, when a delta is received for an unknown entity ID, create a new entity record from the delta fields instead of skipping it:

```typescript
// entityStore.ts applySnapshot(), replace the skip with:
if (!record) {
  if (delta.x !== undefined && delta.y !== undefined && delta.type !== undefined) {
    const newSnapshot: EntitySnapshot = {
      id: delta.id,
      type: delta.type ?? 0,
      state: delta.state ?? 0,
      facing: delta.facing ?? 0,
      hp: delta.hp ?? 0,
      maxHp: delta.maxHp ?? 0,
      animFrame: delta.animFrame ?? 0,
      x: delta.x ?? 0,
      y: delta.y ?? 0,
      vx: delta.vx ?? 0,
      vy: delta.vy ?? 0,
      flags: delta.flags ?? 0,
    };
    entities.set(delta.id, {
      current: newSnapshot,
      predictedX: newSnapshot.x,
      predictedY: newSnapshot.y,
      previousX: newSnapshot.x,
      previousY: newSnapshot.y,
    });
  }
  continue;
}
```

### Root Cause #2 (Potential): Remote player rendering may appear frozen

**File:** `entityRenderer.ts:479-483`

Remote entities use interpolation toward `record.current.x` / `record.current.y`. This works correctly IF the entity store is being updated, which it IS for remote players (since they have `PlayerJoined` lifecycle messages). So remote player movement SHOULD work -- but only if the snapshot deltas are being applied.

**Verification needed:** If the symptom is "only player count is communicated," it could mean that remote player circles appear (from `PlayerJoined` -> `upsertEntity`) but never move. However, the code shows `applySnapshot` DOES update existing records. So remote players should move. The more likely interpretation is that enemies (the primary "other entities") are invisible.

### Root Cause #3 (Minor): Entity despawn removes from store, but respawned enemies are still unknown

**File:** `main.ts:167-169`

When an enemy is killed, an `EntityDespawn` event removes it from the store. When it respawns (server sets `Dead=false`, `Flags=1`), the snapshot delta is again dropped because the entity was removed and there's no re-add mechanism.

---

## Summary

| # | Issue | File:Line | Severity |
|---|-------|-----------|----------|
| 1 | `applySnapshot` skips entities not in store | `entityStore.ts:172-174` | **Critical** -- all enemies invisible |
| 2 | No lifecycle message for enemy spawn/respawn | `room.go:727` / `ws.go` (missing) | **Critical** -- server never tells clients about enemies |
| 3 | `EntityDespawn` event removes entity, blocking respawn updates | `main.ts:167-169` | **Medium** -- respawned enemies invisible even after fix #1 unless handled |

## Recommended Fix Priority

1. **(P0)** Modify `applySnapshot()` in `entityStore.ts` to auto-create entity records from snapshot deltas when the entity ID is unknown. This is the minimal fix that makes enemies visible and handles all future entity types without requiring new lifecycle messages.

2. **(P1)** Alternatively or additionally, add server-side `EntitySpawn` events for enemies at room initialization and respawn, mirroring the `PlayerJoined` pattern. This provides cleaner entity lifecycle management.

3. **(P1)** Reconsider the `EntityDespawn` -> `removeEntity()` call in `main.ts:168`. Instead of removing the entity, mark it as despawned/invisible and let the snapshot system handle respawn by updating the existing record. This prevents the gap where a respawned enemy's first few snapshots are dropped.
