import { Application, Container } from "pixi.js";
import { MSG } from "../../shared/protocol/messages";
import { EntityState, EntityType, EventType } from "../../shared/types/entities";
import type { ClientMessage, ServerMessage } from "../../shared/protocol/messages";
import { createCamera } from "./camera";
import { createEntityRenderer } from "./entityRenderer";
import { createFogOfWar } from "./fogOfWar";
import { createEntityStore } from "./entityStore";
import { createGameLoop } from "./gameLoop";
import { createGameOverScreen } from "./gameOverScreen";
import { createInputController } from "./input";
import { loadMap } from "./mapLoader";
import { renderRoom } from "./mapRenderer";
import { createWsClient } from "./net/wsClient";
import { loadSpriteAssets } from "./spriteLoader";

const INPUT_SEND_INTERVAL_MS = 1000 / 30;
const TWO_PI = Math.PI * 2;
const CAMERA_SCALE = 4;
const CAMERA_DEADZONE_RATIO = 0.4;
const CAMERA_LERP_SPEED = 0.1;
const HUD_FONT = "12px ui-monospace, SFMono-Regular, Menlo, monospace";

type ConnectionConfig = {
  playerId: string | null;
  roomId: string | null;
  wsUrl: string;
};

const appContainer = document.getElementById("app");
if (!appContainer) {
  throw new Error("Missing #app container");
}

const resolveConnectionConfig = (): ConnectionConfig => {
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (typeof configuredUrl !== "string" || configuredUrl.length === 0) {
    throw new Error("Missing VITE_WS_URL");
  }

  const wsUrl = new URL(configuredUrl);
  const pageUrl = new URL(window.location.href);
  const roomOverride = pageUrl.searchParams.get("roomId");
  const playerOverride = pageUrl.searchParams.get("playerId");

  if (roomOverride !== null && roomOverride.length > 0) {
    wsUrl.searchParams.set("roomId", roomOverride);
  }

  if (playerOverride !== null && playerOverride.length > 0) {
    wsUrl.searchParams.set("playerId", playerOverride);
  }

  return {
    playerId: wsUrl.searchParams.get("playerId"),
    roomId: wsUrl.searchParams.get("roomId"),
    wsUrl: wsUrl.toString(),
  };
};

const startGame = async () => {
  const connectionConfig = resolveConnectionConfig();

  // Use nearest-neighbor filtering for crisp pixel art at any zoom level
  const { TextureSource } = await import("pixi.js");
  TextureSource.defaultOptions.scaleMode = "nearest";

  const app = new Application();
  await app.init({
    antialias: false,
    background: "#101018",
    height: window.innerHeight,
    resizeTo: window,
    width: window.innerWidth,
  });
  appContainer.appendChild(app.canvas);

  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  const spriteAssets = await loadSpriteAssets();
  const mapData = await loadMap("/assets/maps/prison-labyrinth.json");
  const mapMetrics = await renderRoom(worldContainer, mapData);

  const entityStore = createEntityStore();
  entityStore.setCollisionWorld({
    collisions: mapMetrics.collisions,
    worldHeight: mapMetrics.worldHeight,
    worldWidth: mapMetrics.worldWidth,
  });
  const entityRenderer = createEntityRenderer(worldContainer, entityStore, spriteAssets);
  const fogOfWar = createFogOfWar(worldContainer);
  const inputController = createInputController(app.canvas);
  const hudElement = document.createElement("div");
  hudElement.dataset.testid = "hud";
  hudElement.style.background = "rgba(15, 23, 42, 0.8)";
  hudElement.style.border = "1px solid rgba(148, 163, 184, 0.35)";
  hudElement.style.borderRadius = "8px";
  hudElement.style.color = "#e2e8f0";
  hudElement.style.font = HUD_FONT;
  hudElement.style.left = "12px";
  hudElement.style.lineHeight = "1.4";
  hudElement.style.padding = "8px 10px";
  hudElement.style.pointerEvents = "none";
  hudElement.style.position = "fixed";
  hudElement.style.top = "12px";
  hudElement.style.whiteSpace = "pre";
  hudElement.style.zIndex = "20";
  appContainer.appendChild(hudElement);

  const gameOverScreen = createGameOverScreen(appContainer);

  const camera = createCamera({
    worldWidth: mapMetrics.worldWidth,
    worldHeight: mapMetrics.worldHeight,
    scale: CAMERA_SCALE,
    deadzoneRatio: CAMERA_DEADZONE_RATIO,
    lerpSpeed: CAMERA_LERP_SPEED,
  });
  camera.resize(app.screen.width, app.screen.height);

  let inputSequence = 0;
  let localTick = 0;
  let elapsedSinceInputSend = 0;
  let connectionState = "connecting";
  let previousPrimaryHeld = false;

  const getEnemyCount = (): number => {
    let enemyCount = 0;
    for (const [, entityRecord] of entityStore.getEntities()) {
      if (
        entityRecord.current.type === EntityType.Enemy &&
        entityRecord.current.state !== EntityState.Dead &&
        entityRecord.current.hp > 0
      ) {
        enemyCount += 1;
      }
    }
    return enemyCount;
  };

  const renderHud = () => {
    const localEntityId = entityStore.getLocalEntityId();
    hudElement.textContent = [
      `room: ${connectionConfig.roomId ?? "unknown"}`,
      `player: ${connectionConfig.playerId ?? "unknown"}`,
      `entity: ${localEntityId ?? "pending"}`,
      `connection: ${connectionState}`,
      `enemies: ${getEnemyCount()}`,
      "",
      "WASD: move | Click/Space: attack",
    ].join("\n");
  };

  const FACING_ANGLES = [
    Math.PI / 2,   // Down (Facing 0) = 90 degrees
    -Math.PI / 2,  // Up (Facing 1) = -90 degrees (normalized to ~4.71)
    Math.PI,       // Left (Facing 2) = 180 degrees
    0,             // Right (Facing 3) = 0 degrees
  ];

  const getAimAngle = (pointerX: number, pointerY: number): number => {
    const localEntity = entityStore.getLocalEntity();
    if (!localEntity) {
      return 0;
    }

    // If pointer is at origin (0,0) — likely no mouse movement, keyboard-only play.
    // Fall back to the player's current facing direction.
    if (pointerX === 0 && pointerY === 0) {
      const facingAngle = FACING_ANGLES[localEntity.current.facing] ?? 0;
      return facingAngle >= 0 ? facingAngle : facingAngle + TWO_PI;
    }

    const cameraCenter = camera.getWorldCenter();
    const scale = camera.getScale();
    const playerScreenX = (localEntity.predictedX - cameraCenter.x) * scale + app.screen.width / 2;
    const playerScreenY = (localEntity.predictedY - cameraCenter.y) * scale + app.screen.height / 2;
    const rawAngle = Math.atan2(pointerY - playerScreenY, pointerX - playerScreenX);
    return rawAngle >= 0 ? rawAngle : rawAngle + TWO_PI;
  };

  const handleServerMessage = (serverMessage: ServerMessage) => {
    if (serverMessage.type === MSG.PONG) {
      return;
    }

    if (serverMessage.type === MSG.PLAYER_JOINED) {
      entityStore.upsertEntity(serverMessage.initialState);

      if (serverMessage.playerId === connectionConfig.playerId) {
        entityStore.setLocalEntityId(serverMessage.entityId);
      }
      return;
    }

    if (serverMessage.type === MSG.PLAYER_LEFT) {
      entityStore.removeEntity(serverMessage.entityId);
      return;
    }

    if (serverMessage.type === MSG.WORLD_SNAPSHOT) {
      entityStore.applySnapshot(serverMessage.entities, serverMessage.ackSeq);
      return;
    }

    if (serverMessage.type === MSG.EVENT) {
      entityRenderer.handleCombatEvent(serverMessage);
      if (serverMessage.eventType === EventType.EntityDespawn) {
        entityStore.markDespawned(serverMessage.entityId);
      }
      return;
    }

    if (serverMessage.type === MSG.GAME_START) {
      return;
    }

    if (serverMessage.type === MSG.GAME_OVER) {
      connectionState = serverMessage.victory ? "game_over:victory" : "game_over:defeat";
      gameOverScreen.show(serverMessage.victory);
    }
  };

  const wsClient = createWsClient({
    wsUrl: connectionConfig.wsUrl,
    onClose: () => {
      connectionState = "closed";
    },
    onError: (errorEvent) => {
      connectionState = "error";
      console.error("websocket error", errorEvent);
    },
    onMessage: handleServerMessage,
    onOpen: () => {
      connectionState = "connected";
    },
  });

  const sendInputMessage = () => {
    const inputSnapshot = inputController.getSnapshot();
    const nextSequence = (inputSequence + 1) % 65536;
    inputSequence = nextSequence;

    const aimAngle = getAimAngle(inputSnapshot.pointerX, inputSnapshot.pointerY);

    const playerInputMessage: ClientMessage = {
      aimAngle,
      moveX: inputSnapshot.moveX,
      moveY: inputSnapshot.moveY,
      parry: false,
      primary: inputSnapshot.mouseLeft,
      secondary: inputSnapshot.mouseRight,
      seq: inputSequence,
      tick: localTick,
      type: MSG.PLAYER_INPUT,
    };

    wsClient.sendMessage(playerInputMessage);
    entityStore.recordPendingInput(inputSnapshot, aimAngle, inputSequence);
  };

  const gameLoop = createGameLoop({
    onRender: (alpha) => {
      const shakeOffset = entityRenderer.renderEntities(alpha);

      const localEntity = entityStore.getLocalEntity();
      if (localEntity) {
        camera.update(localEntity.predictedX, localEntity.predictedY);
        fogOfWar.update(localEntity.predictedX, localEntity.predictedY);
      }

      camera.applyToContainer(worldContainer, app.screen.width, app.screen.height, shakeOffset);
      renderHud();
      app.renderer.render(app.stage);
    },
    onUpdate: (deltaMs) => {
      localTick += 1;
      elapsedSinceInputSend += deltaMs;

      const currentInput = inputController.getSnapshot();

      if (currentInput.mouseLeft && !previousPrimaryHeld) {
        entityRenderer.triggerAttackArc();
      }
      previousPrimaryHeld = currentInput.mouseLeft;

      entityStore.predictFixedStep(currentInput);

      if (elapsedSinceInputSend >= INPUT_SEND_INTERVAL_MS) {
        sendInputMessage();
        elapsedSinceInputSend -= INPUT_SEND_INTERVAL_MS;
      }
    },
  });

  const handleResize = () => {
    camera.resize(app.screen.width, app.screen.height);
  };
  window.addEventListener("resize", handleResize);
  gameLoop.start();

  window.addEventListener("keydown", function handleRestartKey(event: KeyboardEvent) {
    if (event.key === "r" && gameOverScreen.isVisible()) {
      window.location.reload();
    }
  });

  window.addEventListener("beforeunload", () => {
    gameLoop.stop();
    entityRenderer.destroy();
    fogOfWar.destroy();
    inputController.destroy();
    wsClient.close();
    gameOverScreen.destroy();
    appContainer.removeChild(hudElement);
    window.removeEventListener("resize", handleResize);
  });
};

void startGame();
