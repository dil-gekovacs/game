# Sprint 2 Generation Status

Generated: 2026-03-05

## Priority 1: Grunt Melee (2c46ba32-7b5c-4bb7-a0bc-a0f33200e5b8)

All 4 requested animations generated. West direction consistently failed across all animations (known PixelLab issue with this character).

| Animation          | South | East | North | West |
|--------------------|-------|------|-------|------|
| walking-4-frames   | 4fr   | 4fr  | 4fr   | FAIL |
| lead-jab           | 3fr   | 3fr  | 3fr   | FAIL |
| taking-punch       | 6fr   | 6fr  | 6fr   | FAIL |
| falling-back-death | 7fr   | 7fr  | 7fr   | FAIL |

Pre-existing: breathing-idle (south, east, north - west also missing)

## Priority 2: Skeleton Warrior (40fe7e92-ebeb-48b0-a027-ed94501f4dcc)

Character created successfully on second attempt (first attempt ID fcb4e501 failed).

| Animation          | South | East | North | West |
|--------------------|-------|------|-------|------|
| breathing-idle     | 4fr   | 4fr  | 4fr   | 4fr  |
| walking-4-frames   | 4fr   | 4fr  | 4fr   | 4fr  |
| lead-jab           | 3fr   | 3fr  | 3fr   | 3fr  |
| falling-back-death | 7fr   | FAIL | FAIL  | FAIL |

Note: falling-back-death only has south direction. East/north/west failed.

## Priority 3: Knight Parry Animations (a4c5408c-2665-4e58-b1c1-4fb3fb926232)

| Animation                    | Alias        | South | East | North | West |
|------------------------------|--------------|-------|------|-------|------|
| crouching                    | parry_start  | 5fr   | FAIL | 5fr   | FAIL |
| fight-stance-idle-8-frames   | parry_window | 8fr   | FAIL | FAIL  | FAIL |

Note: Animations saved under both original template names and alias names.

## File Locations

- Assets: `/Users/gekovacs/workspace/game/assets/sprites/pixellab/characters/`
- Public: `/Users/gekovacs/workspace/game/frontend/public/assets/sprites/pixellab/characters/`
- Total PNGs synced to public: 357

## Known Issues

- Grunt Melee west direction fails for all animations (character-level issue)
- Skeleton falling-back-death only generated south direction
- Knight parry animations have partial direction coverage
- PixelLab occasionally drops direction jobs silently (no error, just not generated)
