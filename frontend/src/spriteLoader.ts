import { Assets, Texture } from "pixi.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRITE_BASE_PATH = "assets/sprites/pixellab/characters";

const ALL_CHARACTERS = [
  "knight",
  "grunt_melee",
  "skeleton",
  "mage",
  "cleric",
  "ranger",
  "ranged_enemy",
  "caster_enemy",
  "elite_brute",
] as const;

const DIRECTIONS = ["south", "north", "east", "west"] as const;

/**
 * Manifest of animations per character.
 * Each entry maps a character name to its available animation sets.
 * Each animation set lists the directions and frame count available.
 */
type AnimationManifestEntry = {
  name: string;
  directions: ReadonlyArray<string>;
  frameCount: number;
};

const CHARACTER_ANIMATIONS: Record<string, ReadonlyArray<AnimationManifestEntry>> = {
  knight: [
    { name: "breathing-idle", directions: DIRECTIONS, frameCount: 4 },
    { name: "walking-4-frames", directions: DIRECTIONS, frameCount: 4 },
    { name: "lead-jab", directions: DIRECTIONS, frameCount: 3 },
    { name: "cross-punch", directions: DIRECTIONS, frameCount: 6 },
  ],
  grunt_melee: [
    { name: "breathing-idle", directions: ["south", "north", "east"], frameCount: 4 },
    { name: "walking-4-frames", directions: ["south", "north", "east"], frameCount: 4 },
    { name: "lead-jab", directions: ["south", "north", "east"], frameCount: 3 },
    { name: "taking-punch", directions: ["south", "north", "east"], frameCount: 6 },
    { name: "falling-back-death", directions: ["south", "north", "east"], frameCount: 7 },
  ],
  skeleton: [
    { name: "breathing-idle", directions: DIRECTIONS, frameCount: 4 },
    { name: "walking-4-frames", directions: DIRECTIONS, frameCount: 4 },
    { name: "lead-jab", directions: DIRECTIONS, frameCount: 3 },
    { name: "taking-punch", directions: DIRECTIONS, frameCount: 6 },
    { name: "falling-back-death", directions: DIRECTIONS, frameCount: 7 },
    { name: "cross-punch", directions: DIRECTIONS, frameCount: 6 },
  ],
  cleric: [
    { name: "breathing-idle", directions: DIRECTIONS, frameCount: 4 },
    { name: "walking-4-frames", directions: ["south", "east"], frameCount: 4 },
  ],
  mage: [
    { name: "breathing-idle", directions: DIRECTIONS, frameCount: 4 },
    { name: "walking-4-frames", directions: ["south", "north", "east"], frameCount: 4 },
    { name: "fireball", directions: DIRECTIONS, frameCount: 6 },
  ],
  ranger: [
    { name: "walking-4-frames", directions: ["south", "north", "east"], frameCount: 4 },
  ],
};

/** Characters whose sprites use a 48x48 canvas instead of 32x32. */
const LARGE_SPRITE_CHARACTERS = new Set<string>(["elite_brute"]);

const STANDARD_SPRITE_SIZE = 32;
const LARGE_SPRITE_SIZE = 48;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpriteAssets = {
  /**
   * Look up a texture by character name, direction, and optional animation.
   *
   * Static rotation:  getTexture("knight", "south")
   * Animation frame:  getTexture("knight", "south", "breathing-idle", 2)
   *
   * Returns Texture.EMPTY when no matching texture was loaded.
   */
  getTexture: (
    characterName: string,
    direction: string,
    animation?: string,
    frameIndex?: number,
  ) => Texture;

  /** Returns the sprite pixel size for a given character (32 or 48). */
  getSpriteSize: (characterName: string) => number;
};

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

function rotationKey(character: string, direction: string): string {
  return `${character}/rotations/${direction}`;
}

function animationFrameKey(
  character: string,
  animation: string,
  direction: string,
  frameIndex: number,
): string {
  const paddedFrame = String(frameIndex).padStart(3, "0");
  return `${character}/animations/${animation}/${direction}/frame_${paddedFrame}`;
}

function assetPath(key: string): string {
  return `${SPRITE_BASE_PATH}/${key}.png`;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Loads all character sprite textures from individual PNG files and returns
 * an accessor object for looking up textures by structured keys.
 *
 * This uses PixiJS Assets.load() to fetch individual files. The files are
 * small (500-700 bytes each, ~120 total) so this is efficient enough for
 * the current sprite count.
 */
export async function loadSpriteAssets(): Promise<SpriteAssets> {
  const textureMap = new Map<string, Texture>();

  // Collect all asset URLs to load in a single batch
  const assetsToLoad: Array<{ key: string; url: string }> = [];

  for (const character of ALL_CHARACTERS) {
    // Queue rotation sprites for all directions
    for (const direction of DIRECTIONS) {
      const key = rotationKey(character, direction);
      assetsToLoad.push({ key, url: assetPath(key) });
    }

    // Queue animation frame sprites
    const animations = CHARACTER_ANIMATIONS[character];
    if (animations !== undefined) {
      for (const animDef of animations) {
        for (const direction of animDef.directions) {
          for (let frame = 0; frame < animDef.frameCount; frame++) {
            const key = animationFrameKey(character, animDef.name, direction, frame);
            assetsToLoad.push({ key, url: assetPath(key) });
          }
        }
      }
    }
  }

  // Register all assets with PixiJS using aliases so we can load/lookup by key
  for (const entry of assetsToLoad) {
    Assets.add({ alias: entry.key, src: entry.url });
  }

  // Load all textures in parallel via Assets.load using alias keys
  const keyList = assetsToLoad.map((entry) => entry.key);
  const loadedTextures = await Assets.load<Texture>(keyList);

  // Build lookup map from our structured keys to loaded textures
  for (const entry of assetsToLoad) {
    const texture = loadedTextures[entry.key];
    if (texture instanceof Texture && texture !== Texture.EMPTY) {
      textureMap.set(entry.key, texture);
    }
  }

  // --- Public accessor ---

  function getTexture(
    characterName: string,
    direction: string,
    animation?: string,
    frameIndex?: number,
  ): Texture {
    if (animation !== undefined && frameIndex !== undefined) {
      const key = animationFrameKey(characterName, animation, direction, frameIndex);
      const animTexture = textureMap.get(key);
      if (animTexture !== undefined) {
        return animTexture;
      }
      // Fall through to static rotation if animation frame is missing
    }

    const key = rotationKey(characterName, direction);
    const rotTexture = textureMap.get(key);
    if (rotTexture !== undefined) {
      return rotTexture;
    }

    // Ultimate fallback: try south rotation, then Texture.EMPTY
    const fallbackKey = rotationKey(characterName, "south");
    return textureMap.get(fallbackKey) ?? Texture.EMPTY;
  }

  function getSpriteSize(characterName: string): number {
    if (LARGE_SPRITE_CHARACTERS.has(characterName)) {
      return LARGE_SPRITE_SIZE;
    }
    return STANDARD_SPRITE_SIZE;
  }

  return { getTexture, getSpriteSize };
}
