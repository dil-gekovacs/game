import { Container, Graphics } from "pixi.js";

type RoomDef = { x: number; y: number; width: number; height: number };

type FogOfWar = {
  update: (playerX: number, playerY: number) => void;
  destroy: () => void;
};

const FADE_DURATION_MS = 300;

const ROOMS: RoomDef[] = [
  { x: 16, y: 16, width: 144, height: 112 },    // Entry Guardroom
  { x: 16, y: 144, width: 208, height: 80 },     // North Cell Block
  { x: 16, y: 224, width: 224, height: 64 },     // Central Corridor (west)
  { x: 16, y: 288, width: 208, height: 80 },     // South Cell Block
  { x: 240, y: 144, width: 176, height: 224 },   // Interrogation Chamber
  { x: 416, y: 144, width: 208, height: 128 },   // Warden's Office
  { x: 416, y: 288, width: 208, height: 80 },    // Escape Tunnel (upper)
  { x: 240, y: 368, width: 256, height: 48 },    // Escape Tunnel (lower passage)
  { x: 496, y: 384, width: 128, height: 80 },    // Oubliette
  { x: 16, y: 368, width: 208, height: 96 },     // South Dead End
];

type FadingRoom = {
  index: number;
  startTime: number;
};

export const createFogOfWar = (stage: Container, rooms: RoomDef[] = ROOMS): FogOfWar => {
  const discovered = new Set<number>();
  const overlays: Graphics[] = [];
  const fading: FadingRoom[] = [];

  const fogContainer = new Container();
  stage.addChild(fogContainer);

  for (const room of rooms) {
    const gfx = new Graphics();
    gfx.beginFill(0x000000);
    gfx.drawRect(room.x, room.y, room.width, room.height);
    gfx.endFill();
    gfx.alpha = 1;
    overlays.push(gfx);
    fogContainer.addChild(gfx);
  }

  const isInsideRoom = (px: number, py: number, room: RoomDef): boolean => {
    return px >= room.x && px <= room.x + room.width &&
           py >= room.y && py <= room.y + room.height;
  };

  const update = (playerX: number, playerY: number): void => {
    // Check if player entered any undiscovered room
    for (let i = 0; i < rooms.length; i++) {
      if (discovered.has(i)) continue;
      const room = rooms[i] as RoomDef;
      if (isInsideRoom(playerX, playerY, room)) {
        discovered.add(i);
        fading.push({ index: i, startTime: performance.now() });
      }
    }

    // Process fading animations
    const now = performance.now();
    for (let f = fading.length - 1; f >= 0; f--) {
      const fade = fading[f] as FadingRoom;
      const overlay = overlays[fade.index] as Graphics;
      const elapsed = now - fade.startTime;
      if (elapsed >= FADE_DURATION_MS) {
        overlay.alpha = 0;
        overlay.visible = false;
        fading.splice(f, 1);
      } else {
        overlay.alpha = 1 - elapsed / FADE_DURATION_MS;
      }
    }
  };

  const destroy = (): void => {
    fogContainer.destroy({ children: true });
  };

  return { update, destroy };
};

export { ROOMS };
export type { RoomDef, FogOfWar };
