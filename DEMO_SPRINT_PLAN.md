# Demo Sprint Plan — 2 Hour Window

## Context
- Servers running (backend :8080, frontend :5173)
- Sprite generator agent still running (93 PNGs so far, Knight has idle+walk anims, all 8 characters have static rotations, dungeon tileset done)
- E2E tests passing (smoke + multiplayer sync)
- Game has: movement, combat, enemies, respawn, prediction, collision — all as colored circles

## Goal
Transform the demo from colored circles to animated pixel art with proper game flow.

## Wave 1 — Parallel, No File Conflicts (create new files only)

### Agent A: Sprite Pipeline
- Run `tools/sprites/pack_atlas.py` (or write a simple packer) to combine PixelLab PNGs into a single atlas
- Create `frontend/src/spriteLoader.ts` — load atlas PNG+JSON into PixiJS Spritesheet
- Create `frontend/src/animationMap.ts` — map (EntityType, EntityState, Facing) to atlas frame keys + timing
- Output atlas to `frontend/public/assets/sprites/`
- **Creates**: `spriteLoader.ts`, `animationMap.ts`, atlas files
- **Edits**: nothing existing

### Agent B: Game Over Screen
- Create `frontend/src/gameOverScreen.ts` — overlay module for victory/defeat
- Semi-transparent dark background + centered result text
- Exported functions: `showGameOver(victory: boolean)`, `hideGameOver()`, `isGameOverVisible()`
- Pure DOM overlay on top of the canvas
- **Creates**: `gameOverScreen.ts`
- **Edits**: nothing existing

### Agent C: Map Loader
- Create `frontend/src/mapLoader.ts` — load and parse Tiled JSON
- Extract: tile data, collision rects, spawn points, world dimensions
- Return typed data structure that mapRenderer and entityStore can consume
- Fetch map JSON from `public/assets/maps/` via HTTP
- **Creates**: `mapLoader.ts`
- **Edits**: nothing existing

### Agent D: Room Designer
- Create `assets/maps/room-r0-entry.json` and `assets/maps/room-r1-fork.json`
- Follow Tiled JSON format matching `starter-room.json`
- Use designs from `assets/maps/design/creative-map-kit.md`
- Update `assets/maps/maps.json` registry
- **Creates**: room JSON files
- **Edits**: `assets/maps/maps.json` only

### Agent E: PixelLab Tilesets
- Check PixelLab API for available job slots
- If available: generate floor variation tileset + water/pit tileset
- Download results to `assets/sprites/pixellab/tilesets/`
- If blocked by limits: skip and report
- **Creates**: tileset PNGs in assets only
- **Edits**: nothing

## Wave 2 — Parallel Rewrites Using Wave 1 Outputs

### Agent F: Entity Renderer Rewrite
- Replace Graphics circles with PixiJS Sprites in `entityRenderer.ts`
- Use `spriteLoader.ts` and `animationMap.ts` from Agent A
- Add animation frame cycling based on EntityState + elapsed time
- Keep flash effects, arc effects, screen shake as code overlays
- Set sprite scale 0.5 (32px canvas → 16px effective)
- **Edits**: `frontend/src/entityRenderer.ts`
- **Depends on**: Agent A

### Agent G: Entity Lifecycle + Map Renderer
- Fix entity despawn/respawn flicker in `entityStore.ts` (mark invisible instead of deleting)
- Rewrite `mapRenderer.ts` to use `mapLoader.ts` from Agent C
- Keep collision rect export for entityStore
- **Edits**: `frontend/src/entityStore.ts`, `frontend/src/mapRenderer.ts`
- **Depends on**: Agent C

## Wave 3 — Final Wiring

### Agent H: Main Integration
- Wire everything into `main.ts`:
  - Async sprite atlas load before game start
  - Pass spritesheet to entity renderer
  - Use map loader instead of hardcoded renderStarterRoom
  - Wire game over screen to GAME_OVER messages
  - Copy map JSONs to `frontend/public/assets/maps/`
- **Edits**: `frontend/src/main.ts`
- **Depends on**: Agents F + G

## Timing
- Wave 1: ~10 min (5 agents parallel)
- Wave 2: ~15 min (2 agents parallel)
- Wave 3: ~10 min (1 agent)
- Buffer: 25 min for iteration/fixes
- **Total: ~60 min active, well within 2 hours**

## PixelLab Status
- 8 concurrent job limit
- Sprite generator agent may still be using slots
- Agent E should check before queuing

## Validation After Each Wave
```bash
cd /Users/gekovacs/workspace/game/frontend && npm run build
cd /Users/gekovacs/workspace/game/e2e && npx playwright test
```
