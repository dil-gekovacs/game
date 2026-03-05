# Next Steps -- Development Plan

## Section 1: Current State Assessment

### What Works End-to-End

- **Go backend**: 30Hz authoritative sim, 20Hz snapshots, player join/leave, WASD movement, aim-direction melee attacks (60-degree cone), enemy AI (chase + contact damage), player/enemy death/respawn, 3 enemy archetypes (standard/fast/tank)
- **TypeScript/PixiJS frontend**: WebSocket connection, 30Hz input send, snapshot receive, client-side prediction with collision-aware reconciliation, 60Hz game loop, health bars, attack arc visuals, damage flash, screen shake, HUD
- **Shared protocol**: JSON over WebSocket, typed messages, entity deltas with partial updates
- **Map loading**: Tiled JSON on both client and server, collision rects + spawn points
- **E2E tests**: Playwright with smoke + multiplayer sync tests

### What the Demo Looks Like Now

All entities render as **colored circles** (green=local player, blue=remote, red=enemies). The map is code-drawn rectangles. No tile sprites, no character sprites.

### Remaining Issues

- EntityDespawn removes entity from store; respawned enemies may briefly flicker before auto-create picks them up
- No game-over/victory UI (just HUD text)
- `animFrame` always 0 from server -- animation must be client-driven
- Client map data is hardcoded, not loaded from JSON

---

## Section 2: Sprite Integration Plan

### 2.1 Which Spritesheets to Use

**Primary: PixelLab-generated sprites** (all 8 characters with 4-direction static rotations, Knight has idle+walk animations). **Fallback: ArMM1998 Zelda-like pack** (CC0, complete walk+attack spritesheet).

**Phased approach:**
1. **Phase 1**: PixelLab knight for players, grunt_melee for enemies. Static rotations for states without animations.
2. **Phase 2**: Generate remaining animations (attack, hurt, death). Use ArMM1998 as fallback.
3. **Phase 3**: Integrate dungeon tileset for map rendering.

### 2.2 Spritesheet Layout

PixelLab outputs are individual 32x32 PNGs per frame. Steps:

1. **Pack into atlas**: Run `tools/sprites/pack_atlas.py` to combine PNGs into `atlas.png` + `atlas.json`
2. **Load in PixiJS**: Create `frontend/src/spriteLoader.ts` to load atlas as a PixiJS Spritesheet
3. **Serve from public/**: Copy atlas files to `frontend/public/assets/sprites/`

### 2.3 EntityState to Animation Mapping

Create `frontend/src/animationMap.ts`:

| EntityState | Knight Animation | Grunt Animation |
|---|---|---|
| Idle (0) | `breathing-idle` (4 frames, loop) | `breathing-idle` or static |
| Moving (1) | `walking-4-frames` (4 frames, loop) | static rotation |
| Attacking (2) | static rotation (no anim yet) | static rotation |
| Dead (5) | static rotation | static rotation |

Direction mapping: `Facing.Down -> "south"`, `Up -> "north"`, `Left -> "west"`, `Right -> "east"`

### 2.4 entityRenderer.ts Rewrite

Replace `body: Graphics` + `facing: Graphics` with `sprite: Sprite`:
- Create sprites from atlas textures instead of drawing circles
- Add `animStartMs`, `currentFrameIndex`, `cachedState` to EntityMarker
- Each render frame: compute frame index from elapsed time, update `sprite.texture`
- Dead entities: `sprite.tint = 0x888888`, `container.alpha = 0.3`
- Remove `drawMarkerBody`, `getFacingVector` -- facing is implicit in sprite direction
- Keep flash effects, arc effects, screen shake as code-drawn overlays

### 2.5 Sprite Scale

Sprites are 32x32 canvas, character ~19px tall. World is 256x160 (16x10 tiles at 16px).
**Set `sprite.scale.set(0.5)`** for 16x16 effective size = one tile. No server changes needed.

### 2.6 Entity Type Handling

- **Player (0)**: `knight` spritesheet (later: select by CharacterClass)
- **Enemy (1)**: `grunt_melee` spritesheet (later: distinguish archetypes)
- **Projectile (2)**: Keep as code-drawn circle
- **Item (3)**: Keep as code-drawn circle or static sprite

### 2.7 Tileset Integration

PixelLab dungeon tileset: 64x64 PNG with 16 Wang tiles (4x4 grid of 16x16). Auto-tile from collision data:
- For each tile position, sample 4 neighbors (wall vs floor)
- Look up matching Wang tile from corner configuration
- Render as Sprite instead of code-drawn rectangle

### 2.8 New Files Needed

| File | Purpose |
|---|---|
| `frontend/src/spriteLoader.ts` | Load atlas PNG+JSON, create PixiJS Spritesheet |
| `frontend/src/animationMap.ts` | Map (EntityType, EntityState, Facing) to frame keys + timing |
| `frontend/src/tilesetRenderer.ts` | Load tileset, auto-tile from collision data |

### 2.9 Files to Change

| File | Changes |
|---|---|
| `frontend/src/main.ts` | Async atlas load before game start, pass spritesheet to renderer |
| `frontend/src/entityRenderer.ts` | Circles -> Sprites + animation cycling |
| `frontend/src/mapRenderer.ts` | Code rects -> tileset sprites, keep collision export |

---

## Section 3: Gameplay Feature Roadmap

Ordered by demo impact:

1. **Sprite integration** (Section 2) -- circles to pixel art characters
2. **Game over / victory screen** -- full-screen overlay with result text
3. **Room transitions** -- server + client support for multi-room progression (R0-R1 minimum)
4. **Mage class + projectiles** -- second playable class with ranged attack
5. **Sound effects** -- Web Audio API, trigger on attack/hit/death
6. **Score tracking** -- enemies killed per player in HUD

---

## Section 4: Technical Debt

| Issue | Location | Fix |
|---|---|---|
| Hardcoded `STARTER_ROOM_COLLISIONS` | `mapRenderer.ts:27-30` | Load from map JSON |
| Hardcoded speed/radius constants | `entityStore.ts:50-52` | Share from server or config |
| Entity despawn removes from store | `main.ts:168` | Mark invisible instead of delete |
| No client-side map JSON loading | `mapRenderer.ts` | Add map JSON parser |
| `animFrame` always 0 | `room.go` | Document as client-driven or implement server-side |
| Duplicated map data (3 places) | server, client hardcoded, JSON file | Single source: JSON file |

---

## Section 5: Estimated Effort

| Task | Effort | Impact |
|---|---|---|
| Atlas packing (run tool, configure) | 0.5h | Prerequisite |
| `spriteLoader.ts` | 1h | Prerequisite |
| `animationMap.ts` | 1h | Prerequisite |
| `entityRenderer.ts` rewrite (circles -> sprites) | 3h | Highest visual impact |
| `main.ts` integration (async load) | 0.5h | Wiring |
| **Subtotal: Character sprites** | **6h** | **Demo transforms from circles to pixel art** |
| Tileset renderer + map rewrite | 5h | Second biggest visual improvement |
| Game over/victory screen | 1.5h | Completeness |
| Client map JSON loader | 2h | Enables room transitions |
| Room transition system | 6h | Gameplay depth |
| Mage class + projectiles | 5h | Gameplay variety |
| Sound effects | 2h | Polish |

**Recommended first sprint: Character sprite integration (6h) + game over screen (1.5h) = 7.5h.** This is the highest-impact work for transforming the demo.
