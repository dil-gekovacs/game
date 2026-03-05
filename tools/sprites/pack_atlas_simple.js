#!/usr/bin/env node

/**
 * pack_atlas_simple.js
 *
 * Scans assets/sprites/pixellab/characters/ for all PNG files and produces:
 *   - frontend/public/assets/sprites/atlas.png  (combined spritesheet)
 *   - frontend/public/assets/sprites/atlas.json  (PixiJS-compatible metadata)
 *
 * Requires the `sharp` npm package:
 *   npm install sharp
 *
 * Usage:
 *   node tools/sprites/pack_atlas_simple.js
 *
 * All sprites are assumed to be either 32x32 or 48x48 (elite_brute).
 * A simple row-based packing strategy is used.
 */

import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const CHARACTERS_DIR = path.join(PROJECT_ROOT, "assets", "sprites", "pixellab", "characters");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "frontend", "public", "assets", "sprites");
const ATLAS_IMAGE_FILE = "atlas.png";
const ATLAS_JSON_FILE = "atlas.json";

// Maximum atlas width in pixels
const MAX_ATLAS_WIDTH = 1024;

/**
 * Recursively collects all .png files under a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectPngs(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectPngs(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Derives a frame key from an absolute file path relative to CHARACTERS_DIR.
 * e.g. "knight/rotations/south" (without .png extension)
 * @param {string} filePath
 * @returns {string}
 */
function deriveFrameKey(filePath) {
  const relative = path.relative(CHARACTERS_DIR, filePath);
  return relative.replace(/\.png$/, "").split(path.sep).join("/");
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error(
      "Error: sharp is not installed. Install it with:\n  npm install sharp\n\n" +
      "Falling back to JSON-only mode (no atlas image will be generated)."
    );
    sharp = null;
  }

  const pngFiles = (await collectPngs(CHARACTERS_DIR)).sort();
  console.log(`Found ${pngFiles.length} PNG files`);

  if (pngFiles.length === 0) {
    console.error("No PNG files found. Exiting.");
    process.exit(1);
  }

  // Read metadata for each sprite to determine actual sizes
  const sprites = [];
  for (const filePath of pngFiles) {
    const key = deriveFrameKey(filePath);
    let width = 32;
    let height = 32;

    if (sharp !== null) {
      const metadata = await sharp(filePath).metadata();
      width = metadata.width ?? 32;
      height = metadata.height ?? 32;
    } else if (key.startsWith("elite_brute/")) {
      // Hardcoded fallback for known 48x48 sprites
      width = 48;
      height = 48;
    }

    sprites.push({ filePath, key, width, height });
  }

  // Simple row packing: place sprites left-to-right, wrapping to next row
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  let atlasWidth = 0;

  for (const sprite of sprites) {
    if (currentX + sprite.width > MAX_ATLAS_WIDTH && currentX > 0) {
      currentX = 0;
      currentY += rowHeight;
      rowHeight = 0;
    }

    sprite.x = currentX;
    sprite.y = currentY;
    currentX += sprite.width;
    atlasWidth = Math.max(atlasWidth, currentX);
    rowHeight = Math.max(rowHeight, sprite.height);
  }

  const atlasHeight = currentY + rowHeight;

  // Round up to power of two for GPU friendliness
  const potwWidth = nextPowerOfTwo(atlasWidth);
  const potwHeight = nextPowerOfTwo(atlasHeight);

  // Build PixiJS spritesheet JSON
  const frames = {};
  for (const sprite of sprites) {
    frames[sprite.key] = {
      frame: { x: sprite.x, y: sprite.y, w: sprite.width, h: sprite.height },
      sourceSize: { w: sprite.width, h: sprite.height },
      spriteSourceSize: { x: 0, y: 0, w: sprite.width, h: sprite.height },
    };
  }

  const atlasJson = {
    frames,
    meta: {
      image: ATLAS_IMAGE_FILE,
      size: { w: potwWidth, h: potwHeight },
      scale: "1",
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const jsonOutputPath = path.join(OUTPUT_DIR, ATLAS_JSON_FILE);
  await writeFile(jsonOutputPath, JSON.stringify(atlasJson, null, 2), "utf-8");
  console.log(`Wrote atlas metadata: ${jsonOutputPath}`);

  // Generate the combined atlas image if sharp is available
  if (sharp !== null) {
    const compositeInputs = sprites.map(function buildInput(sprite) {
      return {
        input: sprite.filePath,
        left: sprite.x,
        top: sprite.y,
      };
    });

    const atlasBuffer = await sharp({
      create: {
        width: potwWidth,
        height: potwHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(compositeInputs)
      .png()
      .toBuffer();

    const imageOutputPath = path.join(OUTPUT_DIR, ATLAS_IMAGE_FILE);
    await writeFile(imageOutputPath, atlasBuffer);
    console.log(`Wrote atlas image: ${imageOutputPath} (${potwWidth}x${potwHeight})`);
  } else {
    console.log("Skipped atlas image generation (sharp not available).");
    console.log("The spriteLoader.ts will load individual PNG files instead.");
  }

  console.log(`Total sprites packed: ${sprites.length}`);
}

/**
 * Returns the next power of two >= n.
 * @param {number} n
 * @returns {number}
 */
function nextPowerOfTwo(n) {
  let value = 1;
  while (value < n) {
    value *= 2;
  }
  return value;
}

main().catch(function handleError(err) {
  console.error(err);
  process.exit(1);
});
