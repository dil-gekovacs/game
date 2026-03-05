# Sprint 2 Plan — Tileset Rendering, Scrolling Map, Animations, Skeleton Enemy

## Parallel Agent Team

### Agent 1: Tileset Renderer
- Create `frontend/src/tilesetRenderer.ts` — render actual tile sprites from generated dungeon tileset
- Load `assets/sprites/pixellab/tilesets/dungeon_tileset.png` + metadata
- Auto-tile from collision data using Wang tile corner lookup
- Replace code-drawn floor rectangles in mapRenderer.ts with tile sprites
- **Edits**: `frontend/src/mapRenderer.ts`, creates `frontend/src/tilesetRenderer.ts`

### Agent 2: Scrolling Map Architect
- Research and plan how to implement a map that scrolls beneath the player as they approach screen edges
- Design: camera follows player with deadzone (player can move ~40% of screen before camera starts scrolling)
- Map becomes larger than one screen (e.g., 32x20 tiles instead of 16x10)
- Camera clamps to map boundaries
- All entities render in world-space; camera transform applied to worldContainer
- Write detailed implementation plan to `SCROLLING_MAP_PLAN.md`
- **Creates**: `SCROLLING_MAP_PLAN.md` (plan only, no code)

### Agent 3: PixelLab Animation Generator
- Focus on Knight and Grunt first (most needed for demo):
  - Knight: parry_start, parry_window, parry_success (if credits allow)
  - Grunt: walking-4-frames (all 4 dirs), attack (lead-jab), hurt (taking-punch), death (falling-back-death)
- If those complete, generate Skeleton Enemy:
  - Base character: "Skeletal warrior with rusted sword, bone-white body, glowing red eye sockets, tattered dark cloth remnants, NES retro pixel art style"
  - Size 32, same shared settings as other enemies
  - Animations: idle, walk, attack, hurt, death
- Download all to `assets/sprites/pixellab/`
- Sync new PNGs to `frontend/public/assets/sprites/pixellab/`
- **Creates**: PNGs in assets only

### Agent 4: Enemy Sprite Mapping
- Map enemy archetypes to different PixelLab character sprites in animationMap.ts
- Standard enemy → grunt_melee sprites
- Fast enemy → ranged_enemy sprites (they're smaller/lighter looking)
- Tank enemy → elite_brute sprites (larger, 48px)
- Update `getCharacterName()` to accept entity ID or archetype info
- Requires: server sends enemy archetype info (can use entity ID ranges: 1000-1009 standard, 1010-1019 fast, 1020+ tank)
- **Edits**: `frontend/src/animationMap.ts`

### Agent 5: Larger Dungeon Map
- Create a larger dungeon map (32x20 tiles = 512x320px) for scrolling
- Multiple connected rooms in one big map with internal walls creating corridors
- 6-8 enemy spawns spread across the map
- Interesting layout: entrance hall → corridor → main chamber → side rooms
- Save as `assets/maps/dungeon-large.json` + copy to public
- **Creates**: `assets/maps/dungeon-large.json`, `frontend/public/assets/maps/dungeon-large.json`

## Execution Order
All 5 agents run in parallel — no file conflicts:
- Agent 1: mapRenderer.ts + new tilesetRenderer.ts
- Agent 2: SCROLLING_MAP_PLAN.md (read-only research)
- Agent 3: PixelLab API + asset files only
- Agent 4: animationMap.ts only
- Agent 5: map JSON files only

## After This Sprint
- Wire scrolling camera into main.ts based on Agent 2's plan
- Switch to the larger dungeon map
- Integrate Skeleton enemy if generated
