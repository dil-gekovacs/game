# Pixel-Art Creative Direction Kit (NES-Inspired)

## 1) Visual Pillars
- Readability-first top-down action silhouettes at 16x16 base characters.
- NES-inspired hue economy: small, reusable color ramps with strong value separation.
- Multiplayer clarity: class identity and threat states must be recognizable in <150 ms glance windows.
- Network-aware animation: key telegraph and impact poses must be visible even with interpolation delay.

## 2) Palette Strategy (NES-Inspired)

### 2.1 Global constraints
- Use a shared master palette capped at **32 active colors** on-screen for characters/enemies/VFX (UI excluded).
- Per sprite frame target: **3-4 colors + 1 optional accent**.
- Avoid near-value twins; keep at least ~20 luma delta between adjacent ramp steps.

### 2.2 Master ramps
- **Neutral ramp**: outline + metal/stone readability.
- **Warm ramp**: skin/leather/fire telegraphs.
- **Cool ramp**: cloth/magic/projectiles.
- **Nature ramp**: poison/slime/forest enemies.
- **Damage ramp**: universal hit flash colors (shared for all actors).

### 2.3 Class accent allocations
- Knight accent: steel-blue + gold trim.
- Cleric accent: ivory + teal.
- Mage accent: violet + cyan glow.
- Ranger accent: forest-green + tan.

### 2.4 Enemy accent allocations
- Melee grunt (goblin/skeleton equivalent): muted earth + red warning pixel.
- Ranged enemy: dark body + bright projectile color.
- Elite/brute: higher contrast torso + unique horn/pauldron accent.
- Caster enemy: dark robe + saturated cast-hand accent.

### 2.5 Lighting and outlines
- Use 1-pixel dark outline on external silhouette only.
- Internal lines only when separating limbs/weapon from torso.
- Top-down light direction: upper-left highlight, lower-right shadow.

## 3) Sprite Readability Rules
- 16x16 units for common actors; bosses can be 24x24 or 32x32.
- Silhouette must read at 1x zoom and 2x zoom in motion.
- Keep head/weapon/hands as stable landmarks across frames.
- Cap per-frame noisy single-pixel flicker; avoid checkerboard shimmer in walk cycles.
- Team/combat priority order for contrast:
  1. Player classes
  2. Active enemy attack telegraph
  3. Projectiles
  4. Idle enemies/background props
- Every attack has three readable moments: **anticipation**, **active**, **recovery**.
- Telegraphed danger pixels (weapon glow/eye flash) must appear at least 2 frames before active hit.

## 4) Animation Shot List

### 4.1 Player classes (all classes)
- `idle` (4f loop)
- `move` (6f loop)
- `primary_windup` (2f)
- `primary_attack` (3f)
- `primary_recover` (2f)
- `hurt` (2f)
- `death` (4f, non-loop)

### 4.2 Knight-specific
- `parry_start` (2f)
- `parry_window` (2f hold)
- `parry_success` (3f)
- `block_move` (4f)

### 4.3 Cleric-specific
- `heal_cast_start` (2f)
- `heal_cast_loop` (3f hold/loop)
- `heal_cast_release` (3f)
- `ward_raise` (3f)

### 4.4 Mage-specific
- `cast_start` (2f)
- `cast_loop` (3f hold/loop)
- `cast_release` (3f)
- `blink` (4f)

### 4.5 Ranger-specific
- `aim` (2f hold)
- `shoot` (3f)
- `net_throw` (3f)
- `roll` (4f)

### 4.6 Enemy baseline set (all enemy families)
- `idle` (4f)
- `move` (4-6f)
- `attack_windup` (2f)
- `attack_active` (2-3f)
- `attack_recover` (2f)
- `hurt` (2f)
- `death` (4f)

### 4.7 Projectile/VFX set
- `projectile_fly` (2-4f)
- `projectile_hit` (3f)
- `muzzle_or_cast_flash` (2f)
- `hit_spark` (3f)

## 5) Per-Class Sprite Requirements

## Knight
- Base sheet target: 16x16.
- Required props: sword + shield variants integrated in silhouette.
- Distinctive markers: broad shoulders, shield-side stance, steel highlight cluster.
- Priority set for MVP: `idle`, `move`, `primary_*`, `parry_*`, `hurt`, `death`.

## Cleric
- Base sheet target: 16x16.
- Required props: mace/flail silhouette and off-hand tome or holy focus.
- Distinctive markers: robe tabard, bright support accent, and halo glyph pixel cluster.
- Priority set for MVP: `idle`, `move`, `heal_cast_*`, `ward_raise`, `hurt`, `death`.

## Mage
- Base sheet target: 16x16.
- Required props: staff or focus-hand glow variant.
- Distinctive markers: robe hem and bright cast-hand accent.
- Priority set for MVP: `idle`, `move`, `cast_*`, `blink`, `hurt`, `death`.

## Ranger
- Base sheet target: 16x16.
- Required props: bow silhouette and bundled net in off-hand/back-slot.
- Distinctive markers: hood/cape tail and net throw pose silhouette.
- Priority set for MVP: `idle`, `move`, `aim`, `shoot`, `net_throw`, `roll`, `hurt`, `death`.

## 6) Enemy Sprite Requirements

### 6.1 Enemy tiers
- **Tier A (grunt melee):** 16x16, quick readability, simple weapon silhouette.
- **Tier B (ranged):** 16x16, clear firing pose and projectile color pairing.
- **Tier C (elite/brute):** 24x24, slower but high-threat windup frames.
- **Tier D (caster):** 16x16 or 24x24, exaggerated cast telegraph pixels.

### 6.2 Minimum enemy package per family
- `idle`, `move`, `attack_windup`, `attack_active`, `attack_recover`, `hurt`, `death`.
- 1 projectile set when applicable (`projectile_fly`, `projectile_hit`).
- 1 telegraph-only frame variant for dangerous attacks (glow/flash).

### 6.3 Multiplayer/network readability constraints
- Windup frames must exaggerate limb/weapon angle changes to survive interpolation.
- Active hit frame must include bright accent pixel cluster distinct from idle/move palette.
- Avoid one-frame-only critical telegraph information.

## 7) Atlas Grouping Strategy
- Keep atlas page dimensions aligned to existing pipeline (`max_width: 2048`, `padding: 2`).
- Group by actor class/family first, then animation state.

### 7.1 Suggested groups
1. `players_knight`
2. `players_cleric`
3. `players_mage`
4. `players_ranger`
5. `enemies_grunt`
6. `enemies_ranged`
7. `enemies_elite`
8. `enemies_caster`
9. `projectiles`
10. `fx_combat`

### 7.2 Packing notes
- Keep per-entity animation sequences contiguous to simplify runtime lookup.
- Keep VFX in separate group to allow optional streaming/lazy-load later.
- Do not mix UI icons in gameplay atlas.

## 8) Export Naming Spec (Aligned with tools/sprites)

Existing template in `tools/sprites/aseprite_export_template.json`:
- `"{entity}/{animation}/{entity}_{animation}_{frame}.png"`

Required conventions:
- `entity`: lower_snake_case (`knight`, `cleric`, `mage`, `ranger`, `enemy_grunt_a`, `enemy_caster_b`)
- `animation`: lower_snake_case (`idle`, `move`, `attack_windup`, etc.)
- `frame`: zero-padded 2+ digits (`00`, `01`, `02`)

Example paths:
- `knight/move/knight_move_00.png`
- `mage/cast_release/mage_cast_release_02.png`
- `enemy_ranged_a/attack_active/enemy_ranged_a_attack_active_01.png`

## 9) Production Acceptance Criteria
- Every class and enemy family has full baseline animation package.
- All telegraph/active/recovery states are distinguishable at gameplay scale.
- Export output matches naming template exactly and packs without collisions.
- Atlas metadata keys remain relative paths under `assets/sprites/export`.
