import { Container, Graphics, Sprite } from "pixi.js";
import type { EventMsg } from "../../shared/protocol/messages";
import { EntityState, EntityType, EventType, Facing } from "../../shared/types/entities";
import type { EntityId } from "../../shared/types/entities";
import type { EntityStore } from "./entityStore";
import type { SpriteAssets } from "./spriteLoader";
import { getAnimationDef, getCharacterName, getFacingDirection, isDirectionMissing } from "./animationMap";

type EntityMarker = {
  animStartMs: number;
  cachedFacing: Facing;
  cachedIsDead: boolean;
  cachedIsLocal: boolean;
  cachedKind: EntityType;
  cachedState: EntityState;
  container: Container;
  healthBackground: Graphics;
  healthFill: Graphics;
  isLocal: boolean;
  kind: EntityType;
  sprite: Sprite;
};

type FallbackMarker = {
  body: Graphics;
  cachedFacing: Facing;
  cachedIsDead: boolean;
  cachedIsLocal: boolean;
  cachedKind: EntityType;
  container: Container;
  facing: Graphics;
  healthBackground: Graphics;
  healthFill: Graphics;
  isLocal: boolean;
  kind: EntityType;
};

type FlashEffect = {
  centerX: number;
  centerY: number;
  createdAtMs: number;
  durationMs: number;
  endRadius: number;
  graphic: Graphics;
  startRadius: number;
};

type ArcEffect = {
  createdAtMs: number;
  durationMs: number;
  entityId: EntityId;
  facingDirection: Facing;
  graphic: Graphics;
};

type ScreenShake = {
  createdAtMs: number;
  durationMs: number;
  intensity: number;
};

type ShakeOffset = {
  offsetX: number;
  offsetY: number;
};

type EntityRenderer = {
  destroy: () => void;
  handleCombatEvent: (eventMessage: EventMsg) => void;
  renderEntities: (alpha: number) => ShakeOffset;
  triggerAttackArc: () => void;
};

// ---------------------------------------------------------------------------
// Sprite mode constants
// ---------------------------------------------------------------------------

const STANDARD_SPRITE_SIZE = 32;
const LARGE_SPRITE_SIZE = 48;
const EFFECTIVE_DISPLAY_SIZE = 16;
const STANDARD_SPRITE_SCALE = EFFECTIVE_DISPLAY_SIZE / STANDARD_SPRITE_SIZE;
const LARGE_SPRITE_SCALE = EFFECTIVE_DISPLAY_SIZE / LARGE_SPRITE_SIZE;
const SPRITE_HEALTH_BAR_RADIUS = 8;

// ---------------------------------------------------------------------------
// Fallback mode constants (when spriteAssets not provided)
// ---------------------------------------------------------------------------

const LOCAL_PLAYER_COLOR = 0x4ade80;
const REMOTE_PLAYER_COLOR = 0x60a5fa;
const ENEMY_COLOR = 0xef4444;
const PROJECTILE_COLOR = 0xfbbf24;
const ITEM_COLOR = 0xc084fc;
const PLAYER_RADIUS = 10;
const ENEMY_RADIUS = 9;
const PROJECTILE_RADIUS = 4;
const ITEM_RADIUS = 6;

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const REMOTE_INTERPOLATION_FACTOR = 0.15;
const LOCAL_CORRECTION_FACTOR = 0.3;
const LOCAL_SNAP_THRESHOLD = 30;
const HEALTH_BAR_WIDTH = 24;
const HEALTH_BAR_HEIGHT = 3;
const HEALTH_BAR_OFFSET_Y = 14;
const FLASH_LINE_WIDTH = 2;
const DEAD_ALPHA = 0.3;
const DEAD_TINT = 0x888888;
const ALIVE_TINT = 0xffffff;
const ATTACK_ARC_DURATION_MS = 250;
const ATTACK_ARC_ANGLE_RAD = Math.PI / 2;
const ATTACK_ARC_RADIUS = 24;
const ATTACK_ARC_COLOR = 0xff6b35;
const ATTACK_ARC_EXPAND_PX = 6;
const ATTACK_ARC_LINE_WIDTH = 5;
const ATTACK_PULSE_DURATION_MS = 100;
const ATTACK_PULSE_SCALE = 1.2;
const SCREEN_SHAKE_DURATION_MS = 120;
const SCREEN_SHAKE_INTENSITY_PX = 4;
const VISIBILITY_FLAG_BIT = 0x01;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getFacingAngle = (facing: Facing): number => {
  if (facing === Facing.Up) {
    return -Math.PI / 2;
  }
  if (facing === Facing.Left) {
    return Math.PI;
  }
  if (facing === Facing.Right) {
    return 0;
  }
  return Math.PI / 2;
};

// ---------------------------------------------------------------------------
// Fallback helpers (colored circles when no sprite assets)
// ---------------------------------------------------------------------------

const getFacingVector = (facing: Facing): { x: number; y: number } => {
  if (facing === Facing.Up) {
    return { x: 0, y: -1 };
  }
  if (facing === Facing.Left) {
    return { x: -1, y: 0 };
  }
  if (facing === Facing.Right) {
    return { x: 1, y: 0 };
  }
  return { x: 0, y: 1 };
};

const getMarkerStyle = (entityType: EntityType, isLocal: boolean): { color: number; radius: number } => {
  if (entityType === EntityType.Enemy) {
    return { color: ENEMY_COLOR, radius: ENEMY_RADIUS };
  }
  if (entityType === EntityType.Projectile) {
    return { color: PROJECTILE_COLOR, radius: PROJECTILE_RADIUS };
  }
  if (entityType === EntityType.Item) {
    return { color: ITEM_COLOR, radius: ITEM_RADIUS };
  }
  return {
    color: isLocal ? LOCAL_PLAYER_COLOR : REMOTE_PLAYER_COLOR,
    radius: PLAYER_RADIUS,
  };
};

const drawMarkerBody = (
  bodyGraphic: Graphics,
  facingGraphic: Graphics,
  entityType: EntityType,
  isLocal: boolean,
  facing: Facing,
) => {
  const markerStyle = getMarkerStyle(entityType, isLocal);
  bodyGraphic.clear();
  bodyGraphic.lineStyle(2, 0x111827, 1);
  bodyGraphic.beginFill(markerStyle.color);
  bodyGraphic.drawCircle(0, 0, markerStyle.radius);
  bodyGraphic.endFill();

  const facingVector = getFacingVector(facing);
  const facingLength = markerStyle.radius + 3;
  facingGraphic.clear();
  facingGraphic.lineStyle(2, 0xf8fafc, 0.9);
  facingGraphic.moveTo(0, 0);
  facingGraphic.lineTo(facingVector.x * facingLength, facingVector.y * facingLength);
};

// ---------------------------------------------------------------------------
// Renderer factory
// ---------------------------------------------------------------------------

export const createEntityRenderer = (
  stage: Container,
  entityStore: EntityStore,
  spriteAssets?: SpriteAssets,
): EntityRenderer => {
  const useSprites = spriteAssets !== undefined;

  // Sprite-mode markers
  const markers = new Map<EntityId, EntityMarker>();
  // Fallback-mode markers
  const fallbackMarkers = new Map<EntityId, FallbackMarker>();

  const flashEffects: FlashEffect[] = [];
  const arcEffects: ArcEffect[] = [];
  let activeScreenShake: ScreenShake | null = null;

  // -----------------------------------------------------------------------
  // Sprite-mode marker creation
  // -----------------------------------------------------------------------

  const ensureMarkerExists = (
    entityId: EntityId,
    isLocal: boolean,
    entityType: EntityType,
    facing: Facing,
    state: EntityState,
    positionX: number,
    positionY: number,
  ): EntityMarker => {
    const existing = markers.get(entityId);
    if (existing) {
      return existing;
    }

    const characterName = getCharacterName(entityType);
    const direction = getFacingDirection(facing);
    const texture = spriteAssets!.getTexture(characterName, direction);
    const spriteSize = spriteAssets!.getSpriteSize(characterName);
    const spriteScale = spriteSize === LARGE_SPRITE_SIZE ? LARGE_SPRITE_SCALE : STANDARD_SPRITE_SCALE;

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    sprite.scale.set(spriteScale);

    const healthBackground = new Graphics();
    const healthFill = new Graphics();
    const markerContainer = new Container();
    markerContainer.x = positionX;
    markerContainer.y = positionY;

    markerContainer.addChild(sprite);
    markerContainer.addChild(healthBackground);
    markerContainer.addChild(healthFill);
    stage.addChild(markerContainer);

    const marker: EntityMarker = {
      animStartMs: performance.now(),
      cachedFacing: facing,
      cachedIsDead: false,
      cachedIsLocal: isLocal,
      cachedKind: entityType,
      cachedState: state,
      container: markerContainer,
      healthBackground,
      healthFill,
      isLocal,
      kind: entityType,
      sprite,
    };
    markers.set(entityId, marker);
    return marker;
  };

  // -----------------------------------------------------------------------
  // Fallback-mode marker creation
  // -----------------------------------------------------------------------

  const ensureFallbackMarkerExists = (
    entityId: EntityId,
    isLocal: boolean,
    entityType: EntityType,
    facing: Facing,
    positionX: number,
    positionY: number,
  ): FallbackMarker => {
    const existing = fallbackMarkers.get(entityId);
    if (existing) {
      return existing;
    }

    const body = new Graphics();
    const facingGraphic = new Graphics();
    const healthBackground = new Graphics();
    const healthFill = new Graphics();
    const markerContainer = new Container();
    markerContainer.x = positionX;
    markerContainer.y = positionY;

    drawMarkerBody(body, facingGraphic, entityType, isLocal, facing);
    markerContainer.addChild(body);
    markerContainer.addChild(facingGraphic);
    markerContainer.addChild(healthBackground);
    markerContainer.addChild(healthFill);
    stage.addChild(markerContainer);

    const marker: FallbackMarker = {
      body,
      cachedFacing: facing,
      cachedIsDead: false,
      cachedIsLocal: isLocal,
      cachedKind: entityType,
      container: markerContainer,
      facing: facingGraphic,
      healthBackground,
      healthFill,
      isLocal,
      kind: entityType,
    };
    fallbackMarkers.set(entityId, marker);
    return marker;
  };

  // -----------------------------------------------------------------------
  // Stale marker cleanup
  // -----------------------------------------------------------------------

  const removeStaleMarkers = (activeIds: Set<EntityId>) => {
    if (useSprites) {
      for (const [entityId, marker] of markers) {
        if (!activeIds.has(entityId)) {
          stage.removeChild(marker.container);
          marker.container.destroy({ children: true });
          markers.delete(entityId);
        }
      }
    } else {
      for (const [entityId, marker] of fallbackMarkers) {
        if (!activeIds.has(entityId)) {
          stage.removeChild(marker.container);
          marker.container.destroy({ children: true });
          fallbackMarkers.delete(entityId);
        }
      }
    }
  };

  // -----------------------------------------------------------------------
  // Flash effects
  // -----------------------------------------------------------------------

  const spawnFlashEffect = (
    centerX: number,
    centerY: number,
    startRadius: number,
    endRadius: number,
    durationMs: number,
    color: number,
  ) => {
    const flashGraphic = new Graphics();
    flashGraphic.tint = color;
    stage.addChild(flashGraphic);
    flashEffects.push({
      centerX,
      centerY,
      createdAtMs: performance.now(),
      durationMs,
      endRadius,
      graphic: flashGraphic,
      startRadius,
    });
  };

  const spawnFlashOnEntity = (entityId: EntityId, startRadius: number, endRadius: number, durationMs: number, color: number) => {
    const entityRecord = entityStore.getEntities().get(entityId);
    if (!entityRecord) {
      return;
    }

    spawnFlashEffect(entityRecord.current.x, entityRecord.current.y, startRadius, endRadius, durationMs, color);
  };

  const renderFlashEffects = () => {
    const nowMs = performance.now();
    for (let effectIndex = flashEffects.length - 1; effectIndex >= 0; effectIndex -= 1) {
      const flashEffect = flashEffects[effectIndex]!;
      const elapsedMs = nowMs - flashEffect.createdAtMs;
      const progress = elapsedMs / flashEffect.durationMs;

      if (progress >= 1) {
        stage.removeChild(flashEffect.graphic);
        flashEffect.graphic.destroy();
        flashEffects.splice(effectIndex, 1);
        continue;
      }

      const radius = flashEffect.startRadius + (flashEffect.endRadius - flashEffect.startRadius) * progress;
      const alpha = 1 - progress;
      flashEffect.graphic.clear();
      flashEffect.graphic.lineStyle(FLASH_LINE_WIDTH, 0xffffff, alpha);
      flashEffect.graphic.drawCircle(flashEffect.centerX, flashEffect.centerY, radius);
    }
  };

  // -----------------------------------------------------------------------
  // Arc effects
  // -----------------------------------------------------------------------

  const getMarkerContainer = (entityId: EntityId): Container | null => {
    if (useSprites) {
      const m = markers.get(entityId);
      return m ? m.container : null;
    }
    const f = fallbackMarkers.get(entityId);
    return f ? f.container : null;
  };

  const spawnAttackArc = (entityId: EntityId, facingDirection: Facing) => {
    const arcGraphic = new Graphics();
    stage.addChild(arcGraphic);
    arcEffects.push({
      createdAtMs: performance.now(),
      durationMs: ATTACK_ARC_DURATION_MS,
      entityId,
      facingDirection,
      graphic: arcGraphic,
    });
  };

  const renderArcEffects = () => {
    const nowMs = performance.now();
    for (let arcIndex = arcEffects.length - 1; arcIndex >= 0; arcIndex -= 1) {
      const arcEffect = arcEffects[arcIndex]!;
      const elapsedMs = nowMs - arcEffect.createdAtMs;
      const progress = elapsedMs / arcEffect.durationMs;

      if (progress >= 1) {
        stage.removeChild(arcEffect.graphic);
        arcEffect.graphic.destroy();
        arcEffects.splice(arcIndex, 1);
        continue;
      }

      const container = getMarkerContainer(arcEffect.entityId);
      if (!container) {
        stage.removeChild(arcEffect.graphic);
        arcEffect.graphic.destroy();
        arcEffects.splice(arcIndex, 1);
        continue;
      }

      const centerAngle = getFacingAngle(arcEffect.facingDirection);
      const halfArc = ATTACK_ARC_ANGLE_RAD / 2;
      const startAngle = centerAngle - halfArc;
      const endAngle = centerAngle + halfArc;
      const alpha = 1 - progress;
      const currentRadius = ATTACK_ARC_RADIUS + progress * ATTACK_ARC_EXPAND_PX;

      arcEffect.graphic.clear();
      arcEffect.graphic.lineStyle(ATTACK_ARC_LINE_WIDTH, ATTACK_ARC_COLOR, alpha);
      arcEffect.graphic.arc(container.x, container.y, currentRadius, startAngle, endAngle);
    }
  };

  // -----------------------------------------------------------------------
  // Public: trigger attack arc
  // -----------------------------------------------------------------------

  const triggerAttackArc = () => {
    const localEntityId = entityStore.getLocalEntityId();
    if (localEntityId === null) {
      return;
    }
    const localRecord = entityStore.getEntities().get(localEntityId);
    if (!localRecord) {
      return;
    }
    spawnAttackArc(localEntityId, localRecord.current.facing);
  };

  // -----------------------------------------------------------------------
  // Screen shake
  // -----------------------------------------------------------------------

  const triggerScreenShake = () => {
    activeScreenShake = {
      createdAtMs: performance.now(),
      durationMs: SCREEN_SHAKE_DURATION_MS,
      intensity: SCREEN_SHAKE_INTENSITY_PX,
    };
  };

  const applyScreenShake = () => {
    if (activeScreenShake === null) {
      return { offsetX: 0, offsetY: 0 };
    }

    const nowMs = performance.now();
    const elapsedMs = nowMs - activeScreenShake.createdAtMs;
    const progress = elapsedMs / activeScreenShake.durationMs;

    if (progress >= 1) {
      activeScreenShake = null;
      return { offsetX: 0, offsetY: 0 };
    }

    const decayFactor = 1 - progress;
    const shakeAmount = activeScreenShake.intensity * decayFactor;
    const offsetX = (Math.random() * 2 - 1) * shakeAmount;
    const offsetY = (Math.random() * 2 - 1) * shakeAmount;
    return { offsetX, offsetY };
  };

  // -----------------------------------------------------------------------
  // Health bar
  // -----------------------------------------------------------------------

  const renderHealthBar = (
    healthBackground: Graphics,
    healthFill: Graphics,
    hp: number,
    maxHp: number,
    radius: number,
  ) => {
    const clampedHealthRatio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / maxHp));
    const healthTop = -(radius + HEALTH_BAR_OFFSET_Y);
    const healthLeft = -HEALTH_BAR_WIDTH / 2;

    healthBackground.clear();
    healthBackground.beginFill(0x0f172a, 0.8);
    healthBackground.drawRect(healthLeft, healthTop, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    healthBackground.endFill();

    healthFill.clear();
    healthFill.beginFill(0x22c55e, 1);
    healthFill.drawRect(
      healthLeft,
      healthTop,
      HEALTH_BAR_WIDTH * clampedHealthRatio,
      HEALTH_BAR_HEIGHT,
    );
    healthFill.endFill();
  };

  // -----------------------------------------------------------------------
  // Combat event handler
  // -----------------------------------------------------------------------

  const handleCombatEvent = (eventMessage: EventMsg) => {
    if (eventMessage.eventType === EventType.Damage) {
      const affectedEntityId = eventMessage.targetId ?? eventMessage.entityId;
      spawnFlashOnEntity(affectedEntityId, 8, 18, 180, 0xff4d4f);

      const localEntityId = entityStore.getLocalEntityId();
      if (localEntityId !== null && affectedEntityId === localEntityId) {
        triggerScreenShake();
      }
      return;
    }

    if (eventMessage.eventType === EventType.Heal) {
      const affectedEntityId = eventMessage.targetId ?? eventMessage.entityId;
      spawnFlashOnEntity(affectedEntityId, 6, 16, 220, 0x22c55e);
      return;
    }

    if (eventMessage.eventType === EventType.EntityDespawn) {
      spawnFlashOnEntity(eventMessage.entityId, 6, 26, 260, 0xf8fafc);
    }
  };

  // -----------------------------------------------------------------------
  // Sprite animation update
  // -----------------------------------------------------------------------

  const updateSpriteAnimation = (marker: EntityMarker, entityType: EntityType, state: EntityState, facing: Facing, nowMs: number) => {
    const characterName = getCharacterName(entityType);
    const direction = getFacingDirection(facing);
    const animDef = getAnimationDef(entityType, state);

    if (animDef.animationName === null) {
      // Static rotation only
      marker.sprite.texture = spriteAssets!.getTexture(characterName, direction);
      return;
    }

    // Check if direction is missing for this animation; fall back to static
    if (isDirectionMissing(characterName, animDef.animationName, direction)) {
      marker.sprite.texture = spriteAssets!.getTexture(characterName, direction);
      return;
    }

    const elapsedMs = nowMs - marker.animStartMs;
    const rawFrame = Math.floor(elapsedMs / animDef.frameDurationMs);
    let frameIndex: number;

    if (animDef.loop) {
      frameIndex = rawFrame % animDef.frameCount;
    } else {
      frameIndex = Math.min(rawFrame, animDef.frameCount - 1);
    }

    marker.sprite.texture = spriteAssets!.getTexture(
      characterName,
      direction,
      animDef.animationName,
      frameIndex,
    );
  };

  // -----------------------------------------------------------------------
  // Position update (shared logic)
  // -----------------------------------------------------------------------

  const updatePosition = (
    container: Container,
    isLocal: boolean,
    currentX: number,
    currentY: number,
    predictedX: number,
    predictedY: number,
  ) => {
    if (isLocal) {
      const targetX = predictedX;
      const targetY = predictedY;
      const correctionX = targetX - container.x;
      const correctionY = targetY - container.y;
      const correctionDist = Math.sqrt(correctionX * correctionX + correctionY * correctionY);

      if (correctionDist > LOCAL_SNAP_THRESHOLD) {
        container.x = targetX;
        container.y = targetY;
      } else {
        container.x += correctionX * LOCAL_CORRECTION_FACTOR;
        container.y += correctionY * LOCAL_CORRECTION_FACTOR;
      }
    } else {
      container.x += (currentX - container.x) * REMOTE_INTERPOLATION_FACTOR;
      container.y += (currentY - container.y) * REMOTE_INTERPOLATION_FACTOR;
    }
  };

  // -----------------------------------------------------------------------
  // Render: sprite mode
  // -----------------------------------------------------------------------

  const renderEntitiesSprite = (_alpha: number) => {
    const allEntities = entityStore.getEntities();
    const localEntityId = entityStore.getLocalEntityId();
    const activeIds = new Set<EntityId>();
    const nowMs = performance.now();

    for (const [entityId, record] of allEntities) {
      activeIds.add(entityId);
      const isLocal = entityId === localEntityId;
      const marker = ensureMarkerExists(
        entityId,
        isLocal,
        record.current.type,
        record.current.facing,
        record.current.state,
        record.current.x,
        record.current.y,
      );

      const isDead = record.current.state === EntityState.Dead || record.current.hp <= 0;
      const isVisible = (record.current.flags & VISIBILITY_FLAG_BIT) !== 0;

      if (isDead && !isVisible) {
        marker.container.visible = false;
        continue;
      } else {
        marker.container.visible = true;
      }

      // Detect state or facing changes to reset animation timer
      const stateChanged = marker.cachedState !== record.current.state;
      const facingChanged = marker.cachedFacing !== record.current.facing;

      if (stateChanged || facingChanged) {
        marker.animStartMs = nowMs;
      }

      // Update cached values
      marker.cachedKind = record.current.type;
      marker.cachedIsLocal = isLocal;
      marker.cachedFacing = record.current.facing;
      marker.cachedIsDead = isDead;
      marker.cachedState = record.current.state;
      marker.kind = record.current.type;
      marker.isLocal = isLocal;

      // Dead/alive visuals
      if (isDead) {
        marker.sprite.tint = DEAD_TINT;
        marker.container.alpha = DEAD_ALPHA;
      } else {
        marker.sprite.tint = ALIVE_TINT;
        marker.container.alpha = 1;
        // Update animation frame
        updateSpriteAnimation(marker, record.current.type, record.current.state, record.current.facing, nowMs);
      }

      // Attack scale pulse
      const spriteSize = spriteAssets!.getSpriteSize(getCharacterName(record.current.type));
      const spriteScale = spriteSize === LARGE_SPRITE_SIZE ? LARGE_SPRITE_SCALE : STANDARD_SPRITE_SCALE;
      if (record.current.state === EntityState.Attacking) {
        const attackElapsed = nowMs - marker.animStartMs;
        const attackPulse = attackElapsed < ATTACK_PULSE_DURATION_MS ? ATTACK_PULSE_SCALE : 1.0;
        marker.sprite.scale.set(spriteScale * attackPulse);
      } else {
        marker.sprite.scale.set(spriteScale);
      }

      // Health bar
      renderHealthBar(
        marker.healthBackground,
        marker.healthFill,
        record.current.hp,
        record.current.maxHp,
        SPRITE_HEALTH_BAR_RADIUS,
      );

      // Position interpolation
      updatePosition(
        marker.container,
        isLocal,
        record.current.x,
        record.current.y,
        record.predictedX,
        record.predictedY,
      );
    }

    removeStaleMarkers(activeIds);
    renderFlashEffects();
    renderArcEffects();

    return applyScreenShake();
  };

  // -----------------------------------------------------------------------
  // Render: fallback mode (colored circles)
  // -----------------------------------------------------------------------

  const renderEntitiesFallback = (_alpha: number) => {
    const allEntities = entityStore.getEntities();
    const localEntityId = entityStore.getLocalEntityId();
    const activeIds = new Set<EntityId>();

    for (const [entityId, record] of allEntities) {
      activeIds.add(entityId);
      const isLocal = entityId === localEntityId;
      const marker = ensureFallbackMarkerExists(
        entityId,
        isLocal,
        record.current.type,
        record.current.facing,
        record.current.x,
        record.current.y,
      );

      const isDead = record.current.state === EntityState.Dead || record.current.hp <= 0;
      const isVisible = (record.current.flags & VISIBILITY_FLAG_BIT) !== 0;

      if (isDead && !isVisible) {
        marker.container.visible = false;
        continue;
      } else {
        marker.container.visible = true;
      }

      const needsRedraw =
        marker.cachedKind !== record.current.type ||
        marker.cachedIsLocal !== isLocal ||
        marker.cachedFacing !== record.current.facing ||
        marker.cachedIsDead !== isDead;

      if (needsRedraw) {
        if (isDead) {
          const markerStyle = getMarkerStyle(record.current.type, isLocal);
          marker.body.clear();
          marker.body.lineStyle(2, 0x111827, 1);
          marker.body.beginFill(DEAD_TINT);
          marker.body.drawCircle(0, 0, markerStyle.radius);
          marker.body.endFill();
          marker.facing.clear();
        } else {
          drawMarkerBody(marker.body, marker.facing, record.current.type, isLocal, record.current.facing);
        }
        marker.cachedKind = record.current.type;
        marker.cachedIsLocal = isLocal;
        marker.cachedFacing = record.current.facing;
        marker.cachedIsDead = isDead;
        marker.kind = record.current.type;
        marker.isLocal = isLocal;
      }

      marker.container.alpha = isDead ? DEAD_ALPHA : 1;

      const markerRadius = getMarkerStyle(record.current.type, isLocal).radius;
      renderHealthBar(
        marker.healthBackground,
        marker.healthFill,
        record.current.hp,
        record.current.maxHp,
        markerRadius,
      );

      updatePosition(
        marker.container,
        isLocal,
        record.current.x,
        record.current.y,
        record.predictedX,
        record.predictedY,
      );
    }

    removeStaleMarkers(activeIds);
    renderFlashEffects();
    renderArcEffects();

    return applyScreenShake();
  };

  // -----------------------------------------------------------------------
  // renderEntities dispatcher
  // -----------------------------------------------------------------------

  const renderEntities = (alpha: number): ShakeOffset => {
    if (useSprites) {
      return renderEntitiesSprite(alpha);
    }
    return renderEntitiesFallback(alpha);
  };

  // -----------------------------------------------------------------------
  // Destroy
  // -----------------------------------------------------------------------

  const destroy = () => {
    for (const [, marker] of markers) {
      stage.removeChild(marker.container);
      marker.container.destroy({ children: true });
    }
    for (const [, marker] of fallbackMarkers) {
      stage.removeChild(marker.container);
      marker.container.destroy({ children: true });
    }
    for (const flashEffect of flashEffects) {
      stage.removeChild(flashEffect.graphic);
      flashEffect.graphic.destroy();
    }
    for (const arcEffect of arcEffects) {
      stage.removeChild(arcEffect.graphic);
      arcEffect.graphic.destroy();
    }
    markers.clear();
    fallbackMarkers.clear();
    flashEffects.length = 0;
    arcEffects.length = 0;
    activeScreenShake = null;
  };

  return { destroy, handleCombatEvent, renderEntities, triggerAttackArc };
};
