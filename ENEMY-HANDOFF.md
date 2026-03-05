# ENEMY HANDOFF

## What was produced
- Creative enemy/encounter design kit in `shared/encounters/enemy-encounter-creative-kit.md`.
- Includes archetypes, behavior loops, attack tell taxonomy, tiered difficulty model, numeric balancing anchors, 3-player encounter templates, and room scripting guidance.

## Implementation Priorities (in order)
1. **Core enemy state machine framework**
   - Shared states: idle, acquire, windup, active, recovery, stagger, dead.
   - Deterministic timers aligned to 30 Hz server tick.
2. **Archetype MVP set (Bruiser, Skirmisher, Marksman)**
   - Implement tells first, then damage frames, then retargeting logic.
3. **Encounter director for room scripts**
   - Timed and threshold-based wave triggers.
   - Door lock/unlock hooks per room clear condition.
4. **Difficulty tier scaler (T1-T5)**
   - Central multipliers for HP/damage/cadence and composition points.
5. **Advanced archetypes (Controller, Summoner) and Elite**
   - Add hazard zones, summon logic, and elite phase transitions.
6. **Telemetry and balance pass hooks**
   - Capture room clear time, downs, damage taken/dealt, and per-archetype defeat time.

## Implementation Notes
- Enemy AI remains fully server-authoritative; clients only interpolate snapshots.
- Hard-hitting attacks require longer tells (>=400ms) to preserve fairness under interpolation.
- Prefer composition variety over pure HP inflation for 3-player scaling.

## Test Scenarios

### A) Unit/Simulation Scenarios
1. **Tell integrity test**
   - Assert no enemy applies damage before windup timer completes.
2. **Cadence scaling test**
   - Validate T1-T5 multipliers correctly alter cooldown timing and DPS envelope.
3. **Target selection test**
   - Confirm skirmisher isolation targeting and marksman low-HP targeting rules.
4. **Elite phase transition test**
   - Verify phase changes trigger at defined HP thresholds with expected ability set.

### B) Room Encounter Scenarios (3 players)
1. **Crossfire Hall baseline (T2)**
   - Expected clear: 35-50s; no unavoidable crossfire defeats.
2. **Pinwheel Ambush pressure (T3)**
   - Validate wave overlap does not exceed readable hard-tell limit.
3. **Ritual Break objective split**
   - Confirm temporary split play is viable but regroup remains optimal.
4. **Elite Gate challenge (T4)**
   - Verify elite + adds remains survivable with good coordination.

### C) Network Fairness Scenarios
1. **Latency bucket validation (20ms/80ms/140ms RTT)**
   - Compare avoidability of hard tells across RTT buckets.
2. **Snapshot interpolation stress**
   - Ensure telegraphs remain legible at 20 Hz snapshots and 80-120ms buffer.
3. **Join/reconnect during active wave**
   - Validate spawned enemies and phase timers sync correctly from authoritative state.

## Definition of Done for this handoff phase
- Bruiser/Skirmisher/Marksman playable in one room template.
- T1-T3 scaling functional via centralized config.
- One scripted encounter template end-to-end server-authoritative.
- Metrics logging active for clear time and downed counts.
