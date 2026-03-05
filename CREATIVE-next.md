# CREATIVE Next Handoff

## Goal
Ship the first implementation-ready creative vertical slice by converting finalized gameplay, enemy, art, and map kits into data/assets that plug into the existing authoritative multiplayer pipeline.

## Source of truth
- `shared/design/gameplay-creative-design-kit.md`
- `shared/encounters/enemy-encounter-creative-kit.md`
- `assets/sprites/concepts/PIXEL-ART-CREATIVE-DIRECTION.md`
- `assets/maps/design/creative-map-kit.md`
- `assets/maps/design/room-index.json`
- `SPRITE-PLACEHOLDER-HANDOFF.md`
- `SPRITE-MODEL-EVAL.md`

## Fleet update (2026-03-05)
- Placeholder sprite pass is complete at `assets/sprites/placeholders/**` with manifest and generation script handoff.
- Model capability decision is locked: use AI for sprite spec/shot planning and QA validation, not final frame production.
- Next creative art execution must include a human pixel-art cleanup pass before export/atlas integration.

## Implementation order (strict)
1. **Gameplay data tables first**
   - Implement ability/timing/loadout rows from gameplay kit section 2-6.
   - Lock enums/IDs (`ability_id`, status effects, combo IDs) before downstream work.
2. **Enemy archetype MVP + tier scaler**
   - Implement server-authoritative archetypes: Bruiser, Skirmisher, Marksman.
   - Add tell taxonomy and T1-T5 multipliers from encounter kit.
3. **Map room blockout + scripting metadata**
   - Build rooms in room-index order: `room-r0-entry` -> `room-r6-sanctuary`.
   - Enforce schema/layers: `Ground`, `Collision`, `Spawns`; include `collidable:true`, `type`, `spawn_type`.
4. **Art MVP production + atlas integration**
   - Produce class + enemy baseline animation sets with approved palette/tell readability.
   - Export with naming template, validate spec, then atlas-pack.
5. **Encounter scripting pass**
   - Wire trigger/timed/threshold spawns to room scripts and enemy templates (Crossfire Hall first).
6. **Balance + telemetry pass**
   - Tune room clear times and downed rates using logged metrics; adjust tells before damage nerfs.

## Dependency gates
- Gameplay IDs/timing constants must be stable **before** enemy scripting and combo logic.
- Enemy tell windows must be implemented **before** art telegraph lock.
- Room IDs/spawn IDs must be stable **before** encounter script wiring.
- Sprite export naming must pass validation **before** atlas pack + runtime animation mapping.

## Practical checkpoints
1. **Checkpoint A: Combat core online**
   - Early-tier gameplay slice working (Knight/Mage/Cleric/Ranger base skills + timing validator).
   - Enemy MVP trio can run in one room template.
2. **Checkpoint B: Room progression online**
   - R0-R3 traversable with co-op gather transitions and authoritative spawns.
3. **Checkpoint C: Visual readability online**
   - Class + enemy baseline animations exported and atlas-packed without key/path issues.
4. **Checkpoint D: Encounter template complete**
   - Crossfire Hall (T2) and one T3 template run end-to-end with scripted waves.
5. **Checkpoint E: Tuning signoff**
   - 3-player clear-time target met (35-55s standard rooms), metrics logging active, RTT fairness spot-check complete.

## Validation/tests to run at each checkpoint
- Unit/sim:
  - tell integrity (no pre-windup damage)
  - cadence scaling correctness (T1-T5)
  - target selection behavior
- Content validation:
  - map schema/layer/spawn property checks
  - sprite naming/spec validator + atlas pack success
- Multiplayer smoke:
  - room transitions (all players gather)
  - encounter determinism at 20/80/140ms RTT buckets
  - join/reconnect during active wave
