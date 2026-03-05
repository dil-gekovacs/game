import { Container, Graphics } from "pixi.js";

type RoomDef = { x: number; y: number; width: number; height: number };

type FogOfWar = {
  update: (playerX: number, playerY: number) => void;
  destroy: () => void;
};

const FADE_DURATION_MS = 300;

const ROOMS: RoomDef[] = [
  { x: 16, y: 16, width: 112, height: 288 },   // Room 1 "Entrance"
  { x: 128, y: 112, width: 64, height: 80 },    // Room 2 "Corridor"
  { x: 192, y: 16, width: 192, height: 288 },   // Room 3 "Chamber"
  { x: 384, y: 16, width: 112, height: 128 },   // Room 4 "North Side"
  { x: 384, y: 176, width: 112, height: 128 },   // Room 5 "South Side"
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
