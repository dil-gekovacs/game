/**
 * shared/types/entities.ts
 *
 * Core entity and component types shared between the frontend (TypeScript)
 * and used as the canonical reference for backend (Go) implementations.
 *
 * Binary migration note: all numeric fields are sized for compact binary
 * encoding when the protocol migrates (see INTEGRATION_CONTRACT.md §4).
 * Field ranges are documented inline.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Entity ID. u16 in binary (0–65535). */
export type EntityId = number;

/** Player session ID (UUID string in JSON; 16 raw bytes in binary). */
export type PlayerId = string;

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/**
 * Character classes available to players.
 * u8 in binary.
 */
export enum CharacterClass {
  Knight = 0,
  Mage = 1,
  Cleric = 2,
  Ranger = 3,
}

/**
 * Entity type discriminator.
 * u8 in binary.
 */
export enum EntityType {
  Player = 0,
  Enemy = 1,
  Projectile = 2,
  Item = 3,
}

/**
 * Facing direction (4-directional).
 * Packed into 2 bits in binary; stored as u8 in JSON.
 */
export enum Facing {
  Down = 0,
  Up = 1,
  Left = 2,
  Right = 3,
}

/**
 * High-level entity animation/behavior state.
 * u8 in binary.
 */
export enum EntityState {
  Idle = 0,
  Moving = 1,
  Attacking = 2,
  Parrying = 3,
  Stunned = 4,
  Dead = 5,
  Casting = 6,
}

/**
 * Game event types used in EventNotification messages.
 * u8 in binary.
 */
export enum EventType {
  Damage = 0,
  Heal = 1,
  ParrySuccess = 2,
  ParryFail = 3,
  EntitySpawn = 4,
  EntityDespawn = 5,
  ItemPickup = 6,
  AbilityUsed = 7,
  RoomTransition = 8,
}

// ---------------------------------------------------------------------------
// Component snapshots
// ---------------------------------------------------------------------------

/**
 * Full entity state as broadcast in WorldSnapshot messages.
 *
 * Binary layout (24 bytes per entity):
 *   id       u16   [0-1]
 *   type     u8    [2]
 *   state    u8    [3]
 *   facing   u8    [4]
 *   hp       u8    [5]   (0-255; scale to maxHp on client)
 *   maxHp    u8    [6]   (0-255)
 *   animFrame u8   [7]
 *   x        i16   [8-9]  (world units, fixed-point ×10 if sub-tile needed)
 *   y        i16   [10-11]
 *   vx       i16   [12-13] (velocity ×100)
 *   vy       i16   [14-15]
 *   flags    u8    [16]   (bit 0: visible, bit 1: invincible, bits 2-7: reserved)
 *   _pad     u8×7  [17-23] (reserved for future fields)
 */
export interface EntitySnapshot {
  id: EntityId;
  type: EntityType;
  state: EntityState;
  facing: Facing;
  hp: number;
  maxHp: number;
  animFrame: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Bit 0: visible. Bit 1: invincible. Bits 2-7: reserved. */
  flags: number;
}

/**
 * Delta entity update: only fields that changed since the client's last
 * acknowledged snapshot are included. `id` is always present.
 *
 * JSON: omit undefined fields.
 * Binary: use a presence bitmask (u16) before the optional fields.
 */
export type EntityDelta = Pick<EntitySnapshot, "id"> &
  Partial<Omit<EntitySnapshot, "id">>;
