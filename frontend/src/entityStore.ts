import { EntityState } from "../../shared/types/entities";
import type { EntityDelta, EntityId, EntitySnapshot } from "../../shared/types/entities";
import type { InputSnapshot } from "./input";
import type { CollisionRect } from "./mapRenderer";

/**
 * Stored input for reconciliation replay. Mirrors the fields we need to
 * re-apply after a server snapshot corrects our position.
 */
type PendingInput = {
  aimAngle: number;
  moveX: number;
  moveY: number;
  seq: number;
};

type EntityRecord = {
  /** Full snapshot built from initial state + deltas. */
  current: EntitySnapshot;
  /** Previous position for render interpolation (remote entities). */
  previousX: number;
  previousY: number;
  /** Float-precision predicted position for local player (avoids int16 snap). */
  predictedX: number;
  predictedY: number;
};

type CollisionWorld = {
  collisions: CollisionRect[];
  worldHeight: number;
  worldWidth: number;
};

type EntityStore = {
  applySnapshot: (entities: EntityDelta[], ackSeq: number) => void;
  getEntities: () => ReadonlyMap<EntityId, EntityRecord>;
  getLocalEntity: () => EntityRecord | undefined;
  getLocalEntityId: () => EntityId | null;
  /** Called every fixed step to apply current input for continuous prediction. */
  predictFixedStep: (inputSnapshot: InputSnapshot) => void;
  /** Called at input send rate to record pending input for reconciliation. */
  recordPendingInput: (inputSnapshot: InputSnapshot, aimAngle: number, seq: number) => void;
  markDespawned: (entityId: EntityId) => void;
  removeEntity: (entityId: EntityId) => void;
  setCollisionWorld: (world: CollisionWorld) => void;
  setLocalEntityId: (entityId: EntityId) => void;
  upsertEntity: (snapshot: EntitySnapshot) => void;
};

/** Must match backend PlayerSpeed (96 px/s) and SimDeltaMs (33ms). */
const PLAYER_SPEED_PX_PER_SEC = 96;
const SIM_DELTA_SEC = 33 / 1000;
const PLAYER_RADIUS = 6.0;
const MAX_PENDING_INPUTS = 256;

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const circleIntersectsRect = (
  cx: number,
  cy: number,
  radius: number,
  rect: CollisionRect,
): boolean => {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const distX = cx - closestX;
  const distY = cy - closestY;
  return distX * distX + distY * distY < radius * radius;
};

const collidesWithWorld = (
  cx: number,
  cy: number,
  radius: number,
  world: CollisionWorld | null,
): boolean => {
  if (!world) {
    return false;
  }
  for (const rect of world.collisions) {
    if (circleIntersectsRect(cx, cy, radius, rect)) {
      return true;
    }
  }
  return false;
};

/** Mirrors backend moveWithCollisionLocked: axis-separated circle-vs-AABB. */
const applyInputToPosition = (
  positionX: number,
  positionY: number,
  moveX: number,
  moveY: number,
  world: CollisionWorld | null,
): { nextX: number; nextY: number } => {
  let dirX = moveX;
  let dirY = moveY;
  const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
  if (magnitude > 1) {
    dirX /= magnitude;
    dirY /= magnitude;
  }

  const deltaX = dirX * PLAYER_SPEED_PX_PER_SEC * SIM_DELTA_SEC;
  const deltaY = dirY * PLAYER_SPEED_PX_PER_SEC * SIM_DELTA_SEC;

  const worldWidth = world?.worldWidth ?? 800;
  const worldHeight = world?.worldHeight ?? 600;

  let nextX = clamp(positionX + deltaX, PLAYER_RADIUS, worldWidth - PLAYER_RADIUS);
  if (collidesWithWorld(nextX, positionY, PLAYER_RADIUS, world)) {
    nextX = positionX;
  }

  let nextY = clamp(positionY + deltaY, PLAYER_RADIUS, worldHeight - PLAYER_RADIUS);
  if (collidesWithWorld(nextX, nextY, PLAYER_RADIUS, world)) {
    nextY = positionY;
  }

  return { nextX, nextY };
};

export const createEntityStore = (): EntityStore => {
  const entities = new Map<EntityId, EntityRecord>();
  let localEntityId: EntityId | null = null;
  let collisionWorld: CollisionWorld | null = null;
  const pendingInputs: PendingInput[] = [];

  const setCollisionWorld = (world: CollisionWorld) => {
    collisionWorld = world;
  };

  const setLocalEntityId = (entityId: EntityId) => {
    localEntityId = entityId;
  };

  const getLocalEntityId = (): EntityId | null => localEntityId;

  const upsertEntity = (snapshot: EntitySnapshot) => {
    const existing = entities.get(snapshot.id);
    if (existing) {
      existing.previousX = existing.current.x;
      existing.previousY = existing.current.y;
      existing.current = { ...snapshot };
    } else {
      entities.set(snapshot.id, {
        current: { ...snapshot },
        predictedX: snapshot.x,
        predictedY: snapshot.y,
        previousX: snapshot.x,
        previousY: snapshot.y,
      });
    }
  };

  const markDespawned = (entityId: EntityId) => {
    const record = entities.get(entityId);
    if (record) {
      record.current.flags = 0;
      record.current.hp = 0;
      record.current.state = EntityState.Dead;
    }
  };

  const removeEntity = (entityId: EntityId) => {
    entities.delete(entityId);
  };

  const getEntities = (): ReadonlyMap<EntityId, EntityRecord> => entities;

  const getLocalEntity = (): EntityRecord | undefined => {
    if (localEntityId === null) {
      return undefined;
    }
    return entities.get(localEntityId);
  };

  const applyDeltaToEntity = (record: EntityRecord, delta: EntityDelta) => {
    record.previousX = record.current.x;
    record.previousY = record.current.y;

    if (delta.type !== undefined) {
      record.current.type = delta.type;
    }
    if (delta.state !== undefined) {
      record.current.state = delta.state;
    }
    if (delta.facing !== undefined) {
      record.current.facing = delta.facing;
    }
    if (delta.hp !== undefined) {
      record.current.hp = delta.hp;
    }
    if (delta.maxHp !== undefined) {
      record.current.maxHp = delta.maxHp;
    }
    if (delta.animFrame !== undefined) {
      record.current.animFrame = delta.animFrame;
    }
    if (delta.x !== undefined) {
      record.current.x = delta.x;
    }
    if (delta.y !== undefined) {
      record.current.y = delta.y;
    }
    if (delta.vx !== undefined) {
      record.current.vx = delta.vx;
    }
    if (delta.vy !== undefined) {
      record.current.vy = delta.vy;
    }
    if (delta.flags !== undefined) {
      record.current.flags = delta.flags;
    }
  };

  const dropAcknowledgedInputs = (ackSeq: number) => {
    while (pendingInputs.length > 0 && pendingInputs[0]!.seq <= ackSeq) {
      pendingInputs.shift();
    }
  };

  const replayPendingInputs = (record: EntityRecord) => {
    let replayX = record.current.x;
    let replayY = record.current.y;

    for (const pending of pendingInputs) {
      const { nextX, nextY } = applyInputToPosition(
        replayX,
        replayY,
        pending.moveX,
        pending.moveY,
        collisionWorld,
      );
      replayX = nextX;
      replayY = nextY;
    }

    record.predictedX = replayX;
    record.predictedY = replayY;
  };

  const createRecordFromDelta = (delta: EntityDelta): EntityRecord => {
    const snapshot: EntitySnapshot = {
      animFrame: delta.animFrame ?? 0,
      facing: delta.facing ?? 0,
      flags: delta.flags ?? 1,
      hp: delta.hp ?? 0,
      id: delta.id,
      maxHp: delta.maxHp ?? 0,
      state: delta.state ?? EntityState.Idle,
      type: delta.type ?? 0,
      vx: delta.vx ?? 0,
      vy: delta.vy ?? 0,
      x: delta.x ?? 0,
      y: delta.y ?? 0,
    };
    return {
      current: snapshot,
      predictedX: snapshot.x,
      predictedY: snapshot.y,
      previousX: snapshot.x,
      previousY: snapshot.y,
    };
  };

  const applySnapshot = (entityDeltas: EntityDelta[], ackSeq: number) => {
    for (const delta of entityDeltas) {
      const record = entities.get(delta.id);
      if (!record) {
        entities.set(delta.id, createRecordFromDelta(delta));
        continue;
      }
      applyDeltaToEntity(record, delta);
    }

    if (localEntityId === null) {
      return;
    }

    const localRecord = entities.get(localEntityId);
    if (!localRecord) {
      return;
    }

    dropAcknowledgedInputs(ackSeq);
    replayPendingInputs(localRecord);
  };

  /** Called every fixed update step (~60Hz) to continuously predict movement. */
  const predictFixedStep = (inputSnapshot: InputSnapshot) => {
    if (localEntityId === null) {
      return;
    }

    const localRecord = entities.get(localEntityId);
    if (!localRecord) {
      return;
    }

    const { nextX, nextY } = applyInputToPosition(
      localRecord.predictedX,
      localRecord.predictedY,
      inputSnapshot.moveX,
      inputSnapshot.moveY,
      collisionWorld,
    );

    localRecord.predictedX = nextX;
    localRecord.predictedY = nextY;
  };

  /** Called at input send rate (~30Hz) to record input for server reconciliation. */
  const recordPendingInput = (inputSnapshot: InputSnapshot, aimAngle: number, seq: number) => {
    pendingInputs.push({
      aimAngle,
      moveX: inputSnapshot.moveX,
      moveY: inputSnapshot.moveY,
      seq,
    });

    if (pendingInputs.length > MAX_PENDING_INPUTS) {
      pendingInputs.shift();
    }
  };

  return {
    applySnapshot,
    getEntities,
    getLocalEntity,
    getLocalEntityId,
    markDespawned,
    predictFixedStep,
    recordPendingInput,
    removeEntity,
    setCollisionWorld,
    setLocalEntityId,
    upsertEntity,
  };
};

export type { EntityRecord, EntityStore, PendingInput };
