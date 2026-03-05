# Pixel Art Generation Prompts -- Unified Style Guide

This document contains every PixelLab prompt needed to produce a visually consistent set of sprites for the multiplayer NES-style top-down action RPG. Every prompt shares the same style preamble, palette language, proportion rules, and PixelLab settings so that all generated assets look like they belong in one game.

Style target: halfway between ArMM1998's Zelda-like character pack (chunky, readable, warm outlines) and DragonDePlatino's DawnLike pack (denser detail, richer palette variety). Not as sparse as ArMM1998, not as icon-dense as DawnLike.

---

## Section 1: Universal Style Preamble

The following text block MUST be prepended (or substantially included) in every PixelLab `description` field. It anchors the AI to a single coherent look.

```
STYLE PREAMBLE (copy into every prompt):

NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.
```

### Why each rule exists

| Rule | Reason |
|---|---|
| 3-4 colors + accent | Enforces NES-era economy; prevents muddy over-shaded sprites |
| 1px black external outline | Guarantees silhouette reads against any background tile |
| Internal lines only for separation | Avoids noisy interiors that flicker during animation |
| Upper-left light source | Consistent highlight placement across all actors |
| Chibi proportions (40% head) | Matches ArMM1998/DawnLike head-to-body ratio; big heads carry expression |
| No anti-aliasing/dithering | Keeps edges sharp at native resolution; prevents generation drift |
| Readable at 1x 16x16 | Forces the AI to prioritize silhouette over interior detail |

---

## Section 2: PixelLab Shared Settings

### 2.1 Player and Standard Enemy Characters (16x16)

```json
{
  "size": 32,
  "n_directions": 4,
  "view": "low top-down",
  "outline": "single color black outline",
  "shading": "basic shading",
  "detail": "medium detail",
  "proportions": "{\"type\": \"preset\", \"name\": \"chibi\"}",
  "ai_freedom": 600,
  "body_type": "humanoid"
}
```

| Setting | Value | Rationale |
|---|---|---|
| `size` | 32 | Canvas of 32px yields a character ~19px tall, which fits cleanly in a 16x16 gameplay frame after trimming transparent margin. Smaller canvas (16) is too tight for the AI to resolve detail; larger (48) yields sprites that are too detailed to match NES feel. |
| `n_directions` | 4 | Game uses 4-directional movement (south, west, east, north). 8 directions would double generation cost with no gameplay benefit. |
| `view` | `"low top-down"` | Shows the character from a roughly 30-degree overhead angle -- standard for Zelda/DawnLike-style top-down RPGs. The player sees the character's face and front, not just the top of their head. |
| `outline` | `"single color black outline"` | Hard 1px black outline is the single most important consistency anchor. It guarantees every sprite has the same edge treatment regardless of body color. |
| `shading` | `"basic shading"` | One highlight step + one shadow step per color. Prevents the AI from adding complex lighting that breaks the flat NES look. |
| `detail` | `"medium detail"` | Low detail produces placeholders; high detail produces anti-aliased modern pixel art. Medium is the sweet spot for our target style. |
| `proportions` | chibi preset | Large head, short limbs. Critical for readability at 16x16 and matches both reference packs. |
| `ai_freedom` | 600 | Moderately constrained. Low enough to respect the prompt closely, high enough to avoid identical-looking characters. Range 500-700 is the consistency sweet spot. |

### 2.2 Elite/Brute Enemy (24x24)

```json
{
  "size": 48,
  "n_directions": 4,
  "view": "low top-down",
  "outline": "single color black outline",
  "shading": "basic shading",
  "detail": "medium detail",
  "proportions": "{\"type\": \"preset\", \"name\": \"chibi\"}",
  "ai_freedom": 600,
  "body_type": "humanoid"
}
```

Only `size` changes to 48 (yielding ~29px tall character for a 24x24 frame). All other settings remain identical.

### 2.3 Tileset Settings

```json
{
  "tile_size": { "width": 16, "height": 16 },
  "view": "high top-down",
  "detail": "medium detail",
  "shading": "basic shading",
  "outline": "selective outline",
  "text_guidance_scale": 8,
  "tile_strength": 1,
  "tileset_adherence": 100,
  "tileset_adherence_freedom": 500
}
```

| Setting | Rationale |
|---|---|
| `view: "high top-down"` | Tiles are floor/wall surfaces seen from directly above, not at the character's low angle. |
| `outline: "selective outline"` | Tiles should not have hard outlines on every edge -- only on structural boundaries (wall edges, cracks). Full black outlines would create a grid artifact. |
| `text_guidance_scale: 8` | Default. Strong enough to follow the description, flexible enough for natural variation between tiles. |

---

## Section 3: Player Character Prompts

### 3.0 Master Palette Reference (Player Characters)

All player characters share these color families (approximate hex values for reference; the AI interprets color names, not hex codes):

| Ramp | Light | Mid | Dark | Usage |
|---|---|---|---|---|
| Skin/Warm | #F2C185 | #D4935A | #8A5A3C | Skin, leather, wood |
| Neutral | #C8C0B0 | #7A7570 | #3A3636 | Metal, stone, outlines |
| Shadow | #1A1A2E | -- | -- | Deepest shadow, outline |

Class accent colors (one saturated + one muted per class):

| Class | Primary Accent | Secondary Accent |
|---|---|---|
| Knight | Steel-blue #6A8CAF | Gold #D4AA40 |
| Mage | Violet #8B5EC0 | Cyan #5ECFC0 |
| Cleric | Ivory #F0EAD6 | Teal #5AAFA0 |
| Ranger | Forest-green #5A8A4A | Tan #C4A870 |

---

### 3.1 Knight

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Medieval knight warrior in steel-blue plate armor with gold trim details.
Broad shouldered, visibly wider than other classes. Carrying a short sword
in the right hand and a small round shield on the left arm. Helmet with a
visor slit. The shield and broad shoulders define the silhouette -- this
character must read as "tank" at a glance. Steel-blue is the dominant body
color, gold accents on pauldrons and shield rim.
```

**PixelLab `name`:** `"Knight"`

**Silhouette differentiation:** Widest of all four classes. The shield on the left arm and broad pauldrons create a distinctive rectangular/square silhouette. No other class should have a shield-width profile.

**Class accent usage:** Steel-blue (#6A8CAF) covers the torso armor and helmet. Gold (#D4AA40) appears on the shield rim, pauldron edges, and sword hilt -- kept to 2-4 pixels per frame to avoid overwhelming the blue.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Standing in guard stance, shield raised slightly in front, sword at side, gentle breathing motion"` |
| move | `walking-4-frames` | `move` | `"Walking forward with shield held at side and sword ready, armored heavy footsteps"` |
| primary_windup | `lead-jab` | `primary_windup` | `"Raising sword overhead preparing to strike downward, shield pulled back"` |
| primary_attack | `cross-punch` | `primary_attack` | `"Slashing sword downward in a powerful arc, body lunging forward"` |
| primary_recover | `getting-up` | `primary_recover` | `"Returning to guard stance after sword swing, pulling sword back to side"` |
| parry_start | `crouching` | `parry_start` | `"Raising shield forward defensively, bracing legs, crouching slightly behind shield"` |
| parry_window | `fight-stance-idle-8-frames` | `parry_window` | `"Shield fully raised and braced, body tensed waiting for impact, shield glinting"` |
| parry_success | `surprise-uppercut` | `parry_success` | `"Bashing forward with shield, counter-attacking with a quick upward shield slam"` |
| hurt | `taking-punch` | `hurt` | `"Recoiling from a hit, head thrown back, shield arm dropping"` |
| death | `falling-back-death` | `death` | `"Collapsing forward onto the ground, sword and shield falling beside body"` |

---

### 3.2 Mage

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Arcane mage in flowing violet robes with cyan energy glow on the casting
hand. Tall pointed wizard hat that extends the silhouette upward -- this
character must read as the tallest class. Carrying a wooden staff with a
small glowing crystal tip in the left hand. Slender build, narrower than
the knight. Violet is the dominant robe color, cyan glow appears only on
the right hand and staff crystal (1-2 bright pixels for the glow effect).
Robe hem is visible, adding width at the bottom.
```

**PixelLab `name`:** `"Mage"`

**Silhouette differentiation:** Tallest silhouette due to the pointed hat. Narrow body width (opposite of Knight). The staff extends the silhouette vertically on one side. At a glance reads as "tall and thin."

**Class accent usage:** Violet (#8B5EC0) covers the robes and hat. Cyan (#5ECFC0) is reserved for the casting hand glow and staff crystal -- no more than 2-3 pixels in idle, expanding to 4-5 during cast animations.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Standing upright holding staff, faint cyan glow on right hand, gentle robe sway"` |
| move | `walking-4-frames` | `move` | `"Walking with staff in left hand, robes flowing slightly, brisk scholarly pace"` |
| cast_start | `fireball` | `cast_start` | `"Raising both hands, staff held up, gathering bright cyan energy between palms"` |
| cast_loop | `fight-stance-idle-8-frames` | `cast_loop` | `"Holding charged spell above head, hands glowing bright cyan, energy pulsing"` |
| cast_release | `throw-object` | `cast_release` | `"Thrusting both hands forward releasing a burst of cyan energy, robes billowing back"` |
| blink | `front-flip` | `blink` | `"Vanishing into scattered cyan pixels, brief empty frames, reappearing in new pose"` |
| hurt | `taking-punch` | `hurt` | `"Stumbling backward from impact, hat tilting, staff swinging loose"` |
| death | `falling-back-death` | `death` | `"Collapsing sideways, staff falling beside body, hat tumbling off, glow fading"` |

---

### 3.3 Cleric

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Holy cleric healer in ivory white robes with a teal colored tabard down the
front. Carrying a small flanged mace in the right hand and a glowing holy
tome (open book) in the left hand. No hat -- instead a subtle halo glow
effect (1-2 bright pixels above the head). Medium build between knight and
mage width. The ivory white robes and teal tabard are the dominant colors.
The tome glows with a faint teal-white light. This character must read as
"healer/support" -- softer, brighter palette than the other classes.
```

**PixelLab `name`:** `"Cleric"`

**Silhouette differentiation:** Medium width, no hat (unlike Mage), no shield (unlike Knight). The open tome in the left hand and the halo pixel(s) above the head create a unique profile. Brightest overall palette of all classes (ivory dominant).

**Class accent usage:** Ivory (#F0EAD6) is the dominant robe color -- this makes the Cleric the brightest character on screen, fitting the healer role. Teal (#5AAFA0) appears on the tabard stripe and tome glow.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Standing calmly with open tome in left hand, mace at side, gentle teal glow from book"` |
| move | `walking-4-frames` | `move` | `"Walking steadily holding tome and mace, robes swaying gently, measured pace"` |
| heal_cast_start | `fireball` | `heal_cast_start` | `"Raising tome overhead, teal-white light gathering around the book pages"` |
| heal_cast_loop | `fight-stance-idle-8-frames` | `heal_cast_loop` | `"Channeling healing energy, tome open wide overhead, bright teal-white aura pulsing"` |
| heal_cast_release | `throw-object` | `heal_cast_release` | `"Releasing a wave of teal-white healing light outward from the tome, arms spreading"` |
| ward_raise | `crouching` | `ward_raise` | `"Slamming tome down toward ground, teal barrier light erupting upward around body"` |
| hurt | `taking-punch` | `hurt` | `"Flinching backward from hit, tome clutched to chest defensively"` |
| death | `falling-back-death` | `death` | `"Falling to knees then collapsing, tome closing and light fading out"` |

---

### 3.4 Ranger

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Forest ranger archer in dark green hooded cloak with tan leather armor
underneath. Hood up, creating a pointed hood silhouette (different from
mage hat -- shorter and rounded, not tall and pointed). Carrying a short
wooden bow in the left hand. Quiver of arrows visible on the back. Agile
build, slightly crouched ready stance. A short cape tail hangs behind.
Forest-green is the dominant cloak color, tan leather visible on arms and
legs. This character must read as "fast and agile" -- compact, coiled pose.
```

**PixelLab `name`:** `"Ranger"`

**Silhouette differentiation:** The hood creates a soft pointed top (shorter and rounder than the Mage's tall hat). The bow extends the silhouette horizontally on one side. Slightly crouched stance makes the Ranger appear shorter than Mage/Cleric despite being the same pixel height. Cape tail visible from the back.

**Class accent usage:** Forest-green (#5A8A4A) dominates the cloak and hood. Tan (#C4A870) shows on the leather armor pieces and bow.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Standing in alert crouch, bow held at side, scanning surroundings, hood up"` |
| move | `walking-4-frames` | `move` | `"Walking with light quick steps, bow at side, cape flowing behind, stealthy gait"` |
| aim | `fight-stance-idle-8-frames` | `aim` | `"Drawing bowstring back with right hand, left arm extending bow forward, aiming"` |
| shoot | `throw-object` | `shoot` | `"Releasing bowstring, arrow launching forward, string snapping, slight recoil"` |
| net_throw | `throw-object` | `net_throw` | `"Throwing a weighted rope net forward with right hand in an overhead arc"` |
| roll | `running-slide` | `roll` | `"Dodge rolling sideways low to the ground, cape wrapping around body, quick recovery"` |
| hurt | `taking-punch` | `hurt` | `"Staggering backward from hit, bow arm swinging, hood knocked askew"` |
| death | `falling-back-death` | `death` | `"Falling forward, bow dropping from hand, cape settling over body"` |

---

## Section 4: Enemy Character Prompts

### 4.0 Enemy Visual Design Rules

Enemies must be visually distinct from players at a glance:

1. **Darker overall value** -- enemy sprites use darker base colors than players so they recede slightly against dungeon tiles while players pop.
2. **Muted palette** -- enemy accents are less saturated than player class accents. The exception is the "danger pixel": 1-2 bright warning-color pixels (red, orange, bright green) that appear during attack windups.
3. **Simpler silhouettes** -- enemies have fewer props and simpler outlines than player classes. This is both a readability choice (easier to process at speed) and a production choice (enemies are more numerous).
4. **Threat telegraph** -- every enemy must have a visible bright pixel cluster that appears during `attack_windup` and persists through `attack_active`. This is the key network-readability requirement. The glow must be distinct from the enemy's idle palette.

Enemy accent allocations:

| Enemy Type | Body Color | Warning/Telegraph Color |
|---|---|---|
| Grunt Melee | Muted earth-brown/green | Red pixel on weapon/eyes |
| Ranged | Dark purple-black | Bright orange projectile glow |
| Elite/Brute | Dark iron-gray | Hot white-yellow on weapon |
| Caster | Dark teal-black robes | Saturated green-purple on hands |

---

### 4.1 Grunt Melee Enemy (16x16)

**PixelLab settings:** Use Section 2.1 shared settings, but with `ai_freedom: 700` (slightly more creative freedom to allow natural enemy variety).

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Small goblin warrior enemy with muted brown-green skin. Hunched aggressive
posture, shorter than player characters. Wearing dark leather scraps as
crude armor. Carrying a rusty short sword in right hand. Two small red
glowing dots for eyes (warning indicator). Simple silhouette -- no helmet,
no shield, just a hunched body with a weapon. Muted earth tones overall,
darker than player characters. This is a common weak enemy -- should look
expendable and numerous.
```

**PixelLab `name`:** `"Grunt Melee"`

**Threat readability:** In idle/move, the red eye pixels are dim (dark red, nearly blending with the body). During `attack_windup`, the eyes brighten to full red and the sword gets a 1-pixel bright highlight -- this is the telegraph. During `attack_active`, the sword swings with a bright arc pixel.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Hunched standing with rusty sword, shifting weight side to side, dim red eyes"` |
| move | `walking-4-frames` | `move` | `"Shuffling forward in hunched posture, sword dragging slightly, aggressive gait"` |
| attack_windup | `lead-jab` | `attack_windup` | `"Raising rusty sword overhead, eyes glowing bright red, body coiling to strike"` |
| attack_active | `cross-punch` | `attack_active` | `"Slashing sword downward aggressively, lunging forward, wild swing"` |
| attack_recover | `getting-up` | `attack_recover` | `"Stumbling forward after swing, recovering balance, pulling sword back"` |
| hurt | `taking-punch` | `hurt` | `"Recoiling from hit, head snapping back, sword arm flailing"` |
| death | `falling-back-death` | `death` | `"Crumpling to the ground, sword clattering away, body going limp"` |

---

### 4.2 Ranged Enemy (16x16)

**PixelLab settings:** Section 2.1 shared settings with `ai_freedom: 700`.

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Dark imp creature enemy with a deep purple-black body and two small horns
on top of the head. Hovering slightly above the ground (small shadow dot
beneath). Hands glow bright orange when preparing to attack. No weapon --
attacks with energy projectiles formed between hands. Compact rounded
silhouette, slightly smaller than player characters. Very dark body makes
the orange hand glow highly visible as a warning signal. This is a ranged
attacker that keeps distance from players.
```

**PixelLab `name`:** `"Ranged Enemy"`

**Threat readability:** In idle, the hands are dark (no glow). During `attack_windup`, both hands light up bright orange as a projectile orb forms between them -- this is a 2-frame warning. During `attack_active`, the hands thrust forward releasing the projectile. The orange glow is the primary tell; it must be clearly brighter than anything in the idle sprite.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Hovering in place with arms at sides, small bobbing motion, horns visible, dark body"` |
| move | `walking-4-frames` | `move` | `"Floating forward with arms trailing, smooth gliding motion, shadow moving beneath"` |
| attack_windup | `fireball` | `attack_windup` | `"Raising both hands, bright orange energy gathering between palms, body pulling back"` |
| attack_active | `throw-object` | `attack_active` | `"Thrusting hands forward, releasing bright orange energy ball, recoil from release"` |
| attack_recover | `getting-up` | `attack_recover` | `"Lowering hands, orange glow fading, returning to floating idle posture"` |
| hurt | `taking-punch` | `hurt` | `"Knocked backward in air, body spinning slightly, horns tilting"` |
| death | `falling-back-death` | `death` | `"Falling from hover to ground, body dissolving into dark pixels, fading away"` |

---

### 4.3 Elite/Brute Enemy (24x24)

**PixelLab settings:** Section 2.2 (size 48) with `ai_freedom: 650`.

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution.

Large armored orc brute enemy, significantly bigger than normal characters.
Dark iron-gray heavy plate armor with high-contrast lighter chest plate.
Two short horns or horn-like pauldron spikes on the shoulders for a unique
silhouette. Carrying a massive wooden club in the right hand. Thick legs,
wide stance, imposing and slow-looking. The club is oversized -- nearly as
tall as the character. Dominant color is dark iron-gray, with a lighter
steel highlight on the chest and bright white-yellow glow on the club head
during attack. This is a mini-boss level threat -- must look dangerous and
heavy.
```

**PixelLab `name`:** `"Elite Brute"`

**Threat readability:** The Elite is 1.5x the size of normal sprites, which is itself the primary threat signal. During `attack_windup`, the club raises high (exaggerated upward position, taking 2 full frames) and gains bright white-yellow highlight pixels on the club head. During `attack_active`, the club swings down with a large arc. The slow, exaggerated windup is critical for network readability -- players need time to react even with latency.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Standing wide with massive club resting on ground, heavy breathing, slow weight shift"` |
| move | `walking-4-frames` | `move` | `"Lumbering forward with heavy footsteps, club dragging, slow deliberate pace"` |
| attack_windup | `lead-jab` | `attack_windup` | `"Slowly raising massive club high overhead with both hands, club head glowing bright, body winding up"` |
| attack_active | `cross-punch` | `attack_active` | `"Slamming club down in powerful overhead strike, ground impact, body lurching forward"` |
| attack_recover | `getting-up` | `attack_recover` | `"Slowly pulling club up from ground, staggering from own impact, momentarily vulnerable"` |
| hurt | `taking-punch` | `hurt` | `"Barely flinching, head turning from hit, one step back, showing toughness"` |
| death | `falling-back-death` | `death` | `"Stumbling, dropping club, falling heavily to knees then face down, ground shake implied"` |

---

### 4.4 Caster Enemy (16x16)

**PixelLab settings:** Section 2.1 shared settings with `ai_freedom: 700`.

**Full description prompt:**

```
NES-era retro pixel art, top-down action RPG character. Limited color palette
inspired by DawnBringer-16: use only 3-4 colors per sprite plus one accent
color. 1-pixel black outline on the external silhouette only; internal lines
only where needed to separate limbs from torso or weapon from body. Basic
shading with a single light source from the upper-left (highlight top-left
pixels, shadow bottom-right). Chibi proportions with an oversized head
(roughly 40% of sprite height) and compact body. No anti-aliasing, no
dithering, no sub-pixel rendering, no modern pixel-art techniques. Clean,
flat color fills with strong value contrast between adjacent areas. Readable
at 1x native resolution (16x16 pixels). Avoid: gradients, noise textures,
high detail rendering, realistic proportions, thin limbs, small heads.

Skeletal mage enemy in tattered dark teal-black robes. Skull face with
two bright green glowing eye sockets. Bony hands visible extending from
robe sleeves -- hands glow bright green-purple when casting. Floating
slightly above ground similar to the imp but with a more vertical
silhouette (robes hang down). No staff or weapon -- casts with bare
skeletal hands. The dark robes make the bright eye and hand glow stand
out dramatically. Exaggerated wide arm pose when casting. This is a
dangerous magical enemy -- the bright glow colors signal high threat.
```

**PixelLab `name`:** `"Caster Enemy"`

**Threat readability:** The glowing eye sockets are always faintly visible (dim green, 1 pixel each). During `attack_windup`, the eyes brighten to full green and both hands ignite with bright green-purple energy -- arms spread wide in an exaggerated casting pose. This 2-frame pose must be unmistakable. During `attack_active`, the hands thrust forward releasing the spell. The wide-arm casting silhouette is the key telegraph shape.

**Animations:**

| Game Animation | `template_animation_id` | `animation_name` | `action_description` |
|---|---|---|---|
| idle | `breathing-idle` | `idle` | `"Floating with arms at sides, robes hanging, faint green eye glow, subtle bob"` |
| move | `walking-4-frames` | `move` | `"Gliding forward smoothly, robes trailing, arms slightly raised, ghostly movement"` |
| attack_windup | `fireball` | `attack_windup` | `"Spreading arms wide, both hands glowing bright green-purple, eyes flaring, energy gathering"` |
| attack_active | `throw-object` | `attack_active` | `"Thrusting both hands forward, releasing green-purple energy blast, robes blown back"` |
| attack_recover | `getting-up` | `attack_recover` | `"Lowering arms, glow fading from hands, returning to floating idle, brief exhaustion"` |
| hurt | `taking-punch` | `hurt` | `"Jerking backward, skull rattling, robes flaring, eye glow flickering"` |
| death | `falling-back-death` | `death` | `"Crumbling downward, robes collapsing into pile, skull falling, eye glow extinguishing"` |

---

## Section 5: Tileset Prompts

All tilesets use the shared tileset settings from Section 2.3 unless noted.

### 5.1 Dungeon Floor + Wall Tileset (P0 -- generate first)

This is the foundational tileset. All other tilesets must visually connect to it.

**PixelLab `create_topdown_tileset` parameters:**

```json
{
  "lower_description": "Dark gray stone dungeon floor with subtle crack patterns and worn surface, NES retro pixel art style, muted cool gray tones",
  "upper_description": "Raised stone brick dungeon wall, darker and taller than floor, heavy masonry blocks with shadowed top edge, NES retro pixel art",
  "transition_description": "Wall base meeting floor with a cast shadow gradient, stone blocks ending at floor level with dark shadow line",
  "transition_size": 0.5,
  "tile_size": { "width": 16, "height": 16 },
  "view": "high top-down",
  "detail": "medium detail",
  "shading": "basic shading",
  "outline": "selective outline",
  "text_guidance_scale": 8,
  "tile_strength": 1,
  "tileset_adherence": 100,
  "tileset_adherence_freedom": 500
}
```

**Visual connection notes:** The floor color (dark gray) should be lighter than wall color (darker gray-brown) to provide contrast for both player sprites (bright) and enemy sprites (medium dark) standing on the floor. The wall shadow provides a clear boundary that reads as "impassable."

### 5.2 Floor Variation Tileset (P1)

This tileset creates visual variety within walkable floor areas. It must use the base floor from Tileset 1 as its lower terrain via `lower_base_tile_id`.

**PixelLab `create_topdown_tileset` parameters:**

```json
{
  "lower_description": "Dark gray stone dungeon floor, matching the base dungeon floor tile, NES retro pixel art style",
  "upper_description": "Lighter cobblestone path floor with faint green moss growing in cracks between stones, NES retro pixel art",
  "transition_description": "Uneven stone edge where lighter cobblestone path meets darker standard dungeon floor",
  "transition_size": 0.25,
  "tile_size": { "width": 16, "height": 16 },
  "view": "high top-down",
  "detail": "medium detail",
  "shading": "basic shading",
  "outline": "selective outline",
  "text_guidance_scale": 8,
  "tile_strength": 1,
  "tileset_adherence": 100,
  "tileset_adherence_freedom": 500
}
```

**Important:** After generating Tileset 1, retrieve its floor (lower) base tile ID using `get_topdown_tileset` and pass it as `lower_base_tile_id` here. This ensures the two floor types share the same base color and tile seamlessly.

**Visual connection notes:** The cobblestone variation is slightly lighter and warmer than the base floor. The moss adds a subtle nature-ramp green that hints at the dungeon's age. The transition is small (0.25) since both are floor-level -- no height difference, just a texture change.

### 5.3 Water/Pit Hazard Tileset (P2)

**PixelLab `create_topdown_tileset` parameters:**

```json
{
  "lower_description": "Dark murky water pool, very dark blue-black with subtle ripple highlights, NES retro pixel art dungeon water",
  "upper_description": "Stone dungeon floor edge, matching the base dungeon floor gray, NES retro pixel art",
  "transition_description": "Crumbling broken stone edge over dark water, rocks falling into water, shadow under stone lip",
  "transition_size": 0.5,
  "tile_size": { "width": 16, "height": 16 },
  "view": "high top-down",
  "detail": "medium detail",
  "shading": "basic shading",
  "outline": "selective outline",
  "text_guidance_scale": 8,
  "tile_strength": 1,
  "tileset_adherence": 100,
  "tileset_adherence_freedom": 500
}
```

**Important:** After generating Tileset 1, use its floor (lower) base tile ID as `upper_base_tile_id` here so the floor edge of the water hazard matches the standard dungeon floor.

**Visual connection notes:** Water is the darkest surface in the game -- darker than walls, darker than floor. This ensures it reads as "hole/danger." The crumbling edge transition creates a clear unsafe boundary. The water ripple highlights (1-2 bright blue pixels) provide subtle animation potential if we later animate tiles.

---

## Section 6: VFX and Projectile Descriptions

These are small sprites that do not use `create_character`. They can be generated with `create_map_object` or hand-drawn. The style preamble still applies conceptually -- same outline weight, same palette family, same shading approach.

### 6.1 Arrow Projectile (8x8)

```
Description: Simple wooden arrow with steel arrowhead tip, seen from above at
a diagonal angle. Brown shaft, small gray metal tip, tiny feather fletching
at tail. 1-pixel black outline. 2 frames: frame 1 arrow angled slightly left,
frame 2 angled slightly right (subtle rotation for flight animation).
NES retro pixel art style, minimal colors (brown, gray, black).
```

### 6.2 Fireball Projectile (12x12)

```
Description: Small orange-yellow energy ball with 1-2 trailing spark pixels
behind it. Bright saturated orange core (2x2 pixels), yellow highlight pixel,
darker orange edge. 3 frames: core shifts position slightly each frame to
create pulsing flight effect. No outline -- energy effects are lineless.
NES retro pixel art style.
```

### 6.3 Holy Bolt Projectile (10x10)

```
Description: Small white-teal glowing orb with a soft halo ring around it.
Bright white center (1-2 pixels), teal glow ring (4-6 surrounding pixels),
fading to transparent. 2 frames: halo expands and contracts slightly.
No outline -- glowing holy energy effect. NES retro pixel art style.
Matches the Cleric's teal accent color.
```

### 6.4 Net Projectile (14x14)

```
Description: Brown rope net seen from above, spreading open in mid-flight.
Frame 1: net bunched together as a tight ball. Frame 2: net spreading open
into a diamond/square shape with visible grid pattern. Brown and tan rope
colors, 1-pixel outline. NES retro pixel art style.
```

### 6.5 Hit Spark (12x12)

```
Description: White-yellow impact burst effect. Frame 1: small bright white
cross shape (5 pixels). Frame 2: larger yellow-white starburst expanding
outward (8-10 pixels). Frame 3: fading orange-yellow scattered pixels
dissipating. No outline -- pure energy effect. NES retro pixel art style.
Universal hit feedback used for all weapon impacts.
```

### 6.6 Heal Aura (16x16)

```
Description: Teal-white healing ring effect expanding upward from ground.
Frame 1: small teal circle at ground level (6-8 pixels). Frame 2: larger
teal-white ring expanding (10-12 pixels), brighter. Frame 3: ring at full
size fading to transparent, white highlight pixels at top. No outline --
magical aura effect. NES retro pixel art. Matches the Cleric's teal accent.
```

### 6.7 Enemy Projectile / Dark Energy Ball (10x10)

```
Description: Dark purple-orange energy projectile for the ranged imp enemy.
Bright orange core pixel, dark purple surrounding glow, trailing dark
pixel. 2 frames: pulsing size shift. No outline. Must be clearly visible
against both dark floors and lighter walls. NES retro pixel art style.
```

### 6.8 Caster Enemy Spell (12x12)

```
Description: Green-purple magical energy bolt for the skeletal caster enemy.
Bright green core (2x2 pixels), purple swirling edge pixels, trailing
green spark. 3 frames with rotation/pulse. No outline. NES retro pixel art.
Must match the Caster Enemy's hand glow color exactly.
```

---

## Section 7: Consistency Checklist

Run this checklist against EVERY generated sprite before accepting it into the asset pipeline. If any item fails, regenerate with adjusted prompt or manual touch-up.

### Visual Style Checks

- [ ] **Outline weight is 1px black** -- no thicker outlines, no colored outlines, no anti-aliased soft edges on the silhouette
- [ ] **Outline is external only** -- internal details use color fills, not outlines (exception: limb/weapon separation lines)
- [ ] **Color count per frame is 3-4 + 1 accent max** -- count unique non-black non-transparent colors; if more than 5, the sprite is over-detailed
- [ ] **No anti-aliasing** -- zoom to 1x and check that no intermediate-shade pixels exist along edges
- [ ] **No dithering or checkerboard patterns** -- solid color fills only
- [ ] **Light source is upper-left** -- highlights appear on top-left surfaces, shadows on bottom-right
- [ ] **Shading is single-step** -- each base color has at most one lighter and one darker variant, not gradual gradients

### Proportion Checks

- [ ] **Head is ~40% of sprite height** -- measure head pixels vs total height; should be roughly 6-7px head on a 16-17px character
- [ ] **Body proportions match chibi preset** -- short limbs, compact torso, oversized head
- [ ] **Character height is consistent** -- all 16x16 characters should be 17-19px tall on the 32px canvas; the Elite should be 26-29px on the 48px canvas
- [ ] **Character fits within gameplay frame** -- 16x16 characters must not extend beyond 16x16 when centered; 24x24 for Elite

### Readability Checks

- [ ] **Silhouette reads at 1x zoom** -- view the sprite at native resolution on a dark gray background; can you identify the character class/enemy type?
- [ ] **Silhouette is unique** -- compare against all other characters; no two should have the same outline shape
- [ ] **Player sprites are brighter than enemy sprites** -- side-by-side comparison; players should visually "pop" more
- [ ] **Class accent color is visible** -- each player class's signature color (steel-blue, violet, ivory, green) must be the dominant non-skin color
- [ ] **Enemy type is distinguishable** -- each enemy reads as its archetype (melee=hunched+weapon, ranged=compact+glow, elite=large, caster=robed+floating)

### Animation Checks

- [ ] **Attack telegraph is visible for 2+ frames** -- the windup must show a clear bright pixel or exaggerated pose change for at least 2 frames before the hit
- [ ] **Telegraph uses bright accent pixels** -- attack windups must include pixels brighter than anything in the idle animation
- [ ] **Key poses are distinct** -- idle, move, attack, and hurt must have clearly different silhouettes; overlay them and verify they do not look identical
- [ ] **No checkerboard flicker** -- play the animation at game speed; single-pixel details should not flash on/off creating shimmer
- [ ] **Head position is stable** -- the head should stay in approximately the same position across idle and move frames (no wild bouncing)
- [ ] **Death animation ends grounded** -- final death frame should show the character on the ground, not frozen mid-fall

### Cross-Character Consistency Checks

- [ ] **All characters share the same outline treatment** -- compare any two characters side by side; outlines must be identical in weight and color
- [ ] **Skin tone is consistent** -- all human/humanoid characters sharing skin tones should use the same warm-ramp values
- [ ] **Directional views are consistent** -- south, west, east, north views of the same character use the same colors and proportions (no direction has extra detail or different shading)
- [ ] **Scale is consistent** -- place all 16x16 characters on the same canvas; heads should align, heights should match within 1px
- [ ] **Palette overlap is intentional** -- if two characters share a color, verify it is from the shared palette ramps (neutral, warm, skin) not from accidentally matching class accents

### Integration Checks

- [ ] **Character reads against dungeon floor tileset** -- place the sprite on the generated floor tile; character must be clearly visible
- [ ] **Character reads against dungeon wall tileset** -- character walking near walls must not blend in
- [ ] **Projectile reads against floor** -- projectile sprites must be visible in flight over all tile types
- [ ] **VFX reads over characters** -- hit sparks and heal aura must be visible when overlapping character sprites
- [ ] **Elite enemy reads as larger** -- place Elite next to standard 16x16 characters; the size difference must be obvious and threatening

---

## Appendix A: Generation Order

Execute sprite generation in this exact order to maximize visual consistency. Each batch establishes constraints that subsequent batches must match.

1. **Dungeon floor/wall tileset** -- establishes the world's base color temperature and value range
2. **Knight** -- the visual anchor character; broadest, most armor, sets the metal/neutral palette
3. **Mage** -- tests the palette range (violet/cyan vs Knight's blue/gold); validates silhouette differentiation
4. **Cleric** -- tests the bright end of the value range (ivory robes); must not wash out against floor
5. **Ranger** -- tests the nature palette (green/tan); validates that all four classes are mutually distinct
6. **Grunt melee enemy** -- establishes enemy value range (darker than players); validate player-vs-enemy contrast
7. **Ranged enemy** -- tests enemy glow effects against dungeon background
8. **Caster enemy** -- validates that enemy caster looks different from player Mage
9. **Elite brute enemy** -- tests 24x24 scale against the established 16x16 characters
10. **Floor variation tileset** -- connect to base floor using `lower_base_tile_id`
11. **Water/pit tileset** -- connect to base floor using `upper_base_tile_id`
12. **Projectiles and VFX** -- must read against all previously generated backgrounds and characters

After each batch, run the relevant checklist sections before proceeding.

## Appendix B: PixelLab API Call Templates

### Creating a player character

```python
# Example: Knight
character = create_character(
    description="[FULL PROMPT FROM SECTION 3.1]",
    name="Knight",
    size=32,
    n_directions=4,
    view="low top-down",
    outline="single color black outline",
    shading="basic shading",
    detail="medium detail",
    proportions='{"type": "preset", "name": "chibi"}',
    ai_freedom=600,
    body_type="humanoid"
)
# Save character_id, then animate:
animate_character(
    character_id=character.id,
    template_animation_id="breathing-idle",
    animation_name="idle",
    action_description="Standing guard stance, shield raised slightly, sword at side, gentle breathing motion"
)
```

### Creating an enemy (standard 16x16)

```python
# Same as player but ai_freedom=700
character = create_character(
    description="[FULL PROMPT FROM SECTION 4.x]",
    name="Grunt Melee",
    size=32,
    n_directions=4,
    view="low top-down",
    outline="single color black outline",
    shading="basic shading",
    detail="medium detail",
    proportions='{"type": "preset", "name": "chibi"}',
    ai_freedom=700,
    body_type="humanoid"
)
```

### Creating an enemy (24x24 Elite)

```python
# size=48 for 24x24 effective frame
character = create_character(
    description="[FULL PROMPT FROM SECTION 4.3]",
    name="Elite Brute",
    size=48,
    n_directions=4,
    view="low top-down",
    outline="single color black outline",
    shading="basic shading",
    detail="medium detail",
    proportions='{"type": "preset", "name": "chibi"}',
    ai_freedom=650,
    body_type="humanoid"
)
```

### Creating a tileset

```python
tileset = create_topdown_tileset(
    lower_description="[FROM SECTION 5.x]",
    upper_description="[FROM SECTION 5.x]",
    transition_description="[FROM SECTION 5.x]",
    transition_size=0.5,
    tile_size={"width": 16, "height": 16},
    view="high top-down",
    detail="medium detail",
    shading="basic shading",
    outline="selective outline",
    text_guidance_scale=8,
    tile_strength=1,
    tileset_adherence=100,
    tileset_adherence_freedom=500
)
```
