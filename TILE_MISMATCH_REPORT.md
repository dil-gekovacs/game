# Tile Mismatch Investigation Report

## Screenshot Description

The in-game screenshot shows a prison dungeon map with:
- **Floor areas**: Light warm-grey tiles with a soft, blurry stone pattern
- **Wall areas**: Dark purple-grey tiles with indistinct crosshatch/mortar patterns
- **Fog of war**: Black overlays on undiscovered rooms
- Camera zoom: 4x (each 16x16 tile renders as 64x64 pixels)

The tiles appear washed out, lacking contrast, and with indistinct textures compared to the source tileset PNGs.

## What Tileset Is Loaded

The code in `tilesetRenderer.ts` (modified, not yet committed) loads:
```
prison_stone_v2.png (64x64, 4x4 grid of 16x16 Wang tiles)
```
Network request logs confirm the browser fetched `prison_stone_v2.png` successfully. The tileset loaded without error (no fallback to colored rectangles).

## What the Rendering Code Does

1. `loadTileset()` loads the 64x64 PNG via PixiJS `Assets.load()`, then extracts 16 sub-textures (16x16 each) using `Rectangle` frames keyed by Wang tile index (0-15).
2. `renderTileSprites()` iterates every tile position on the map grid, computes a Wang index by testing which corners overlap wall collision rects, then places a `Sprite` with the matching sub-texture.
3. The Wang index encoding (`(NW<<3)|(NE<<2)|(SW<<1)|SE`) and the bounding box coordinates in `WANG_TILES` were verified to match the `prison_stone_v2_metadata.json` exactly -- all 16 tiles map to the correct atlas positions.

## Root Cause: Bilinear Texture Filtering at 4x Zoom

**The tiles ARE rendering with the correct colors.** Pixel color sampling from the screenshot confirmed that floor pixels (R=169 G=159 B=157) and wall pixels (R=54 G=39 B=55) match the tileset PNG values (floor: R=140-185 G=125-177 B=126-173; wall: R=41-55 G=28-40 B=44-58) -- the screenshot values are interpolated midpoints.

The visual mismatch is caused by **PixiJS defaulting to bilinear (linear) texture filtering**. At 4x camera zoom, each 16x16 pixel-art tile is upscaled to 64x64 pixels using smooth interpolation, which:

- **Blurs all sharp pixel boundaries** between dark mortar lines and lighter stone faces
- **Averages out contrast**, making dark crevices and bright highlights merge into a uniform mid-tone
- **Destroys the pixel-art character**, turning crisp cobblestones into an amorphous grey wash

The tileset PNGs viewed at native 1:1 resolution show rich, detailed stone textures with clear mortar gaps and varied stone blocks. At 4x with bilinear filtering, all that detail smears into mush.

No `scaleMode` configuration exists anywhere in the frontend code -- `grep` for `SCALE_MODE`, `scaleMode`, `nearest`, or `TextureStyle` returned zero results.

## Recommended Fix

Set the texture scale mode to `nearest` (point/nearest-neighbor filtering) so pixel art upscales with crisp, sharp edges. Two approaches:

### Option A: Global default (recommended for a pixel-art game)

In `main.ts` before creating the PixiJS Application:

```typescript
import { TextureSource } from "pixi.js";
TextureSource.defaultOptions.scaleMode = "nearest";
```

### Option B: Per-texture (if mixing pixel art with smooth assets)

In `tilesetRenderer.ts` after loading the texture:

```typescript
const baseTexture = await Assets.load<Texture>(TILESET_PATH);
baseTexture.source.scaleMode = "nearest";
```

Option A is strongly recommended since the entire game uses pixel art (character sprites, tilesets, etc.).

## Files Involved

- `/Users/gekovacs/workspace/game/frontend/src/tilesetRenderer.ts` -- tileset loading and Wang tile rendering
- `/Users/gekovacs/workspace/game/frontend/src/mapRenderer.ts` -- calls tilesetRenderer, has fallback graphics
- `/Users/gekovacs/workspace/game/frontend/src/main.ts` -- PixiJS app creation (where global default should go)
- `/Users/gekovacs/workspace/game/frontend/public/assets/sprites/pixellab/tilesets/prison_stone_v2.png` -- current tileset
