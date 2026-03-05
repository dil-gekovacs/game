# Gameplay Creative Design Kit (Knight / Mage / Cleric / Ranger)

## 1) Core Combat Constraints (implementation constants)

| Key | Value | Notes |
|---|---:|---|
| server_tick_hz | 30 | Authoritative sim tick from architecture docs |
| tick_ms | 33.33 | 1 tick duration |
| snapshot_send_hz | 20 | Delta snapshots |
| global_cooldown_ms | 400 | Shared lockout after most skills (except dodge/parry) |
| base_parry_window_ms | 100 | Knight baseline |
| network_tolerance_ms_max | 50 | Added as half-RTT tolerance cap |
| interrupt_grace_ms | 66 | 2 ticks grace for cancel windows |
| party_size | 3 | 3-player party selected from Knight, Mage, Cleric, Ranger |

## 2) Ability Data Model (machine-usable schema)

Use IDs exactly as listed for protocol/events.

| Field | Type | Example |
|---|---|---|
| ability_id | string | `knight_shield_parry` |
| class_id | enum | `knight \| mage \| cleric \| ranger` |
| tier | enum | `early \| mid \| late` |
| unlock_level | int | `6` |
| slot | enum | `primary \| secondary \| utility \| ultimate` |
| cast_type | enum | `melee \| projectile \| aoe \| buff \| heal \| channel` |
| startup_ms | int | `132` |
| active_ms | int | `165` |
| recovery_ms | int | `231` |
| cooldown_ms | int | `8000` |
| resource_cost | int | mana/faith/stamina points |
| equip_group | string | `weapon`, `focus`, `relic`, `armor` |
| prediction_mode | enum | `local_fx_only \| predicted \| server_only` |

## 3) Class Progression + Ability Kits

### 3.1 Knight progression table

| ability_id | tier | unlock_level | slot | startup/active/recovery (ms) | cooldown_ms | cost | practical behavior |
|---|---|---:|---|---|---:|---:|---|
| knight_cleave | early | 1 | primary | 99/132/198 | 900 | 0 | 100° frontal arc, 1.0x weapon dmg |
| knight_shield_parry | early | 2 | secondary | 66/100/200 | 6000 | 15 | If hit during active: negate + stagger enemy 500ms |
| knight_guard_step | early | 4 | utility | 33/66/132 | 4500 | 20 | 2.5m directional dash with brief damage reduction |
| knight_taunt_banner | mid | 6 | utility | 132/600/198 | 12000 | 25 | AoE taunt radius 4m for 2.5s |
| knight_lion_lunge | mid | 8 | secondary | 99/165/231 | 7000 | 25 | Gap-close thrust, armor break debuff 15% for 4s |
| knight_bastion_wall | mid | 10 | utility | 165/1500/264 | 18000 | 35 | Placeable wall, blocks projectiles for 3s |
| knight_heroic_slam | late | 13 | secondary | 132/198/297 | 10000 | 35 | Ground slam, 2.5m knockup 0.8s |
| knight_vanguard_aura | late | 16 | utility | 99/6000/99 | 22000 | 40 | Team aura: +12% damage resist in 5m |
| knight_last_stand | late | 20 | ultimate | 99/5000/200 | 60000 | 100 | Cannot drop below 1 HP for 4s, emits threat pulses |

### 3.2 Mage progression table

| ability_id | tier | unlock_level | slot | startup/active/recovery (ms) | cooldown_ms | cost | practical behavior |
|---|---|---:|---|---|---:|---:|---|
| mage_arc_bolt | early | 1 | primary | 66/33/99 | 450 | 5 | Fast bolt, 0.6x spell power |
| mage_frost_snare | early | 2 | secondary | 99/66/165 | 7000 | 20 | Projectile applies 40% slow for 2.5s |
| mage_blink | early | 4 | utility | 33/1/99 | 8000 | 25 | Teleport 4m, i-frame 66ms |
| mage_chain_lightning | mid | 6 | secondary | 132/99/198 | 9000 | 30 | 3 jumps, damage falloff 100/75/50% |
| mage_ward_field | mid | 8 | utility | 132/3000/165 | 16000 | 30 | Zone reducing incoming projectile speed by 50% |
| mage_pyro_orb | mid | 10 | secondary | 165/400/231 | 11000 | 35 | Slow orb then explosion, ideal combo starter |
| mage_time_rift | late | 13 | utility | 132/2500/198 | 20000 | 40 | 3m zone: enemies -25% action speed |
| mage_meteor_spike | late | 16 | secondary | 264/165/330 | 14000 | 45 | Targeted impact after 500ms warning marker |
| mage_overcharge_storm | late | 20 | ultimate | 132/4000/264 | 60000 | 100 | Pulsing AoE; each pulse every 500ms |

### 3.3 Cleric progression table

| ability_id | tier | unlock_level | slot | startup/active/recovery (ms) | cooldown_ms | cost | practical behavior |
|---|---|---:|---|---|---:|---:|---|
| cleric_mace_smite | early | 1 | primary | 99/132/165 | 850 | 0 | Close hit, bonus vs undead |
| cleric_minor_heal | early | 2 | secondary | 132/1/165 | 5000 | 20 | Instant ally heal 18% max HP |
| cleric_sanctuary_step | early | 4 | utility | 66/250/132 | 9000 | 25 | Short dash leaving 2s healing trail |
| cleric_purify_wave | mid | 6 | secondary | 132/132/198 | 10000 | 30 | AoE cleanse + small heal |
| cleric_hallowed_chain | mid | 8 | utility | 165/99/198 | 13000 | 30 | Tethers ally 5s: split 25% damage |
| cleric_judgment_beam | mid | 10 | secondary | 198/500/264 | 12000 | 35 | Channel beam, interrupts minor enemies |
| cleric_revitalizing_field | late | 13 | utility | 165/5000/198 | 20000 | 40 | Ground field HoT +10% defense |
| cleric_resurrection_seed | late | 16 | secondary | 231/1/330 | 30000 | 60 | Pre-buff ally: auto-revive once in 15s |
| cleric_divine_intervention | late | 20 | ultimate | 132/3500/264 | 60000 | 100 | Team invulnerability pulses (3 x 300ms) |

### 3.4 Ranger progression table

| ability_id | tier | unlock_level | slot | startup/active/recovery (ms) | cooldown_ms | cost | practical behavior |
|---|---|---:|---|---|---:|---:|---|
| ranger_bow_shot | early | 1 | primary | 66/66/99 | 700 | 0 | Main attack: arrow shot in aim direction, fast projectile |
| ranger_hunter_net | early | 2 | secondary | 99/66/165 | 6500 | 20 | Offhand throw: net roots first enemy hit for 1.8s |
| ranger_rolling_evasion | early | 4 | utility | 33/132/132 | 7000 | 20 | Quick roll with brief i-frame window |
| ranger_piercing_arrow | mid | 6 | secondary | 99/66/165 | 8500 | 25 | Arrow pierces up to 3 targets in a line |
| ranger_trap_line | mid | 8 | utility | 132/2000/198 | 12000 | 25 | Deploys 2 ground snares that slow and reveal |
| ranger_hawk_mark | mid | 10 | utility | 99/3000/132 | 14000 | 30 | Marks priority target: team +15% damage vs marked enemy |
| ranger_volley_barrage | late | 13 | secondary | 132/500/198 | 11000 | 35 | Fires 5-arrow spread into cone |
| ranger_reinforced_net | late | 16 | secondary | 132/99/198 | 10000 | 40 | Heavy net: short pull + 2.2s root on non-boss targets |
| ranger_predator_focus | late | 20 | ultimate | 99/5000/132 | 60000 | 100 | Greatly boosts arrow cadence and crit chance for 4s |

## 4) Equipment Swap Concepts (early/mid/late)

### 4.1 Swap system rules

| Rule | Value |
|---|---|
| max_loadouts_per_player | 2 |
| in_combat_swap_lock_ms | 4000 after taking/dealing damage |
| safe_swap_channel_ms | 1200 (cancel on hit) |
| swap_cooldown_ms | 20000 |
| network_message | `AbilitySwap {slotIndex,itemId}` |

### 4.2 Class loadout progression

| class_id | tier | loadout_a | loadout_b | intended swap trigger |
|---|---|---|---|---|
| knight | early | sword+shield | spear+light_shield | swap to spear for ranged poke enemies |
| knight | mid | tower_shield+hammer | greatsword+buckler | swap to tower for boss projectile phases |
| knight | late | command_blade+kite | colossus_maul+fortress | swap to maul for burst window after stun |
| mage | early | ember_wand+focus_orb | frost_rod+minor_tome | swap by enemy resistance profile |
| mage | mid | storm_staff+conductive_focus | void_codex+rift_focus | swap for aoe clear vs elite control |
| mage | late | astral_staff+chrono_focus | inferno_grimoire+burst_focus | swap pre-planned by boss phase timing |
| cleric | early | mace+prayer_book | censer+light_mace | swap when party HP falls under 60% |
| cleric | mid | war_mace+sigil | staff_of_grace+relic | swap between damage-support and heal-support |
| cleric | late | archon_mace+bulwark_relic | seraph_staff+life_relic | swap for survive phase vs burn phase |
| ranger | early | shortbow+light_net | longbow+weighted_net | swap between mobility and control |
| ranger | mid | recurved_bow+snare_net | warbow+hook_net | swap between sustained dps and pick potential |
| ranger | late | stormbow+ensnare_net | greatbow+grapple_net | swap by boss phase distance and add control need |

## 5) Cooldown Budget by Phase (3-player co-op pacing)

| phase | target_avg_primary_cd_ms | target_avg_secondary_cd_ms | target_avg_utility_cd_ms | ult_cd_ms | design intent |
|---|---:|---:|---:|---:|---|
| early (lvl 1-5) | 700-950 | 5000-8000 | 8000-12000 | N/A | teach class identity and one clear panic button |
| mid (lvl 6-12) | 650-900 | 7000-12000 | 12000-18000 | N/A | begin role interlock and setup/payoff loops |
| late (lvl 13-20) | 600-850 | 9000-14000 | 18000-22000 | 60000 | coordinated burst windows every ~60s |

## 6) Combat Timing Windows (authoritative validation)

### 6.1 Shared timing windows

| mechanic | base_ms | tick_equivalent | server validation rule |
|---|---:|---:|---|
| perfect_parry | 100 | 3 ticks | valid if hit event in `[parry_start, parry_end + min(halfRTT,50)]` |
| dodge_iframe | 66 | 2 ticks | invuln tags checked before hit resolve |
| combo_link_window | 330 | 10 ticks | next input buffered during final recovery third |
| interrupt_window | 132 | 4 ticks | heavy/control tags can cancel cast/channel |
| downed_revive_channel | 2000 | 60 ticks | break on damage or movement |

### 6.2 Ability prediction guidance

| cast_type | prediction_mode | reconciliation behavior |
|---|---|---|
| melee | predicted | local anim starts immediately; server corrects hit results only |
| projectile | local_fx_only | spawn cosmetic projectile, replace with authoritative entity on snapshot |
| aoe_ground | local_fx_only | show marker immediately, apply damage only on server event |
| heal/buff | server_only | avoid false HP/UI state; apply on server event |

## 7) Role Synergy Combos (3-player)

| combo_id | sequence (timed order) | execution_window_ms | outcome |
|---|---|---:|---|
| combo_anchor_storm | `knight_taunt_banner -> mage_pyro_orb -> cleric_judgment_beam` | 2500 | Enemy clump + delayed burst + beam lock |
| combo_parry_punish | `knight_shield_parry(success) -> mage_meteor_spike -> cleric_mace_smite` | 1800 | Guaranteed punish on staggered elite |
| combo_sanctified_push | `cleric_revitalizing_field -> knight_lion_lunge -> mage_chain_lightning` | 2200 | Safe engage with sustain + cleave chain |
| combo_boss_burn | `mage_time_rift -> knight_heroic_slam -> cleric_divine_intervention -> team burst` | 3500 | Slow boss actions + safe all-in damage window |
| combo_last_stand_reset | `knight_last_stand -> cleric_resurrection_seed on mage -> mage_overcharge_storm` | 5000 | Controlled risk play during lethal phase |
| combo_net_execution | `ranger_hunter_net -> mage_pyro_orb -> knight_lion_lunge` | 2000 | Root confirms delayed burst and melee finisher |
| combo_marked_hunt | `ranger_hawk_mark -> knight_taunt_banner -> cleric_judgment_beam` | 2600 | Focus-fire burst on marked elite in controlled clump |

## 8) Implementation Order (first playable slice)

1. Implement early-tier abilities only (`knight_cleave`, `knight_shield_parry`, `mage_arc_bolt`, `mage_frost_snare`, `cleric_mace_smite`, `cleric_minor_heal`, `ranger_bow_shot`, `ranger_hunter_net`).
2. Add timing validator for parry/dodge windows using tick timestamps.
3. Add loadout swap state machine (2 loadouts + lock/channel/cooldown).
4. Add mid-tier control abilities and first 2 synergy combos.
5. Add late-tier ultimates after snapshot/event stability.
