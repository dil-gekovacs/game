# Sprite Model Evaluation (fleet-sprite-model-eval)

## What models can/cannot do in this environment

### Can do well
- Convert the existing art direction into concrete production specs (silhouette rules, palette limits, animation shot lists, naming conventions).
- Generate structured sprite briefs per class/enemy and per animation state using the project constraints:
  - 16x16 base actors, 24x24/32x32 larger actors
  - 32 active colors shared, 3–4 colors + optional accent per frame
  - Required state sets from `creative_direction_spec.json`
- Review exported frame lists/metadata for consistency (missing states, naming drift, atlas grouping mistakes).
- Produce QA checklists and acceptance criteria for demo readiness.

### Cannot do directly (in this CLI environment)
- No direct pixel-image generation/editing pipeline is available in this environment (no integrated sprite canvas output).
- Cannot reliably produce final shippable sprite frames without a human pixel pass in Aseprite (or equivalent art tool).
- Cannot guarantee frame-to-frame pixel consistency, anti-flicker cleanup, or silhouette readability from raw generative output alone.

## Quality/risk expectations for direct sprite design

- **Direct model-only sprite design risk: High** for demo-facing assets.
- Main failure modes:
  - Inconsistent silhouette landmarks across frames (weapon/hand/head drift).
  - Palette/value violations versus NES-style readability constraints.
  - Weak telegraph readability in windup/active/recover timing for multiplayer combat.
  - Naming/export mismatch with pipeline template (`{entity}/{animation}/{entity}_{animation}_{frame}.png`).
- Expected quality if models are used without human art pass: acceptable for ideation, not reliable for final gameplay assets.

## Recommended workflow (AI + human + tooling)

1. **AI preproduction (spec + shot planning)**
   - Use model output to generate per-entity animation briefs from `PIXEL-ART-CREATIVE-DIRECTION.md` and `creative_direction_spec.json`.
   - Lock frame counts and key poses for each required state before drawing.

2. **Human pixel execution (Aseprite)**
   - Pixel artist creates/cleans sprites and enforces:
     - silhouette clarity at 1x/2x
     - palette/ramp discipline
     - telegraph visibility for at least 2 frames before active hits.

3. **Tooling export + packing**
   - Export via `tools/sprites/aseprite_export_template.json` into:
     - `assets/sprites/export/<entity>/<animation>/...`
   - Pack atlas:
     - `python3 tools/sprites/pack_atlas.py tools/sprites/atlas_config.json`
   - Validate atlas output files:
     - `assets/sprites/atlas.png`
     - `assets/sprites/atlas.json`

4. **AI-assisted QA pass**
   - Use model to compare exported paths/states against required class/enemy baselines and flag omissions.
   - Human resolves any readability/timing issues in source sprite files and re-exports.

## Acceptance checklist for using generated sprites in demo

- [ ] Every required class animation exists (knight/cleric/mage/ranger state lists match spec).
- [ ] Every enemy family includes baseline states (`idle`, `move`, `attack_windup`, `attack_active`, `attack_recover`, `hurt`, `death`).
- [ ] Telegraph-to-active readability is clear at gameplay scale, including interpolation tolerance.
- [ ] Palette constraints hold (shared palette target and per-frame color discipline).
- [ ] Filenames and folders match export template exactly (`lower_snake_case`, zero-padded frame index).
- [ ] Atlas pack completes with no collisions/missing references.
- [ ] `assets/sprites/atlas.json` keys map correctly to exported relative paths.
- [ ] Human art review signs off on silhouette readability and low flicker in loops.

## Recommendation

Use models here as **design copilot + QA copilot**, not as final sprite generator. For demo-quality assets, require a human pixel-art pass before export/packing, then run pipeline and checklist validation.
