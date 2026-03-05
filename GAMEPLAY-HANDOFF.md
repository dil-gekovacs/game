# Gameplay Handoff

## What I created
- Added `shared/design/gameplay-creative-design-kit.md` with implementation-ready gameplay tables for Knight/Mage/Cleric/Ranger.
- Included early/mid/late progression, unlock levels, combat timings, cooldown budgets, loadout/equipment swap rules, and 3-player synergy combo definitions.
- Kept design IDs machine-usable (`ability_id`, `combo_id`, fixed numeric windows/cooldowns) for direct protocol/data-table integration.

## How to implement first
1. Create server-side static data tables using ability rows from section 3 (`ability_id`, timings, cooldowns, costs).
2. Implement authoritative timing checks from section 6 (parry, iframe, combo link windows) in the combat resolver.
3. Add swap state machine from section 4 (`safe_swap_channel_ms`, lock/cooldown) and wire to `AbilitySwap` message.
4. Ship early-tier-only vertical slice (section 8 step 1) before mid/late unlocks.

## Risks
- Parry fairness under variable RTT can feel inconsistent if tolerance cap is too high/low.
- Too many mid/late control effects can reduce encounter readability in 3-player chaos.
- Loadout swaps can create exploit loops without strict combat-lock and channel interruption.

## Next actions
- Define exact status effect enums (`slow`, `stagger`, `armor_break`, `invuln`) shared by frontend/backend.
- Build combat telemetry logging per ability cast/hit to tune cooldown and timing windows.
- Playtest first two synergy combos, then adjust cooldown budget before enabling ultimates.
