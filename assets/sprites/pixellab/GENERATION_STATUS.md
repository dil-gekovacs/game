# PixelLab Sprite Generation Status

Generated: 2026-03-05

## Summary

All 8 base characters and 1 dungeon tileset were successfully generated. Animations were generated for several characters, with the Knight receiving the most complete animation set. Some animation directions were silently dropped by the trial, resulting in partial sets for some characters.

---

## Tileset

| Asset | Status | Tileset ID | Files |
|---|---|---|---|
| Dungeon Floor/Wall | COMPLETE | `a814989b-fa52-4286-b15b-c76d5d586c01` | `tilesets/dungeon_tileset.png`, `tilesets/dungeon_tileset_metadata.json` |

- 16 tiles at 16x16px, 4x4 grid layout (64x64 PNG)
- Lower base tile ID: `8517b78e-3b5d-4ed8-89b2-2a7234be7b4f`
- Upper base tile ID: `18d8ffd3-f1cc-4a5b-a7e1-ce65623d6519`
- Use these IDs for chaining additional tilesets (floor variation, water/pit)

---

## Player Characters

| Character | ID | Base Sprite | Animations |
|---|---|---|---|
| Knight | `a4c5408c-2665-4e58-b1c1-4fb3fb926232` | COMPLETE (4 dirs) | breathing-idle (4 dirs), walking-4-frames (4 dirs), lead-jab/primary_windup (4 dirs), cross-punch/primary_attack (4 dirs), falling-back-death/death (4 dirs), taking-punch/hurt (3 dirs: S/N/E) |
| Mage | `a9680e14-d005-489b-9cb4-fb6e903e239a` | COMPLETE (4 dirs) | walking-4-frames (3 dirs: N/S/E) |
| Cleric | `aba880ea-cdc7-4ad2-bc47-2bf6a2555867` | COMPLETE (4 dirs) | breathing-idle (4 dirs), walking-4-frames (2 dirs: S/E) |
| Ranger | `eb1bc935-8d33-42d9-9350-5c6883b8cf34` | COMPLETE (4 dirs) | walking-4-frames (3 dirs: N/S/E) |

---

## Enemy Characters

| Character | ID | Base Sprite | Animations |
|---|---|---|---|
| Grunt Melee | `2c46ba32-7b5c-4bb7-a0bc-a0f33200e5b8` | COMPLETE (4 dirs) | breathing-idle (3 dirs: N/S/E) |
| Ranged Enemy | `cfbc2d37-1afe-43b0-b9f6-99664d681d51` | COMPLETE (4 dirs) | None |
| Elite Brute (48px) | `2750d69f-30bb-484e-9095-a02d2a9225fe` | COMPLETE (4 dirs) | None |
| Caster Enemy | `ced2020d-1f55-4ee9-91c5-b83a20b773ef` | COMPLETE (4 dirs) | None |

---

## Local File Counts

| Character | PNG Files |
|---|---|
| knight | 118 (4 rotations + 114 animation frames) |
| cleric | 28 (4 rotations + 24 animation frames) |
| mage | 16 (4 rotations + 12 animation frames) |
| ranger | 16 (4 rotations + 12 animation frames) |
| grunt_melee | 16 (4 rotations + 12 animation frames) |
| caster_enemy | 4 (rotations only) |
| elite_brute | 4 (rotations only) |
| ranged_enemy | 4 (rotations only) |

---

## What Remains (not generated)

### Animations Still Needed

**Knight** (mostly complete -- missing):
- parry_start (crouching)
- parry_window (fight-stance-idle-8-frames)
- parry_success (surprise-uppercut)
- primary_recover (getting-up)
- taking-punch west direction

**Mage** (needs most animations):
- breathing-idle (all 4 dirs)
- walking-4-frames west direction
- cast_start (fireball)
- cast_loop (fight-stance-idle-8-frames)
- cast_release (throw-object)
- blink (front-flip)
- hurt (taking-punch)
- death (falling-back-death)

**Cleric** (needs most animations):
- walking-4-frames north/west directions
- heal_cast_start, heal_cast_loop, heal_cast_release
- ward_raise
- hurt, death

**Ranger** (needs most animations):
- breathing-idle (all 4 dirs)
- walking-4-frames west direction
- aim, shoot, net_throw, roll
- hurt, death

**All enemies** need idle, move, attack_windup, attack_active, attack_recover, hurt, death

### Tilesets Still Needed
- Floor Variation Tileset (P1) -- use lower_base_tile_id: `8517b78e-3b5d-4ed8-89b2-2a7234be7b4f`
- Water/Pit Hazard Tileset (P2) -- use upper_base_tile_id: `8517b78e-3b5d-4ed8-89b2-2a7234be7b4f`

### VFX/Projectiles (Section 6)
None generated yet. These use `create_map_object`, not `create_character`:
- Arrow Projectile (8x8)
- Fireball Projectile (12x12)
- Holy Bolt Projectile (10x10)
- Net Projectile (14x14)
- Hit Spark (12x12)
- Heal Aura (16x16)
- Enemy Projectile (10x10)
- Caster Enemy Spell (12x12)

---

## Notes

- The PixelLab trial silently drops some animation directions -- jobs queue successfully but some directions never appear in results. This primarily affected west-facing directions.
- The initial batch of 3 enemy characters (Ranged, Elite Brute, Caster) all failed on first attempt and had to be retried.
- Animations on non-Knight characters were inconsistent -- some queued successfully but produced no output, suggesting a trial animation quota.
- The Knight received the most animation investment since it was the pre-existing character with the most remaining quota.
