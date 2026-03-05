import { Container, Graphics } from "pixi.js";
import type { MapData } from "./mapLoader";
import { loadTileset, renderTileSprites } from "./tilesetRenderer";

type MapRendererResult = {
  collisions: CollisionRect[];
  worldHeight: number;
  worldWidth: number;
};

type CollisionRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const FLOOR_COLOR = 0x1b2030;
const FLOOR_BORDER_COLOR = 0x3a4463;
const GRID_COLOR = 0x242d43;
const WALL_COLOR = 0x55607f;
const WALL_BORDER_COLOR = 0x8e9ac0;
const GRID_LINE_WIDTH = 1;

/**
 * Draws the floor and wall grid using Graphics primitives.
 * Used as a fallback when the tileset fails to load.
 */
function renderFallbackGraphics(
  worldStage: Container,
  mapData: MapData,
): void {
  const { worldWidth, worldHeight, widthTiles, heightTiles, tileWidth, tileHeight, collisions } = mapData;

  const floorGraphic = new Graphics();
  floorGraphic.lineStyle(2, FLOOR_BORDER_COLOR, 1);
  floorGraphic.beginFill(FLOOR_COLOR);
  floorGraphic.drawRect(0, 0, worldWidth, worldHeight);
  floorGraphic.endFill();

  for (let tileX = 1; tileX < widthTiles; tileX += 1) {
    const lineX = tileX * tileWidth;
    floorGraphic.lineStyle(GRID_LINE_WIDTH, GRID_COLOR, 0.8);
    floorGraphic.moveTo(lineX, 0);
    floorGraphic.lineTo(lineX, worldHeight);
  }

  for (let tileY = 1; tileY < heightTiles; tileY += 1) {
    const lineY = tileY * tileHeight;
    floorGraphic.lineStyle(GRID_LINE_WIDTH, GRID_COLOR, 0.8);
    floorGraphic.moveTo(0, lineY);
    floorGraphic.lineTo(worldWidth, lineY);
  }

  worldStage.addChild(floorGraphic);

  const wallGraphic = new Graphics();
  wallGraphic.lineStyle(2, WALL_BORDER_COLOR, 1);
  wallGraphic.beginFill(WALL_COLOR);
  for (const collisionRect of collisions) {
    wallGraphic.drawRect(collisionRect.x, collisionRect.y, collisionRect.width, collisionRect.height);
  }
  wallGraphic.endFill();
  worldStage.addChild(wallGraphic);
}

export const renderRoom = async (worldStage: Container, mapData: MapData): Promise<MapRendererResult> => {
  const { worldWidth, worldHeight, widthTiles, heightTiles, collisions } = mapData;

  const tilesetData = await loadTileset();

  if (tilesetData) {
    renderTileSprites(worldStage, widthTiles, heightTiles, collisions, tilesetData);
  } else {
    renderFallbackGraphics(worldStage, mapData);
  }

  return { collisions, worldHeight, worldWidth };
};

export type { CollisionRect, MapRendererResult };
