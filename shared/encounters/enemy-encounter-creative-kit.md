# Enemy & Encounter Creative Design Kit (3P Co-op)

## 1) Combat Design Pillars
- **Readable danger first:** Every threatening action has a visible tell before damage frames.
- **Role pressure in co-op:** Encounters should simultaneously test frontliner spacing, ranged priority targeting, and support reposition/revive choices.
- **Room puzzle cadence:** Zelda-like rooms alternate between clear waves, mini-objective pressure, and exit-gate completion.
- **Server-authoritative fit:** Enemy logic uses deterministic state machines with telegraphed phase changes to stay fair under 30 Hz sim / 20 Hz snapshots.

## 2) Enemy Archetypes

### A. Bruiser (Melee Anchor)
- **Role:** Space denial, front pressure, punishes overcommit.
- **Behavior loop:** Acquire nearest threat in aggro radius -> path to melee range -> heavy swing -> short recovery -> re-evaluate target.
- **Targeting bias:** Prioritize closest player; if recently parried, retarget to second-closest for 2s.
- **Attack tell:** Raises weapon overhead + 250ms windup flash.
- **Counterplay:** Sidestep, parry in late windup, punish recovery.

### B. Skirmisher (Fast Flanker)
- **Role:** Backline disruption, split team attention.
- **Behavior loop:** Circle at mid-range -> dash in line -> quick strike -> roll-out.
- **Targeting bias:** Prefers isolated player (furthest from team centroid).
- **Attack tell:** Shoulder lean + direction line for 180ms before dash.
- **Counterplay:** Body-block lane, bait dash, intercept post-dash cooldown.

### C. Marksman (Ranged Suppressor)
- **Role:** Forces movement and cover usage.
- **Behavior loop:** Seek line-of-sight node -> aim lock -> fire burst -> relocate if threatened.
- **Targeting bias:** Lowest HP visible player; switch target after each burst.
- **Attack tell:** Bow/gun glow and tracer preview for 300ms.
- **Counterplay:** Break LOS, stagger during aim lock, coordinated focus.

### D. Controller (Area Denial Caster)
- **Role:** Zone control, movement tax.
- **Behavior loop:** Keep long range -> place hazard zones -> channel tether/slow -> retreat.
- **Targeting bias:** Highest local player density tile cluster.
- **Attack tell:** Ground sigil appears 400ms before activation.
- **Counterplay:** Early reposition, burst to interrupt channel.

### E. Summoner (Force Multiplier)
- **Role:** Escalation threat if ignored.
- **Behavior loop:** Kite around obstacles -> summon fodder packs -> periodic shield.
- **Targeting bias:** Avoid closest player; maintain max leash distance.
- **Attack tell:** Audible cue + summoning circle 500ms.
- **Counterplay:** Priority target, interrupt summon casts.

### F. Juggernaut Elite (Mini-boss Pattern Enemy)
- **Role:** Mid-room spike and mechanic check.
- **Behavior loop:** Phase 1 slam + shockwave; Phase 2 add call + charge; enrage under 35% HP.
- **Targeting bias:** Cycles targets every major ability to avoid single-player lock.
- **Attack tell:** Distinct color shift per move type; charge lane marker 350ms.
- **Counterplay:** Coordinated aggro rotation, stagger windows after misses.

## 3) Standardized Attack Tell Taxonomy
- **Soft tell (150-220ms):** Minor poke/dash; low damage; reactable with movement.
- **Medium tell (250-350ms):** Core melee/ranged burst; parry/dodge timing window.
- **Hard tell (400-600ms):** High-impact AoE/summon/charge; should invite coordinated response.

Rules:
1. Damage frames begin only after tell completes.
2. Every hard tell has at least one safe lane or interrupt option.
3. Visual tell + animation tell + optional audio tell for elite/boss actions.

## 4) Difficulty Tiers (T1-T5)

| Tier | Use Case | Enemy HP Mult | Enemy Dmg Mult | Cadence Mult | Composition Complexity |
|---|---|---:|---:|---:|---|
| T1 Intro | First combat rooms | 0.8 | 0.75 | 0.9 | 1 archetype at once |
| T2 Core | Early progression baseline | 1.0 | 1.0 | 1.0 | 2 archetypes mixed |
| T3 Advanced | Mid-run pressure | 1.25 | 1.2 | 1.1 | 3 archetypes + light hazards |
| T4 Veteran | End-of-floor challenge | 1.5 | 1.4 | 1.2 | Elite + support packs |
| T5 Spike | Optional/locked challenge | 1.8 | 1.65 | 1.25 | Layered mechanics + reinforcements |

`Cadence Mult` shortens cooldowns and idle gaps (higher = more frequent attacks).

## 5) Baseline Numeric Balancing (for 3 players)
Assume one room target clear time of **35-55s** for standard rooms.

### Player-relative balancing targets
- Team effective HP budget (all players total): `P_HP_total`
- Team sustained DPS baseline: `P_DPS_team`

### Encounter budget formulas
- **Normal room total enemy HP:** `2.2-3.0 x P_DPS_team x targetTTK(40s baseline)`
- **High-pressure room HP:** `3.0-3.8 x P_DPS_team x targetTTK(50s baseline)`
- **Burst damage cap:** No single non-elite hit > **18%** of a full-health player.
- **Elite hit cap:** Up to **28%** with hard tell >= 400ms.

### Practical starter stats (tune from this anchor)
| Archetype | HP | Contact/Attack Damage | Attack Cooldown | Notes |
|---|---:|---:|---:|---|
| Bruiser | 140 | 22 | 1.6s | Slow move, high commitment |
| Skirmisher | 80 | 14 | 1.1s | Fast move, fragile |
| Marksman | 70 | 16 per shot (2-shot burst) | 2.2s per burst | 300ms aim tell |
| Controller | 90 | 10 tick/sec in hazard | 4.5s cast | Hazard lasts 3s |
| Summoner | 110 | 8 (self), summons deal 9 | 6.0s summon | Priority target |
| Juggernaut Elite | 520 | 30 slam / 22 charge / 12 shock tick | 2.8-4.0s moves | 2-phase behavior |

## 6) Spawn Composition Guidance

### Composition rules
1. Use **1 anchor + 1 pressure type + optional utility**.
2. Avoid >2 simultaneous controllers in small rooms.
3. Reinforcement waves should add pressure type first, not extra anchors.
4. On 3-player scaling, increase variety before raw HP (better gameplay readability).

### Recommended room budgets by archetype points
- Bruiser: 3 pts
- Skirmisher: 2 pts
- Marksman: 2 pts
- Controller: 3 pts
- Summoner: 4 pts
- Juggernaut Elite: 10 pts

Target points by tier (standard room):
- T1: 6-7 pts
- T2: 8-10 pts
- T3: 11-13 pts
- T4: 14-16 pts
- T5: 17-20 pts

## 7) Encounter Templates (Zelda-like room screens, 3P co-op)

### Template A: Crossfire Hall (Rectangular room, sparse cover)
- **Goal:** Eliminate all enemies to unlock exit.
- **Spawn plan (T2):** 1 Bruiser + 2 Marksmen + 2 Skirmishers.
- **Flow:**
  1. Start with marksmen on opposite corners.
  2. Bruiser enters center lane at +4s.
  3. Skirmishers flank from side doors at +8s.
- **Coordination ask:** One player pressures marksmen while two kite bruiser/skirmisher lane.

### Template B: Pinwheel Ambush (Four-door square room)
- **Goal:** Survive and clear two timed waves.
- **Spawn plan (T3):** Wave1: 2 Bruisers + 2 Skirmishers. Wave2: 1 Controller + 3 Skirmishers + 1 Marksman.
- **Flow:** Waves start at 0s and 18s or when Wave1 nearly cleared.
- **Coordination ask:** Rotate clockwise as team to avoid cross-angle collapse.

### Template C: Ritual Break (Objective room)
- **Goal:** Interrupt 3 ritual nodes before completion while under attack.
- **Spawn plan (T3/T4):** 1 Summoner + 1 Bruiser + periodic 2-skirmisher reinforcements every 10s.
- **Loss pressure:** Each active node buffs enemies +8% cadence.
- **Coordination ask:** Split 2/1 briefly for node interrupts, regroup for summoner burn.

### Template D: Bridge Hold (Narrow chokepoint room)
- **Goal:** Defend central bridge zone for 30s, then clear leftovers.
- **Spawn plan (T2/T3):** 3 sequential mini-waves of skirmisher-heavy packs + backline marksman.
- **Design intent:** Tests knockback control, lane blocking, and burst target calls.

### Template E: Elite Gate (Pre-boss lock room)
- **Goal:** Defeat Juggernaut Elite; door unlocks on defeat.
- **Spawn plan (T4):** Juggernaut Elite + 2 Marksmen at start, 2 Bruisers at 60% elite HP.
- **Coordination ask:** Assign caller for charge lanes; reserve interrupts for summon/charge windows.

## 8) Room Scripting Cadence for Networking Fairness
- Keep high-impact mechanics on >= 400ms tells to offset interpolation delay.
- Limit simultaneous hard tells to 1 (standard rooms) or 2 (spike rooms).
- Spawn telegraphs should be visible >= 500ms before entity active frames.
- Prefer deterministic timed wave triggers with optional HP-threshold override.

## 9) Progression Ramp (First 10 Rooms)
1. Rooms 1-2: T1; Bruiser + Skirmisher only.
2. Rooms 3-4: T2; introduce Marksman crossfire.
3. Rooms 5-6: T2/T3; first Controller hazards.
4. Rooms 7-8: T3; Summoner appears with reinforcement logic.
5. Rooms 9-10: T4; Elite Gate template variant.

## 10) Tuning Checklist
- Average room clear (3 players, baseline gear): 35-55s.
- Downed-player rate: 0-1 downs in T2, 1-2 downs in T4 target.
- If rooms feel spongey: reduce HP by 10-15% before damage tuning.
- If wipes are sudden: increase tells by +80ms before reducing damage.
- If chaos unreadable: reduce active ranged units by 1 and keep total pressure via reinforcements.
