# Asset Production Plan

Derived from analysis of: `entityRenderer.ts`, `mapRenderer.ts`, `room.go`, `entities.ts`, `PIXEL-ART-CREATIVE-DIRECTION.md`, `creative-map-kit.md`, `creative_direction_spec.json`, and the current placeholder sprite inventory.

---

## 1. Asset Categories Overview

| Category | Count | Sizes | Priority | Tool |
|---|---|---|---|---|
| Player characters (4 classes, 4 directions) | 4 | 16x16 per frame | P0 | PixelLab `create_character` + `animate_character` |
| Enemy families (4 types, 4 directions) | 4 | 16x16 / 24x24 | P0 | PixelLab `create_character` |
| Projectiles & VFX | ~6 sprites | 8x8 to 16x16 | P1 | PixelLab or hand-drawn |
| Tileset: dungeon floor/wall transitions | 16-23 tiles | 16x16 per tile | P0 | PixelLab `create_topdown_tileset` |
| Map objects (chest, key, door, pillar) | ~6 objects | 16x16 | P2 | PixelLab `create_map_object` |
| UI elements (health bar fill, ability icons) | ~10 | Various | P2 | Hand-drawn or code-generated |

---

## 2. Player Character Sprites

All player characters: **16x16 frame size**, **4 directional views** (down, up, left, right), NES-style pixel art, **low top-down** camera angle.

### 2.1 Knight

**PixelLab character creation:**
- Canvas size: 32 (character ~19px tall, fits 16x16 frame when cropped)
- Directions: 4
- View: low top-down
- Outline: single color black outline
- Shading: basic shading
- Detail: medium detail
- Proportions: `{"type": "preset", "name": "chibi"}`

**Description prompt:**
> Medieval knight warrior in steel-blue plate armor with gold trim. Broad shouldered, carrying a short sword in right hand and a small round shield on left arm. Helmet with visor. NES retro pixel art style, top-down RPG character.

**Required animations (frames):**

| Animation | Template ID | Custom Action | Frames |
|---|---|---|---|
| idle | `breathing-idle` | Standing guard stance, shield raised slightly | 4 |
| move | `walking-4-frames` | Walking with shield and sword at sides | 4 |
| primary_windup | `lead-jab` | Raising sword overhead to strike | 2 |
| primary_attack | `cross-punch` | Slashing sword downward | 3 |
| primary_recover | `getting-up` | Returning to guard stance after swing | 2 |
| parry_start | `crouching` | Raising shield forward defensively | 2 |
| parry_window | `fight-stance-idle-8-frames` | Shield fully raised, braced for impact | 2 |
| parry_success | `surprise-uppercut` | Shield bash counter-attack | 3 |
| hurt | `taking-punch` | Recoiling from hit, head thrown back | 2 |
| death | `falling-back-death` | Collapsing forward onto ground | 4 |

### 2.2 Mage

**Description prompt:**
> Arcane mage in flowing violet robes with cyan energy glow on hands. Tall pointed hat, carrying a wooden staff with glowing crystal tip. Slender build. NES retro pixel art style, top-down RPG character.

**Same PixelLab settings as Knight.**

**Required animations:**

| Animation | Template ID | Custom Action | Frames |
|---|---|---|---|
| idle | `breathing-idle` | Standing with staff, faint hand glow | 4 |
| move | `walking-4-frames` | Walking with staff in hand | 4 |
| cast_start | `fireball` | Raising hands, gathering energy | 2 |
| cast_loop | `fight-stance-idle-8-frames` | Holding charged spell, hands glowing bright | 3 |
| cast_release | `throw-object` | Thrusting hands forward releasing spell | 3 |
| blink | `front-flip` | Vanishing into particles, reappearing | 4 |
| hurt | `taking-punch` | Stumbling backward from hit | 2 |
| death | `falling-back-death` | Collapsing, staff falling beside | 4 |

### 2.3 Cleric

**Description prompt:**
> Holy cleric healer in ivory white robes with teal accents and golden trim. Carrying a small mace in right hand and a glowing holy tome in left hand. Hood down, halo-like glow. NES retro pixel art style, top-down RPG character.

**Required animations:**

| Animation | Template ID | Custom Action | Frames |
|---|---|---|---|
| idle | `breathing-idle` | Standing with tome open, gentle glow | 4 |
| move | `walking-4-frames` | Walking with tome and mace | 4 |
| heal_cast_start | `fireball` | Raising tome, gathering holy light | 2 |
| heal_cast_loop | `fight-stance-idle-8-frames` | Channeling healing aura, bright glow | 3 |
| heal_cast_release | `throw-object` | Releasing healing wave outward | 3 |
| ward_raise | `crouching` | Slamming tome down, barrier appears | 3 |
| hurt | `taking-punch` | Flinching from hit | 2 |
| death | `falling-back-death` | Falling, tome closing | 4 |

### 2.4 Ranger

**Description prompt:**
> Forest ranger archer in dark green hooded cloak with tan leather armor underneath. Carrying a short bow in left hand and quiver on back. Agile build, cape tail visible. NES retro pixel art style, top-down RPG character.

**Required animations:**

| Animation | Template ID | Custom Action | Frames |
|---|---|---|---|
| idle | `breathing-idle` | Standing with bow at side, alert posture | 4 |
| move | `walking-4-frames` | Walking with bow, light footsteps | 4 |
| aim | `fight-stance-idle-8-frames` | Drawing bowstring back, aiming | 2 |
| shoot | `throw-object` | Releasing arrow, string snapping forward | 3 |
| net_throw | `throw-object` | Throwing a weighted net forward | 3 |
| roll | `running-slide` | Dodge rolling to the side | 4 |
| hurt | `taking-punch` | Hit recoil, staggering | 2 |
| death | `falling-back-death` | Falling, bow dropping | 4 |

---

## 3. Enemy Sprites

### 3.1 Grunt Melee (Goblin/Skeleton) — 16x16

**Description prompt:**
> Small goblin warrior with muted brown-green skin, carrying a rusty short sword. Red glowing eyes as warning indicator. Hunched aggressive posture. Dark leather scraps as armor. NES retro pixel art style, top-down RPG enemy.

**PixelLab settings:** Same as players but `ai_freedom: 800` for variety.

**Animations:** idle (4f), move (4f via `walking-4-frames`), attack_windup (2f via `lead-jab`), attack_active (2f via `cross-punch`), attack_recover (2f via `getting-up`), hurt (2f via `taking-punch`), death (4f via `falling-back-death`)

### 3.2 Ranged Enemy (Imp/Skeleton Archer) — 16x16

**Description prompt:**
> Dark imp creature with glowing orange hands, floating slightly above ground. Small horns, dark purple-black body. Bright orange energy ball forming between hands when attacking. NES retro pixel art style, top-down RPG enemy.

**Animations:** Same baseline set as grunt. `attack_active` uses `throw-object` (projectile release).

### 3.3 Elite/Brute — 24x24

**Description prompt:**
> Large armored orc brute, nearly twice the size of normal enemies. Heavy iron pauldrons with unique horn accent. Carrying a massive club. High contrast torso armor. Slow but threatening. NES retro pixel art style, top-down RPG enemy.

**PixelLab settings:** Canvas size: 48 (for 24x24 effective), `detail: "high detail"`.

**Animations:** Same baseline but slower frame timings. `attack_windup` should be exaggerated (club raised high).

### 3.4 Caster Enemy — 16x16

**Description prompt:**
> Skeletal mage enemy in tattered dark robes. Bright green-purple glowing hands when casting. Skull face with glowing eye sockets. Floating slightly. Exaggerated cast pose with arms wide. NES retro pixel art style, top-down RPG enemy.

**Animations:** Same baseline. `attack_windup` and `attack_active` use casting poses with bright hand accents.

---

## 4. Tilesets

All tiles: **16x16**, **high top-down** view, NES dungeon aesthetic.

### 4.1 Dungeon Floor + Wall Tileset (P0)

**PixelLab `create_topdown_tileset`:**

```
Tileset 1: Floor base
  lower_description: "dark stone dungeon floor with subtle crack patterns"
  upper_description: "raised stone brick dungeon wall, darker and taller"
  transition_description: "wall base meeting floor with shadow gradient"
  transition_size: 0.5
  tile_size: { width: 16, height: 16 }
  view: "high top-down"
  detail: "medium detail"
  shading: "basic shading"
  outline: "selective outline"
```

### 4.2 Floor Variation Tileset (P1)

```
Tileset 2: Floor accent
  lower_description: "dark stone dungeon floor"
  upper_description: "lighter cobblestone path floor with moss in cracks"
  transition_description: "stone edge where cobblestone meets darker floor"
  transition_size: 0.25
  tile_size: { width: 16, height: 16 }
```

### 4.3 Water/Pit Hazard Tileset (P2)

```
Tileset 3: Hazard
  lower_description: "dark murky water pool"
  upper_description: "stone dungeon floor edge"
  transition_description: "crumbling stone edge over dark water"
  transition_size: 0.5
  tile_size: { width: 16, height: 16 }
```

---

## 5. Projectiles & VFX Sprites

These are small, simple sprites. Can be done with PixelLab map objects or hand-drawn.

| Asset | Size | Frames | Description |
|---|---|---|---|
| Arrow projectile | 8x8 | 2 (fly loop) | Simple wooden arrow with steel tip, slight rotation between frames |
| Fireball projectile | 12x12 | 3 (fly loop) | Orange-yellow energy ball with trailing sparks |
| Holy bolt projectile | 10x10 | 2 (fly loop) | White-teal glowing orb with soft halo |
| Net projectile | 14x14 | 2 (fly) | Brown rope net spreading open mid-flight |
| Hit spark | 12x12 | 3 (one-shot) | White-yellow impact burst, expanding then fading |
| Heal aura | 16x16 | 3 (one-shot) | Teal-white ring expanding upward from ground |

---

## 6. Map Objects

| Asset | Size | Description |
|---|---|---|
| Treasure chest (closed) | 16x16 | Wooden chest with gold clasp, top-down view |
| Treasure chest (open) | 16x16 | Same chest with lid open, items visible |
| Small key | 8x8 | Golden key, simple silhouette |
| Stone pillar | 16x16 | Round stone column, top-down, casts shadow |
| Wooden door (closed) | 16x16 | Dark wood plank door in stone frame |
| Wooden door (open) | 16x16 | Same door swung open |

**PixelLab `create_map_object` prompts** — each with `view: "high top-down"`, `size: 16`, `detail: "medium detail"`.

---

## 7. UI Assets (code-generated or hand-drawn)

These are better done in code (PixiJS Graphics) than as sprites, given their simplicity:

| Element | Current State | Recommendation |
|---|---|---|
| Health bar | Code-drawn green/red rectangle | Keep as code |
| Attack arc | Code-drawn yellow wedge | Keep as code |
| Screen shake | Code offset | Keep as code |
| Ability icons | Not implemented | 16x16 pixel art icons per ability (future) |
| Death overlay | Alpha fade in code | Keep as code |

---

## 8. Complete Asset Count

| Category | Items | Frames/Item (avg) | Directions | Total Frames |
|---|---|---|---|---|
| Knight | 1 character | ~28 frames | 4 | 112 |
| Mage | 1 character | ~26 frames | 4 | 104 |
| Cleric | 1 character | ~26 frames | 4 | 104 |
| Ranger | 1 character | ~28 frames | 4 | 112 |
| Grunt enemy | 1 character | ~20 frames | 4 | 80 |
| Ranged enemy | 1 character | ~20 frames | 4 | 80 |
| Elite enemy | 1 character | ~20 frames | 4 | 80 |
| Caster enemy | 1 character | ~20 frames | 4 | 80 |
| Projectiles | 4 types | ~2.5 frames | 1 | 10 |
| VFX | 2 types | ~3 frames | 1 | 6 |
| Tilesets | 3 sets | 16-23 tiles each | 1 | ~60 tiles |
| Map objects | 6 objects | 1 frame | 1 | 6 |
| **Total** | | | | **~834 frames + ~60 tiles** |

---

## 9. PixelLab Generation Order

Execute in this order to establish visual consistency:

### Phase 1: Tileset foundation (establishes the world look)
1. Dungeon floor/wall tileset
2. Floor variation tileset

### Phase 2: Player characters (most screen time, sets the art bar)
3. Knight character + all animations
4. Mage character + all animations
5. Cleric character + all animations
6. Ranger character + all animations

### Phase 3: Enemies (must read clearly against player sprites)
7. Grunt melee character + animations
8. Ranged enemy character + animations
9. Elite enemy character + animations
10. Caster enemy character + animations

### Phase 4: Supplementary
11. Projectile sprites
12. Map objects
13. Water/pit hazard tileset

---

## 10. PixelLab Settings Reference (shared across all characters)

```json
{
  "view": "low top-down",
  "outline": "single color black outline",
  "shading": "basic shading",
  "detail": "medium detail",
  "n_directions": 4,
  "proportions": "{\"type\": \"preset\", \"name\": \"chibi\"}",
  "size": 32,
  "ai_freedom": 750
}
```

Tileset shared settings:
```json
{
  "view": "high top-down",
  "detail": "medium detail",
  "shading": "basic shading",
  "outline": "selective outline",
  "tile_size": { "width": 16, "height": 16 }
}
```

---

## 11. Post-Generation Pipeline

1. Download PNGs from PixelLab
2. Place in `assets/sprites/export/{entity}/{animation}/` following naming template
3. Run `tools/sprites/pack_atlas.py` to generate spritesheet atlases
4. Load atlases in frontend via PixiJS `Assets.load()` replacing the current Graphics circles
5. Map animation names to `EntityState` enum values in a new `animationMap.ts`

Sprite-to-code mapping:

| EntityState | Knight anim | Mage anim | Enemy anim |
|---|---|---|---|
| Idle (0) | `idle` | `idle` | `idle` |
| Moving (1) | `move` | `move` | `move` |
| Attacking (2) | `primary_attack` | `cast_release` | `attack_active` |
| Parrying (3) | `parry_window` | - | - |
| Stunned (4) | `hurt` | `hurt` | `hurt` |
| Dead (5) | `death` | `death` | `death` |
| Casting (6) | - | `cast_loop` | - |
