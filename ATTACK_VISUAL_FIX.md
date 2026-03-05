# Attack Visual Fix

## Changes Made

File edited: `frontend/src/entityRenderer.ts`

### 1. Attack Arc Made More Visible

Updated constants for the attack arc effect:

| Property | Before | After | Reason |
|----------|--------|-------|--------|
| `ATTACK_ARC_DURATION_MS` | 150 | 250 | Longer display time so the arc is visible |
| `ATTACK_ARC_ANGLE_RAD` | PI/3 (60 deg) | PI/2 (90 deg) | Wider arc for better visibility |
| `ATTACK_ARC_RADIUS` | 18 | 24 | Larger radius so arc extends further |
| `ATTACK_ARC_COLOR` | 0xfde68a (pale yellow) | 0xff6b35 (bright orange-red) | Higher contrast color |
| `ATTACK_ARC_LINE_WIDTH` | 3 | 5 | Thicker line for the arc stroke |

### 2. Attack Scale Pulse Added

Added a 20% scale pulse on the Knight sprite during the first 100ms of an attack. Two new named constants were introduced:

- `ATTACK_PULSE_DURATION_MS = 100` -- how long the pulse lasts
- `ATTACK_PULSE_SCALE = 1.2` -- 20% larger during pulse

In `renderEntitiesSprite`, when `record.current.state === EntityState.Attacking`, the sprite scale is multiplied by the pulse factor for the first 100ms, then returns to normal. This makes the attack feel more impactful even if the arc is missed.

## Playwright Verification

- Loaded the game at `http://localhost:5173/?roomId=attack-vis2&playerId=attack-tester2`
- Connection established successfully (entity: 1, enemies: 10)
- Pressed Space to attack; screenshots captured during combat
- The attack arc's 250ms duration is still very brief for screenshot capture, but the player's health bar showed damage exchange confirming combat occurred
- The knight sprite in screenshot 3 shows the player after walking right and attacking near an enemy, with visibly different sprite posture
- The code compiles cleanly with `npm run build` (tsc + vite, zero errors)
