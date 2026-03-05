# Creative Map Kit: Zelda-like Room Set (v1)

## Design goals
- Build a 7-room progression that teaches co-op traversal, then pressure-tests combat and coordination.
- Keep each room one-screen sized (16x10 tiles @ 16x16) to match existing `starter-room.json` conventions.
- Align with architecture recommendation: **single active room transition gate** (all players near exit before transfer).

## Progression set overview
1. **R0 Entry Glade** (safe onboarding)
2. **R1 Split Fork** (choice + regroup)
3. **R2 Switch Gallery** (timed traversal beat)
4. **R3 Crossfire Hall** (projectile pressure)
5. **R4 Lock & Key Loop** (backtrack with unlock)
6. **R5 Mini-Boss Court** (encounter climax)
7. **R6 Reward Sanctuary** (loot/checkpoint + branch hook)

Difficulty curve: tutorial -> movement check -> coordination check -> combat check -> mixed mastery -> reward/reset.

## Room motifs, beats, and scripting concepts

### R0 Entry Glade
- **Motif:** Open ruins, low threat, clear exits.
- **Traversal beat:** Learn door/edge transition behavior.
- **Spawns:** 3 player spawn points clustered; optional 1 slow enemy as tutorial poke.
- **Script concept:** `on_room_enter` emits tutorial hint event once.

### R1 Split Fork
- **Motif:** Two short lanes separated by center collision spine.
- **Traversal beat:** Party briefly splits then converges at east exit.
- **Spawns:** 2 melee enemies (left lane), 1 ranged (right lane).
- **Script concept:** `gate_exit_east_until enemies_cleared`.

### R2 Switch Gallery
- **Motif:** Corridor with alternating blocker columns.
- **Traversal beat:** Time movement through safe pockets.
- **Spawns:** Wave A immediately, Wave B on midpoint trigger.
- **Script concept:**
  - Trigger volume `midpoint_trigger` in Spawns layer as `type:npc` with property `script_trigger=true`.
  - Server spawns Wave B when any player enters trigger.

### R3 Crossfire Hall
- **Motif:** Wide arena with diagonal cover collision rectangles.
- **Traversal beat:** Zig-zag between cover under ranged pressure.
- **Spawns:** 3 ranged enemies at corners + 2 melee flankers delayed.
- **Script concept:** Delayed flank spawn at `t+4s` after combat start.

### R4 Lock & Key Loop
- **Motif:** Central locked exit and side pocket containing key drop.
- **Traversal beat:** Detour, secure key, return to unlock.
- **Spawns:** 1 elite guard near key, ambient adds near lock.
- **Script concept:**
  - `on_enemy_death(guard_01) -> spawn_item(key_small)`
  - `on_pickup(key_small) -> open_collision_segment(exit_lock_bar)`

### R5 Mini-Boss Court
- **Motif:** Symmetric court with pillars for line-of-sight breaks.
- **Traversal beat:** Rotate as group; punish over-extension.
- **Spawns:** 1 mini-boss + periodic adds at 50% HP.
- **Script concept:** HP-threshold event spawns add wave and temporary hazard zones.

### R6 Reward Sanctuary
- **Motif:** Quiet room with treasure and branch exits.
- **Traversal beat:** Cooldown + choose next path (future expansion).
- **Spawns:** NPC or chest item only.
- **Script concept:** Persist room-clear flag/checkpoint marker.

## Multi-room content plan (schema-compatible)
Use one JSON per room in `assets/maps/` and register in `assets/maps/maps.json`.

Required per room:
- `height`: 10
- `width`: 16
- `tilewidth`: 16
- `tileheight`: 16
- `layers` include:
  - `Ground` (`tilelayer`)
  - `Collision` (`objectgroup` rectangles)
  - `Spawns` (`objectgroup` points)

Recommended room IDs/files:
- `room-r0-entry` -> `room-r0-entry.json`
- `room-r1-fork` -> `room-r1-fork.json`
- `room-r2-switch-gallery` -> `room-r2-switch-gallery.json`
- `room-r3-crossfire` -> `room-r3-crossfire.json`
- `room-r4-lock-key` -> `room-r4-lock-key.json`
- `room-r5-mini-boss` -> `room-r5-mini-boss.json`
- `room-r6-sanctuary` -> `room-r6-sanctuary.json`

Map registry shape (matches existing convention):
```json
{
  "maps": [
    { "id": "room-r0-entry", "file": "room-r0-entry.json", "default_spawn": "player_spawn_west" }
  ]
}
```

## Collision layer usage guidance
- Keep collision objects axis-aligned rectangles only (`rotation: 0`).
- Use semantic names for tooling/debug (`wall_north`, `pit_01`, `exit_lock_bar`).
- Every collision object should include property:
  - `collidable: true`
- Prefer fewer large rectangles over many tiny pieces for predictable server/client parity.
- Reserve narrow 1-tile openings for chokepoints and encounter pacing.

## Spawn layer usage guidance
Given current files, support both patterns during transition:
- Existing example style: object `type` set to `player|enemy|npc|item`
- Schema style: property `spawn_type` with same values

For compatibility, add both where possible:
- object `type`: `player|enemy|npc|item`
- properties:
  - `spawn_type` (string)
  - `id` (string, unique per room)
  - `facing` (`up|down|left|right`) for player/NPC

Naming examples:
- `player_spawn_west`, `enemy_ranged_ne`, `trigger_midpoint`, `item_key_small`

## Traversal and transition rules
- Use edge-adjacent spawn points for transitions to preserve orientation.
- Co-op gate rule (recommended architecture): transition executes when all active players are inside exit gather volume.
- On transition:
  1. server validates gather condition
  2. loads target room
  3. places players at room `default_spawn` or directional spawn (`player_spawn_west/east/...`)

## Spawn scripting concept model (authoring-level)
Keep authored map JSON static; drive behavior from lightweight script metadata tied to spawn IDs:
- `on_room_enter`
- `on_trigger_enter(trigger_id)`
- `on_enemy_death(enemy_id)`
- `on_hp_threshold(entity_id, threshold)`

Minimal metadata fields on trigger/npc marker objects:
- `script_trigger: true`
- `script_event: "wave_b_start"`
- `script_once: true`

Server interprets metadata and emits authoritative spawn/despawn events.
