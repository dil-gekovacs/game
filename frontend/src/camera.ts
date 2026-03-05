import type { Container } from "pixi.js";

const CAMERA_SCALE = 4;
const DEADZONE_RATIO = 0.4;
const LERP_SPEED = 0.1;

type CameraConfig = {
  worldWidth: number;
  worldHeight: number;
  scale: number;
  deadzoneRatio: number;
  lerpSpeed: number;
};

type Camera = {
  update: (playerWorldX: number, playerWorldY: number) => void;
  applyToContainer: (
    container: Container,
    screenW: number,
    screenH: number,
    shake?: { offsetX: number; offsetY: number },
  ) => void;
  screenToWorld: (
    screenX: number,
    screenY: number,
    screenW: number,
    screenH: number,
  ) => { worldX: number; worldY: number };
  resize: (screenW: number, screenH: number) => void;
  getWorldCenter: () => { x: number; y: number };
  getScale: () => number;
};

export { CAMERA_SCALE, DEADZONE_RATIO, LERP_SPEED };
export type { CameraConfig, Camera };

export const createCamera = (config: CameraConfig): Camera => {
  const { worldWidth, worldHeight, scale, deadzoneRatio, lerpSpeed } = config;

  let x = worldWidth / 2;
  let y = worldHeight / 2;
  let targetX = x;
  let targetY = y;

  let viewportWidthWorld = 0;
  let viewportHeightWorld = 0;
  let deadzoneHalfW = 0;
  let deadzoneHalfH = 0;

  const computeDeadzone = () => {
    deadzoneHalfW = (viewportWidthWorld * deadzoneRatio) / 2;
    deadzoneHalfH = (viewportHeightWorld * deadzoneRatio) / 2;
  };

  const clampTarget = () => {
    const halfViewW = viewportWidthWorld / 2;
    const halfViewH = viewportHeightWorld / 2;

    if (worldWidth <= viewportWidthWorld) {
      targetX = worldWidth / 2;
    } else {
      targetX = Math.max(halfViewW, Math.min(worldWidth - halfViewW, targetX));
    }

    if (worldHeight <= viewportHeightWorld) {
      targetY = worldHeight / 2;
    } else {
      targetY = Math.max(halfViewH, Math.min(worldHeight - halfViewH, targetY));
    }
  };

  const resize = (screenW: number, screenH: number) => {
    viewportWidthWorld = screenW / scale;
    viewportHeightWorld = screenH / scale;
    computeDeadzone();
    clampTarget();
    x = targetX;
    y = targetY;
  };

  const update = (playerWorldX: number, playerWorldY: number) => {
    const dx = playerWorldX - targetX;
    const dy = playerWorldY - targetY;

    if (dx > deadzoneHalfW) {
      targetX = playerWorldX - deadzoneHalfW;
    } else if (dx < -deadzoneHalfW) {
      targetX = playerWorldX + deadzoneHalfW;
    }

    if (dy > deadzoneHalfH) {
      targetY = playerWorldY - deadzoneHalfH;
    } else if (dy < -deadzoneHalfH) {
      targetY = playerWorldY + deadzoneHalfH;
    }

    clampTarget();

    x += (targetX - x) * lerpSpeed;
    y += (targetY - y) * lerpSpeed;
  };

  const applyToContainer = (
    container: Container,
    screenW: number,
    screenH: number,
    shake?: { offsetX: number; offsetY: number },
  ) => {
    container.scale.set(scale, scale);

    let posX = screenW / 2 - x * scale;
    let posY = screenH / 2 - y * scale;

    if (shake) {
      posX += shake.offsetX;
      posY += shake.offsetY;
    }

    container.position.set(Math.round(posX), Math.round(posY));
  };

  const screenToWorld = (
    screenX: number,
    screenY: number,
    screenW: number,
    screenH: number,
  ): { worldX: number; worldY: number } => {
    const worldX = (screenX - screenW / 2) / scale + x;
    const worldY = (screenY - screenH / 2) / scale + y;
    return { worldX, worldY };
  };

  const getWorldCenter = (): { x: number; y: number } => {
    return { x, y };
  };

  const getScale = (): number => {
    return scale;
  };

  return {
    update,
    applyToContainer,
    screenToWorld,
    resize,
    getWorldCenter,
    getScale,
  };
};
