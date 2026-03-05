import { Assets, Rectangle, Sprite, Texture } from "pixi.js";
import type { Container } from "pixi.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILESET_PATH = "assets/sprites/pixellab/tilesets/fantasy_walls.png";
const TILE_SIZE = 16;

/**
 * Corner terrain types used by the Wang tile system.
 * "lower" = floor, "upper" = wall.
 */
const LOWER = 0;
const UPPER = 1;

/**
 * Wang tile definitions extracted from the fantasy_walls_metadata.json.
 * Each entry maps a Wang index to its bounding box in the atlas and its
 * corner configuration encoded as { NW, NE, SW, SE } using 0=lower, 1=upper.
 */
type WangTileDef = {
  x: number;
  y: number;
  nw: number;
  ne: number;
  sw: number;
  se: number;
};

/**
 * All 16 Wang tiles from the metadata, keyed by their Wang index (0-15).
 * The Wang index encodes corners as a 4-bit number:
 *   bit 3 = NW, bit 2 = NE, bit 1 = SW, bit 0 = SE
 */
const WANG_TILES: Record<number, WangTileDef> = {
  0:  { x: 32, y: 16, nw: LOWER, ne: LOWER, sw: LOWER, se: LOWER },
  1:  { x: 48, y: 16, nw: LOWER, ne: LOWER, sw: LOWER, se: UPPER },
  2:  { x: 32, y: 32, nw: LOWER, ne: LOWER, sw: UPPER, se: LOWER },
  3:  { x: 16, y: 32, nw: LOWER, ne: LOWER, sw: UPPER, se: UPPER },
  4:  { x: 32, y: 0,  nw: LOWER, ne: UPPER, sw: LOWER, se: LOWER },
  5:  { x: 48, y: 32, nw: LOWER, ne: UPPER, sw: LOWER, se: UPPER },
  6:  { x: 0,  y: 16, nw: LOWER, ne: UPPER, sw: UPPER, se: LOWER },
  7:  { x: 48, y: 48, nw: LOWER, ne: UPPER, sw: UPPER, se: UPPER },
  8:  { x: 16, y: 16, nw: UPPER, ne: LOWER, sw: LOWER, se: LOWER },
  9:  { x: 32, y: 48, nw: UPPER, ne: LOWER, sw: UPPER, se: LOWER },
  10: { x: 16, y: 0,  nw: UPPER, ne: LOWER, sw: UPPER, se: LOWER },
  11: { x: 0,  y: 32, nw: UPPER, ne: LOWER, sw: UPPER, se: UPPER },
  12: { x: 48, y: 0,  nw: UPPER, ne: UPPER, sw: LOWER, se: LOWER },
  13: { x: 0,  y: 0,  nw: UPPER, ne: UPPER, sw: UPPER, se: LOWER },
  14: { x: 16, y: 48, nw: UPPER, ne: UPPER, sw: LOWER, se: UPPER },
  15: { x: 0,  y: 48, nw: UPPER, ne: UPPER, sw: UPPER, se: UPPER },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CollisionRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type TilesetData = {
  tileTextures: Map<number, Texture>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the Wang tile index for a given tile position by examining
 * which corners overlap with wall collision rects.
 *
 * Wang index = (NW << 3) | (NE << 2) | (SW << 1) | SE
 */
function computeWangIndex(
  tileX: number,
  tileY: number,
  collisions: CollisionRect[],
): number {
  const pixelX = tileX * TILE_SIZE;
  const pixelY = tileY * TILE_SIZE;
  const halfTile = TILE_SIZE / 2;

  const nwX = pixelX + halfTile / 2;
  const nwY = pixelY + halfTile / 2;
  const neX = pixelX + TILE_SIZE - halfTile / 2;
  const neY = pixelY + halfTile / 2;
  const swX = pixelX + halfTile / 2;
  const swY = pixelY + TILE_SIZE - halfTile / 2;
  const seX = pixelX + TILE_SIZE - halfTile / 2;
  const seY = pixelY + TILE_SIZE - halfTile / 2;

  let nw = LOWER;
  let ne = LOWER;
  let sw = LOWER;
  let se = LOWER;

  for (const rect of collisions) {
    const rx2 = rect.x + rect.width;
    const ry2 = rect.y + rect.height;

    if (nw === LOWER && nwX >= rect.x && nwX < rx2 && nwY >= rect.y && nwY < ry2) {
      nw = UPPER;
    }
    if (ne === LOWER && neX >= rect.x && neX < rx2 && neY >= rect.y && neY < ry2) {
      ne = UPPER;
    }
    if (sw === LOWER && swX >= rect.x && swX < rx2 && swY >= rect.y && swY < ry2) {
      sw = UPPER;
    }
    if (se === LOWER && seX >= rect.x && seX < rx2 && seY >= rect.y && seY < ry2) {
      se = UPPER;
    }
  }

  return (nw << 3) | (ne << 2) | (sw << 1) | se;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads the dungeon tileset texture and extracts individual tile textures
 * for all 16 Wang tile variants.
 *
 * Returns null if loading fails so callers can fall back to programmatic rendering.
 */
export async function loadTileset(): Promise<TilesetData | null> {
  try {
    const baseTexture = await Assets.load<Texture>(TILESET_PATH);

    if (!baseTexture || baseTexture === Texture.EMPTY) {
      return null;
    }

    const tileTextures = new Map<number, Texture>();

    for (const [indexStr, def] of Object.entries(WANG_TILES)) {
      const wangIndex = Number(indexStr);
      const frame = new Rectangle(def.x, def.y, TILE_SIZE, TILE_SIZE);
      const tileTexture = new Texture({
        source: baseTexture.source,
        frame,
      });
      tileTextures.set(wangIndex, tileTexture);
    }

    return { tileTextures };
  } catch (err) {
    console.warn("Failed to load fantasy walls tileset, falling back to Graphics:", err);
    return null;
  }
}

/**
 * Renders tile sprites onto the world stage for the entire map grid.
 * Uses Wang tile matching to pick the correct tile variant based on
 * wall collision overlap at each corner.
 */
export function renderTileSprites(
  worldStage: Container,
  widthTiles: number,
  heightTiles: number,
  collisions: CollisionRect[],
  tilesetData: TilesetData,
): void {
  const floorTexture = tilesetData.tileTextures.get(0);

  for (let ty = 0; ty < heightTiles; ty += 1) {
    for (let tx = 0; tx < widthTiles; tx += 1) {
      const wangIndex = computeWangIndex(tx, ty, collisions);
      const texture = tilesetData.tileTextures.get(wangIndex) ?? floorTexture;

      if (!texture) {
        continue;
      }

      const sprite = new Sprite(texture);
      sprite.x = tx * TILE_SIZE;
      sprite.y = ty * TILE_SIZE;
      worldStage.addChild(sprite);
    }
  }
}

export type { TilesetData };
