# Bug Verification Report

**Date:** 2026-03-05
**Test URL:** http://localhost:5173/?roomId=bug-test&playerId=bug-tester
**HUD State:** room: bug-test, player: bug-tester, entity: 1, connection: connected, enemies: 10

---

## Bug 1: Knight sprite seems static -- does not change facing direction when moving

**Status: CONFIRMED**

After moving right (d key), up (w key), and left (a key), the player knight sprite appears to face the same direction in all screenshots. The camera shifts slightly to follow the player, confirming movement is happening, but the sprite orientation does not visually change to match the direction of travel. All enemy sprites also appear to face the same direction regardless of their position relative to the player.

**Screenshots:**
- `bug-initial.png` -- initial state, sprite facing right
- `bug-move-right.png` -- after moving right, sprite still facing right
- `bug-move-up.png` -- after moving up, sprite still facing right
- `bug-move-left.png` -- after moving left, sprite still facing right (should face left)

---

## Bug 2: Spacebar attack doesn't work -- player doesn't attack

**Status: NOT CONFIRMED**

Pressing spacebar did produce a visible attack animation on the player sprite. In `bug-attack-1.png`, the player's arm/weapon is visibly extended in an attack posture, which differs from the idle stance. No JavaScript errors were generated during attack. The attack appears to function correctly at the visual level.

Note: Could not verify whether the attack actually deals damage to enemies since no enemies were in melee range during testing. The visual attack animation does trigger.

**Screenshots:**
- `bug-attack-1.png` -- attack pose visible (arm extended)
- `bug-attack-2.png` -- follow-up attacks also show animation

---

## Bug 3: No enemies visible in the dungeon

**Status: NOT CONFIRMED**

The HUD shows `enemies: 10`, and multiple enemy sprites with green health bars are clearly visible throughout the dungeon in all screenshots. At least 5-6 enemies are visible on screen at any time, spread across the map. Enemies appear to be rendering correctly with health bars.

---

## Console Errors

**Errors:** 0
**Warnings:** 5 (all from `entityRenderer.ts`)
- 3 warnings from `renderHealthBar` (lines 319-321)
- 2 warnings from `renderFlashEffects` (lines 226-227)

These warnings may be related to rendering edge cases but do not prevent gameplay.

---

## Summary

| Bug | Reported Issue | Verdict |
|-----|---------------|---------|
| 1 | Knight sprite does not change facing direction | CONFIRMED -- sprite facing is static regardless of movement direction |
| 2 | Spacebar attack doesn't work | NOT CONFIRMED -- attack animation triggers on spacebar |
| 3 | No enemies visible in the dungeon | NOT CONFIRMED -- 10 enemies visible with health bars |
