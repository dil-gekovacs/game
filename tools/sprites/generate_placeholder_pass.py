#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance

CLASSES = {
    "knight": ["idle", "move", "primary_windup", "primary_attack", "primary_recover", "parry_start", "parry_window", "parry_success", "hurt", "death"],
    "cleric": ["idle", "move", "heal_cast_start", "heal_cast_loop", "heal_cast_release", "ward_raise", "hurt", "death"],
    "mage": ["idle", "move", "cast_start", "cast_loop", "cast_release", "blink", "hurt", "death"],
    "ranger": ["idle", "move", "aim", "shoot", "net_throw", "roll", "hurt", "death"],
}
ENEMY_BASELINE = ["idle", "move", "attack_windup", "attack_active", "attack_recover", "hurt", "death"]
ENEMIES = ["enemy_grunt", "enemy_ranged", "enemy_elite", "enemy_caster"]
EXTRAS = {
    "projectiles": ["idle"],
    "fx_combat": ["idle"],
}

TINTS = {
    "knight": (1.05, 1.00, 0.95),
    "cleric": (0.95, 1.05, 0.95),
    "mage": (0.92, 0.98, 1.10),
    "ranger": (0.95, 1.03, 1.02),
    "enemy_grunt": (1.08, 0.92, 0.92),
    "enemy_ranged": (1.04, 0.98, 0.90),
    "enemy_elite": (1.10, 0.95, 0.95),
    "enemy_caster": (1.00, 0.94, 1.10),
    "projectiles": (1.18, 1.10, 0.85),
    "fx_combat": (1.15, 1.05, 0.95),
}


def build_animation_map():
    out = {k: v[:] for k, v in CLASSES.items()}
    for enemy in ENEMIES:
        out[enemy] = ENEMY_BASELINE[:]
    out.update(EXTRAS)
    return out


def apply_tint(image, tint):
    r, g, b, a = image.split()
    r = ImageEnhance.Brightness(r).enhance(tint[0])
    g = ImageEnhance.Brightness(g).enhance(tint[1])
    b = ImageEnhance.Brightness(b).enhance(tint[2])
    return Image.merge("RGBA", (r, g, b, a))


def normalize_crop(crop, frame_size):
    alpha = crop.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        crop = crop.crop(bbox)
    crop.thumbnail((frame_size - 6, frame_size - 6), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    x = (frame_size - crop.width) // 2
    y = frame_size - crop.height - 2
    canvas.paste(crop, (x, y), crop)
    return canvas


def auto_candidates(source, grid_size, frame_size):
    w, h = source.size
    candidates = []
    for y in range(0, h - grid_size + 1, grid_size):
        for x in range(0, w - grid_size + 1, grid_size):
            crop = source.crop((x, y, x + grid_size, y + grid_size))
            alpha = crop.split()[-1]
            if alpha.getbbox() is None:
                continue
            hist = alpha.histogram()
            coverage = sum(hist[9:]) / (grid_size * grid_size)
            if coverage < 0.04:
                continue
            candidates.append((x, y, grid_size, grid_size, normalize_crop(crop, frame_size)))
    if not candidates:
        fallback = normalize_crop(source.copy(), frame_size)
        candidates.append((0, 0, source.width, source.height, fallback))
    return candidates


def load_manual_mapping(mapping_path):
    if not mapping_path:
        return {}
    with open(mapping_path, "r", encoding="utf-8") as f:
        return json.load(f)


def rect_to_crop(source, rect, frame_size):
    x, y, w, h = rect
    crop = source.crop((x, y, x + w, y + h))
    return normalize_crop(crop, frame_size)


def main():
    p = argparse.ArgumentParser(description="Generate placeholder sprite pass from a source image.")
    p.add_argument("--source", required=True)
    p.add_argument("--out", default="assets/sprites/placeholders")
    p.add_argument("--frame-size", type=int, default=64)
    p.add_argument("--grid-size", type=int, default=64)
    p.add_argument("--frames-per-animation", type=int, default=2)
    p.add_argument("--mapping-json", help="Optional manual mapping JSON: {entity:{animation:[[x,y,w,h],...]}}")
    args = p.parse_args()

    source = Image.open(args.source).convert("RGBA")
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    animations = build_animation_map()
    manual = load_manual_mapping(args.mapping_json)
    candidates = auto_candidates(source, args.grid_size, args.frame_size)

    manifest = {
        "version": 1,
        "source": str(Path(args.source).resolve()),
        "frame_size": args.frame_size,
        "grid_size": args.grid_size,
        "frames_per_animation": args.frames_per_animation,
        "files": [],
    }

    cursor = 0
    for entity, anims in animations.items():
        tint = TINTS.get(entity, (1.0, 1.0, 1.0))
        for anim in anims:
            manual_rects = manual.get(entity, {}).get(anim, []) if manual else []
            frame_total = max(1, len(manual_rects)) if manual_rects else args.frames_per_animation
            for frame_idx in range(frame_total):
                if manual_rects:
                    rect = manual_rects[frame_idx]
                    img = rect_to_crop(source, rect, args.frame_size)
                    src_rect = rect
                else:
                    src_rect = candidates[cursor % len(candidates)][:4]
                    img = candidates[cursor % len(candidates)][4].copy()
                    cursor += 1
                img = apply_tint(img, tint)
                rel = Path(entity) / anim / f"{entity}_{anim}_{frame_idx:02d}.png"
                dest = out_dir / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                img.save(dest)
                manifest["files"].append({"path": rel.as_posix(), "source_rect": src_rect})

    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Wrote {len(manifest['files'])} frames to {out_dir}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
