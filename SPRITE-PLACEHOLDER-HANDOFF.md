# Sprite Placeholder Handoff

## What was generated
- Placeholder sprite pass generated at `assets/sprites/placeholders/**` from:
  - `/Users/gekovacs/Downloads/20260305_1119_Image Generation_simple_compose_01kjyr2zxcf96bemx2ywaagp3h.png`
- Naming convention follows `tools/sprites/creative_direction_spec.json` template:
  - `{entity}/{animation}/{entity}_{animation}_{frame}.png`
- Included entities/animations:
  - Classes: `knight`, `cleric`, `mage`, `ranger` (class animation sets from spec)
  - Enemies: `enemy_grunt`, `enemy_ranged`, `enemy_elite`, `enemy_caster` (enemy baseline set)
  - Extra placeholders: `projectiles/idle`, `fx_combat/idle`
- Manifest:
  - `assets/sprites/placeholders/manifest.json` (validated JSON)

## Helper script
Script:
- `tools/sprites/generate_placeholder_pass.py`

Purpose:
- Auto-generate placeholder frames from a source image using grid sampling + normalization.
- Optional manual slicing override via mapping JSON for precise extraction.

Manual mapping template:
- `tools/sprites/placeholder_manual_map.example.json`

## Exact usage
1. Create a Python venv and install Pillow:
```bash
python3 -m venv /tmp/game-sprite-venv
/tmp/game-sprite-venv/bin/pip install pillow
```

2. Generate placeholder pass (auto-grid):
```bash
/tmp/game-sprite-venv/bin/python tools/sprites/generate_placeholder_pass.py \
  --source "/Users/gekovacs/Downloads/20260305_1119_Image Generation_simple_compose_01kjyr2zxcf96bemx2ywaagp3h.png" \
  --out assets/sprites/placeholders \
  --frame-size 64 \
  --grid-size 64 \
  --frames-per-animation 2
```

3. Generate with exact/manual slices:
```bash
/tmp/game-sprite-venv/bin/python tools/sprites/generate_placeholder_pass.py \
  --source "/Users/gekovacs/Downloads/20260305_1119_Image Generation_simple_compose_01kjyr2zxcf96bemx2ywaagp3h.png" \
  --out assets/sprites/placeholders \
  --mapping-json tools/sprites/placeholder_manual_map.example.json
```

4. Validate manifest JSON:
```bash
python3 -c 'import json; json.load(open("assets/sprites/placeholders/manifest.json")); print("manifest ok")'
```

5. Optional atlas generation for engine integration:
```bash
python3 tools/sprites/pack_atlas.py tools/sprites/atlas_config.json
```
(If needed, point `atlas_config.json` `input_dir` at `assets/sprites/placeholders`.)

## Limitations
- This pass is intentionally rough for local demo integration, not final production art.
- Frames are auto-sampled from one source image; motion readability is limited.
- Manual mapping should be used for improved silhouette consistency and cleaner per-animation sequencing.
