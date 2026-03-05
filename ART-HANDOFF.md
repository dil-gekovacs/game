# Art Handoff: Pixel-Art Creative Direction Kit

## Implementation Sequence
1. Lock palette ramps and class/enemy accent ownership from `assets/sprites/concepts/PIXEL-ART-CREATIVE-DIRECTION.md`.
2. Produce class concept sheets (Knight, Cleric, Mage, Ranger) at 16x16 with idle+move first.
3. Produce enemy family sheets (grunt, ranged, elite, caster) with baseline state set.
4. Add combat shot list states (windup/active/recovery, hurt, death) for all actors.
5. Export PNG frames with the required naming template in `tools/sprites/aseprite_export_template.json`.
6. Validate folder + filename conformity against `tools/sprites/creative_direction_spec.json`.
7. Pack atlas with `python3 tools/sprites/pack_atlas.py tools/sprites/atlas_config.json`.
8. Smoke-check atlas metadata keys and in-engine playback ordering.

## Production Checklist
- [ ] Palette uses shared ramps; no ad-hoc colors outside approved set.
- [ ] Class silhouettes are distinguishable at gameplay zoom during motion.
- [ ] Enemy threat telegraphs are visible at least 2 frames before active hit.
- [ ] All class-required animations exist (including class-specific states).
- [ ] All enemy families contain baseline state package.
- [ ] Export paths follow `{entity}/{animation}/{entity}_{animation}_{frame}.png`.
- [ ] Frame numbers are zero-padded and sequential per animation.
- [ ] Atlas builds successfully with current `atlas_config.json` settings.
- [ ] `assets/sprites/atlas.json` frame keys use relative paths from export root.
- [ ] Final pass verifies no readability regressions under multiplayer clutter.

## Notes for Engineering Integration
- Treat telegraph frames as gameplay-significant and preserve frame order.
- Keep class/enemy groups contiguous in atlas to simplify runtime animation maps.
- Keep projectile/VFX groups separable for optional later streaming.
