import type { EntityState, EntityType, Facing } from "../../shared/types/entities";

// Re-import as values for runtime use (enums are both types and values)
import {
  EntityState as State,
  EntityType as EType,
  Facing as FacingEnum,
  CharacterClass,
} from "../../shared/types/entities";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENEMY_ID_OFFSET = 1000;
const ENEMY_ARCHETYPE_COUNT = 3;
const ARCHETYPE_STANDARD = 0;
const ARCHETYPE_FAST = 1;
const ARCHETYPE_TANK = 2;

const IDLE_FRAME_DURATION_MS = 200;
const WALK_FRAME_DURATION_MS = 150;
const ATTACK_FRAME_DURATION_MS = 120;
const IDLE_FRAME_COUNT = 4;
const WALK_FRAME_COUNT = 4;
const ATTACK_FRAME_COUNT = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnimationDef = {
  animationName: string | null; // null = use static rotation
  frameCount: number;
  frameDurationMs: number;
  loop: boolean;
};

// ---------------------------------------------------------------------------
// Direction mapping
// ---------------------------------------------------------------------------

const FACING_TO_DIRECTION: Record<Facing, string> = {
  [FacingEnum.Down]: "south",
  [FacingEnum.Up]: "north",
  [FacingEnum.Left]: "west",
  [FacingEnum.Right]: "east",
};

export function getFacingDirection(facing: Facing): string {
  return FACING_TO_DIRECTION[facing] ?? "south";
}

// ---------------------------------------------------------------------------
// Character name mapping
// ---------------------------------------------------------------------------

const ENTITY_TYPE_TO_CHARACTER: Record<EntityType, string> = {
  [EType.Player]: "knight",
  [EType.Enemy]: "grunt_melee",
  [EType.Projectile]: "knight",
  [EType.Item]: "knight",
};

const CHARACTER_CLASS_TO_NAME: Record<number, string> = {
  [CharacterClass.Knight]: "knight",
  [CharacterClass.Mage]: "mage",
  [CharacterClass.Cleric]: "cleric",
  [CharacterClass.Ranger]: "ranger",
};

const ENEMY_ARCHETYPE_TO_CHARACTER: Record<number, string> = {
  [ARCHETYPE_STANDARD]: "grunt_melee",
  [ARCHETYPE_FAST]: "skeleton",
  [ARCHETYPE_TANK]: "elite_brute",
};

export function getCharacterName(
  entityType: EntityType,
  characterClass?: number,
  entityId?: number,
): string {
  if (entityType === EType.Player && characterClass !== undefined) {
    return CHARACTER_CLASS_TO_NAME[characterClass] ?? "knight";
  }
  if (entityType === EType.Enemy && entityId !== undefined) {
    const archetypeIndex = (entityId - ENEMY_ID_OFFSET) % ENEMY_ARCHETYPE_COUNT;
    return ENEMY_ARCHETYPE_TO_CHARACTER[archetypeIndex] ?? "grunt_melee";
  }
  return ENTITY_TYPE_TO_CHARACTER[entityType] ?? "knight";
}

// ---------------------------------------------------------------------------
// Static-rotation fallback
// ---------------------------------------------------------------------------

const STATIC_ROTATION: AnimationDef = {
  animationName: null,
  frameCount: 1,
  frameDurationMs: 0,
  loop: false,
};

// ---------------------------------------------------------------------------
// Knight animation table
// ---------------------------------------------------------------------------

const KNIGHT_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {
  [State.Idle]: {
    animationName: "breathing-idle",
    frameCount: IDLE_FRAME_COUNT,
    frameDurationMs: IDLE_FRAME_DURATION_MS,
    loop: true,
  },
  [State.Moving]: {
    animationName: "walking-4-frames",
    frameCount: WALK_FRAME_COUNT,
    frameDurationMs: WALK_FRAME_DURATION_MS,
    loop: true,
  },
  [State.Attacking]: {
    animationName: "lead-jab",
    frameCount: ATTACK_FRAME_COUNT,
    frameDurationMs: ATTACK_FRAME_DURATION_MS,
    loop: false,
  },
};

// ---------------------------------------------------------------------------
// Grunt melee animation table
// ---------------------------------------------------------------------------

const GRUNT_MELEE_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {
  [State.Idle]: {
    animationName: "breathing-idle",
    frameCount: IDLE_FRAME_COUNT,
    frameDurationMs: IDLE_FRAME_DURATION_MS,
    loop: true,
  },
  [State.Moving]: {
    animationName: "walking-4-frames",
    frameCount: 4,
    frameDurationMs: 150,
    loop: true,
  },
  [State.Attacking]: {
    animationName: "lead-jab",
    frameCount: 3,
    frameDurationMs: 100,
    loop: false,
  },
  [State.Stunned]: {
    animationName: "taking-punch",
    frameCount: 6,
    frameDurationMs: 100,
    loop: false,
  },
  [State.Dead]: {
    animationName: "falling-back-death",
    frameCount: 7,
    frameDurationMs: 120,
    loop: false,
  },
};

// ---------------------------------------------------------------------------
// Cleric animation table
// ---------------------------------------------------------------------------

const CLERIC_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {
  [State.Idle]: {
    animationName: "breathing-idle",
    frameCount: IDLE_FRAME_COUNT,
    frameDurationMs: IDLE_FRAME_DURATION_MS,
    loop: true,
  },
  [State.Moving]: {
    animationName: "walking-4-frames",
    frameCount: WALK_FRAME_COUNT,
    frameDurationMs: WALK_FRAME_DURATION_MS,
    loop: true,
  },
};

// ---------------------------------------------------------------------------
// Mage / Ranger animation tables
// ---------------------------------------------------------------------------

const MAGE_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {
  [State.Moving]: {
    animationName: "walking-4-frames",
    frameCount: WALK_FRAME_COUNT,
    frameDurationMs: WALK_FRAME_DURATION_MS,
    loop: true,
  },
};

const RANGER_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {
  [State.Moving]: {
    animationName: "walking-4-frames",
    frameCount: WALK_FRAME_COUNT,
    frameDurationMs: WALK_FRAME_DURATION_MS,
    loop: true,
  },
};

// ---------------------------------------------------------------------------
// Skeleton (fast archetype) — full animation set
// ---------------------------------------------------------------------------

const SKELETON_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {
  [State.Idle]: {
    animationName: "breathing-idle",
    frameCount: 4,
    frameDurationMs: 200,
    loop: true,
  },
  [State.Moving]: {
    animationName: "walking-4-frames",
    frameCount: 4,
    frameDurationMs: 150,
    loop: true,
  },
  [State.Attacking]: {
    animationName: "lead-jab",
    frameCount: 3,
    frameDurationMs: 100,
    loop: false,
  },
  [State.Dead]: {
    animationName: "falling-back-death",
    frameCount: 7,
    frameDurationMs: 120,
    loop: false,
  },
};

// ---------------------------------------------------------------------------
// Ranged enemy — rotations only (kept for reference)
// ---------------------------------------------------------------------------

const RANGED_ENEMY_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {};

// ---------------------------------------------------------------------------
// Elite brute (tank archetype) — rotations only, 48px canvas
// ---------------------------------------------------------------------------

const ELITE_BRUTE_ANIMATIONS: Partial<Record<EntityState, AnimationDef>> = {};

// ---------------------------------------------------------------------------
// Master lookup
// ---------------------------------------------------------------------------

const CHARACTER_ANIMATION_TABLES: Record<string, Partial<Record<EntityState, AnimationDef>>> = {
  knight: KNIGHT_ANIMATIONS,
  grunt_melee: GRUNT_MELEE_ANIMATIONS,
  skeleton: SKELETON_ANIMATIONS,
  ranged_enemy: RANGED_ENEMY_ANIMATIONS,
  elite_brute: ELITE_BRUTE_ANIMATIONS,
  cleric: CLERIC_ANIMATIONS,
  mage: MAGE_ANIMATIONS,
  ranger: RANGER_ANIMATIONS,
};

/**
 * Characters that are missing specific direction animations.
 * Key format: "characterName/animationName/direction"
 */
const MISSING_DIRECTION_ANIMATIONS = new Set<string>([
  "grunt_melee/breathing-idle/west",
]);

export function getAnimationDef(
  entityType: EntityType,
  state: EntityState,
  characterClass?: number,
  entityId?: number,
): AnimationDef {
  const characterName = getCharacterName(entityType, characterClass, entityId);
  const table = CHARACTER_ANIMATION_TABLES[characterName];
  if (table === undefined) {
    return STATIC_ROTATION;
  }
  return table[state] ?? STATIC_ROTATION;
}

/**
 * Returns true if the given character/animation/direction combination is known
 * to be missing, meaning the caller should fall back to the static rotation.
 */
export function isDirectionMissing(
  characterName: string,
  animationName: string,
  direction: string,
): boolean {
  return MISSING_DIRECTION_ANIMATIONS.has(`${characterName}/${animationName}/${direction}`);
}
