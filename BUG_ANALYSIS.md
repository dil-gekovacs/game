# Bug Analysis Report

## Bug 1: Knight sprite is static / does not change facing direction

### Analysis

The full server-to-client path for the `facing` field was traced:

**Server side (correct):**
- `updateFacingFromVector()` at `room.go:579-593` correctly updates `player.Facing` (0=Down, 1=Up, 2=Left, 3=Right) based on movement vector whenever `magnitude > 0.001` (called at `room.go:371`).
- `buildEntityDeltaFromPlayer()` at `room.go:665-692` always includes `Facing: &facing` in the EntityDelta. The Go `omitempty` tag on the pointer field only omits nil pointers, so facing=0 (Down) is still serialized.

**Client side (correct):**
- `applyDeltaToEntity()` at `entityStore.ts:196-198` applies `delta.facing` to the entity record whenever defined.
- `renderEntitiesSprite()` at `entityRenderer.ts:644-726` calls `updateSpriteAnimation()` on every render frame for non-dead entities (line 698), passing `record.current.facing`.
- `updateSpriteAnimation()` at `entityRenderer.ts:573-606` converts facing to a direction string via `getFacingDirection()` and sets `marker.sprite.texture` on every call -- all three code paths (static rotation, missing direction fallback, animated frame) update the texture with the current direction.
- `getFacingDirection()` at `animationMap.ts:50-52` correctly maps `Facing` enum values to direction strings (Down->south, Up->north, Left->west, Right->east).
- `getTexture()` at `spriteLoader.ts:165-188` returns distinct Texture objects per direction from the texture map.

### Root cause hypothesis

**No code-level defect was found in the facing update path.** The sprite texture is updated every frame with the current facing direction from the server. Two possible explanations:

1. **Map loading failure (HIGH confidence):** If `loadStarterRoomRuntime()` fails (see Bug 3 analysis), the fallback map is 800x600 while the client renders a 512x320 map. Player spawns at (100, 300) would be outside the client's map bounds, causing severe coordinate mismatch. The camera/rendering might behave unexpectedly, though facing updates would still occur.

2. **Asset issue (MEDIUM confidence):** The directional PNG sprites for the knight may look visually similar across directions, making facing changes imperceptible.

**Confidence level:** LOW (no definitive code bug found)

### Recommended fix

Verify the sprite PNG assets differ visually across directions. If the issue is coordinate mismatch from the fallback map, fixing Bug 3 resolves this.

---

## Bug 2: Spacebar attack doesn't work

### Analysis

**Input capture (correct):**
- `input.ts:79` maps Space to mouseLeft: `mouseLeft: mouseLeft || pressedKeys.has("Space")`
- `KeyboardEvent.code` for spacebar is `"Space"` -- matches the string exactly.

**Input to server (correct):**
- `main.ts:229` maps mouseLeft to primary: `primary: inputSnapshot.mouseLeft`
- `sendInputMessage()` at `main.ts:217-238` is called at 30Hz when `elapsedSinceInputSend >= INPUT_SEND_INTERVAL_MS` (line 266-268).
- The server handler at `ws.go:110-118` correctly maps `typed.Primary` to `game.PlayerInput.Primary`.

**Attack arc visual (correct):**
- `main.ts:259-261`: edge detection fires `triggerAttackArc()` when `currentInput.mouseLeft` transitions false->true. This works with Space (first press triggers the arc).

**Server processing (correct):**
- `room.go:391-394`: `input.Primary && player.PrimaryCooldownRemaining == 0` triggers `applyPrimaryAttackLocked()`.
- The attack uses `player.LatestInput.AimAngle` to determine the cone direction (`room.go:460`). With Space-only input (no mouse click), `aimAngle` is computed from the pointer position relative to the player's screen position via `getAimAngle()` at `main.ts:147-158`. The cursor stays wherever the mouse last was, so the aim direction is valid.

### Root cause hypothesis

**The spacebar attack mechanism works correctly.** The visual attack arc appears, and the server processes the attack. The perceived failure is almost certainly due to **Bug 3 (no enemies)** -- the attack fires but hits nothing because the dungeon has no enemies to damage.

**Confidence level:** HIGH that the bug is a consequence of Bug 3, not an independent issue.

### Recommended fix

Fix Bug 3 (enemy spawning). Once enemies exist, Space attacks should work as intended.

---

## Bug 3: No enemies in the dungeon

### Analysis

**Map loading path:**
- `loadStarterRoomRuntime()` at `room.go:846-905` uses `runtime.Caller(0)` to locate `room.go`, then navigates `../../../assets/maps/dungeon-large.json`.
- If this function returns `ok=false`, `NewRoom()` at `room.go:158-161` falls back to `fallbackRuntimeMap()`.

**The fallback map has NO enemy spawns:**
- `fallbackRuntimeMap()` at `room.go:805-815` only sets `WidthPx`, `HeightPx`, and `PlayerSpawns`. The `EnemySpawns` field defaults to `nil`.
- `initEnemies(nil)` at `room.go:782` iterates a nil slice (zero iterations), creating zero enemies.

**The map file is correct:**
- `/Users/gekovacs/workspace/game/assets/maps/dungeon-large.json` exists and contains 10 enemy spawn objects in the "Spawns" layer, all with `"type": "enemy"`.
- `objectSpawnType()` at `room.go:918-927` correctly falls back to `obj.Type` when no `spawn_type` property exists, returning `"enemy"`.
- The Spawns/Collision layer parsing logic at `room.go:870-899` is correct.

**Why `loadStarterRoomRuntime()` may fail:**
- `runtime.Caller(0)` returns the source file path recorded at **compile time**. If the Go binary is compiled and then run from a different machine, working directory, or after the source tree is relocated, the absolute path baked into the binary will not resolve, causing `os.ReadFile()` to fail silently.
- The function returns `(mapRuntime{}, false)` on any error (file not found, JSON parse failure) with no logging, making this failure completely silent.

**Cascade effect:**
- Fallback map is 800x600; client loads dungeon-large.json which is 512x320 (32*16 x 20*16). This world-size mismatch means the client and server disagree on world bounds, causing additional visual issues.

### Root cause hypothesis

`loadStarterRoomRuntime()` fails silently at runtime (most likely `os.ReadFile` cannot find the map file using the `runtime.Caller(0)` path), causing the fallback map with zero enemy spawns to be used. This is the **primary bug** that also causes Bug 2 to appear broken.

**Confidence level:** HIGH

**Code references:**
- `room.go:846-851` -- `runtime.Caller(0)` path resolution
- `room.go:805-815` -- `fallbackRuntimeMap()` with no EnemySpawns
- `room.go:157-161` -- silent fallback in `NewRoom()`

### Recommended fixes

1. **Add error logging** to `loadStarterRoomRuntime()` so failures are visible:
   ```go
   data, err := os.ReadFile(mapPath)
   if err != nil {
       log.Printf("WARN: failed to load map %s: %v", mapPath, err)
       return mapRuntime{}, false
   }
   ```

2. **Use a more robust path resolution** instead of `runtime.Caller(0)`. Options:
   - Embed the JSON file using `//go:embed assets/maps/dungeon-large.json`
   - Accept the map path as a command-line flag or environment variable
   - Use a path relative to the working directory rather than the source file

3. **Add enemy spawns to the fallback map** as a safety net:
   ```go
   func fallbackRuntimeMap() mapRuntime {
       ...
       enemies := []spawnPoint{
           {X: 200, Y: 300, Facing: 0},
           {X: 400, Y: 150, Facing: 0},
           {X: 600, Y: 300, Facing: 0},
       }
       return mapRuntime{
           ...
           EnemySpawns: enemies,
       }
   }
   ```

4. **Ensure world dimensions match** between server and client. If the fallback is used, the server should communicate the world size so the client can adapt, or the server should reject the fallback and fail loudly.

---

## Summary

| Bug | Root Cause | Confidence | Fix Priority |
|-----|-----------|------------|-------------|
| Bug 3 (No enemies) | `loadStarterRoomRuntime()` silently fails; fallback has no enemy spawns | HIGH | P0 -- fixes Bug 2 as well |
| Bug 2 (Space attack) | Consequence of Bug 3; attack fires but nothing to hit | HIGH | Resolved by fixing Bug 3 |
| Bug 1 (Static sprite) | No code defect found; possibly asset issue or coordinate mismatch from Bug 3's fallback | LOW | Investigate after Bug 3 is fixed |
