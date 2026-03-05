# Prison Labyrinth Map Readiness Check

**Date:** 2026-03-05
**Map file:** `assets/maps/prison-labyrinth.json`

---

## 1. Map JSON Structure

| Check | Result |
|-------|--------|
| Has `width` (40) | PASS |
| Has `height` (30) | PASS |
| Has `tilewidth` (16) | PASS |
| Has `tileheight` (16) | PASS |
| Layer "Ground" (tilelayer) present | PASS |
| Layer "Collision" (objectgroup) present | PASS |
| Layer "Spawns" (objectgroup) present | PASS |
| Exactly 3 layers | PASS |
| Ground data length = width * height (1200) | PASS |
| All collision objects have `collidable: true` (bool) | PASS (63/63) |
| All spawn objects have valid type ("player" or "enemy") | PASS (18/18 player+enemy; 17 decoration objects also present, correctly ignored by server) |
| All player spawns have `facing` property (string) | PASS (4/4) |
| Object IDs unique | PASS (1..98, sequential) |

**Result: PASS**

---

## 2. Server Map Loading Compatibility

| Check | Result |
|-------|--------|
| Parser handles layer names "Ground", "Collision", "Spawns" | PASS - server matches on `layer.Name` for "Collision" and "Spawns" |
| `objectSpawnType()` recognizes object types | PASS - reads `obj.Type` directly; map uses "player" and "enemy" which match |
| `isCollidable()` works with property format | PASS - expects `{name: "collidable", type: "bool", value: true}`, map matches |
| `parseFacing()` works with property format | PASS - expects `{name: "facing", type: "string", value: "right"}`, map matches |
| Map dimensions read correctly | PASS - `width * tilewidth` = 640px, `height * tileheight` = 480px |
| **Server loads this map file** | **FAIL** - `loadStarterRoomRuntime()` hardcodes `"dungeon-large.json"`, and `NewRoom()` hardcodes `mapID: "dungeon-large"`. The server will never load `prison-labyrinth.json` without code changes. |

**Result: FAIL** -- the map format is fully compatible, but the server does not reference it.

---

## 3. Potential Issues

### 3a. Overlapping Collision Walls

8 pairs of collision rectangles overlap. These are non-blocking (the collision engine handles overlapping rects fine), but they indicate redundant geometry:

- obj 4 / obj 61 (2048 px^2)
- obj 7 / obj 63 (256 px^2)
- obj 9 / obj 13 (256 px^2)
- obj 11 / obj 13 (256 px^2)
- obj 36 / obj 37 (256 px^2)
- obj 37 / obj 58 (1024 px^2)
- obj 48 / obj 55 (256 px^2)
- obj 54 / obj 62 (768 px^2)

**Result: PASS (non-blocking, cosmetic only)**

### 3b. Spawn Points Inside Walls

**FAIL** -- Enemy spawn object 79 at (560, 432) is inside collision object 59 (rect 512,416 to 624,464). This enemy will be stuck in a wall on spawn and unable to move.

### 3c. Doorway Widths

Many passages between collision walls are exactly 16px (1 tile) wide. The game uses `PlayerRadius = 6.0` so a 16px corridor is technically passable (12px of entity diameter vs 16px gap), but movement will be very tight. There are 41 such narrow gaps detected.

**Result: PASS (technically passable)** -- but gameplay will feel cramped in many corridors. Consider widening key passages to 32px (2 tiles) for better feel.

### 3d. Ground Tile Data Length

Ground data array length = 1200, which equals width (40) * height (30). **PASS**

### 3e. Player Spawn Count

4 player spawns found. Current `MaxPlayers = 3`, planned expansion to 4. **PASS**

14 enemy spawns found. **PASS**

---

## 4. Frontend Public Directory

```
-rw-r--r--  1 gekovacs  staff  39965 Mar  5 20:49
frontend/public/assets/maps/prison-labyrinth.json
```

**Result: PASS** -- file exists and is accessible for client-side loading.

---

## Summary

| Category | Status |
|----------|--------|
| Map JSON structure | PASS |
| Server compatibility (format) | PASS |
| Server compatibility (loading) | **FAIL** -- hardcoded to dungeon-large.json |
| Overlapping walls | PASS (non-blocking) |
| Spawns inside walls | **FAIL** -- enemy spawn 79 stuck in wall |
| Doorway widths | PASS (tight but passable) |
| Ground data length | PASS |
| Player spawn count | PASS (4 spawns, meets 3+1 planned) |
| Frontend public directory | PASS |

### Verdict: NOT READY TO PLAY

Two issues must be fixed before the map can be used:

1. **Server code change required:** `loadStarterRoomRuntime()` in `room.go` must be updated to load `prison-labyrinth.json` (or accept a map name parameter). The `mapID` in `NewRoom()` also needs updating.

2. **Enemy spawn 79 at (560, 432) is inside collision wall 59.** Move this spawn outside the collision rect (e.g., to approximately (560, 400) or another open area in the southern dungeon).

Optional improvement: widen 16px corridors to 32px for smoother gameplay.
