# FE Agent Handoff: Post-Playable Frontend Slice

## Mission
Complete the next frontend slice after playable demo completion: sprite placeholder integration, stronger entity lifecycle handling, and combat UX polish.

## Class roster update
- Player roster is now four classes: **Knight, Mage, Cleric, Ranger**.
- Ranger requirements: **bow-and-arrow on left mouse** (primary) and **thrown net on right mouse** (secondary).

## Current Status (from `frontend/PROGRESS.md`)
- Prediction/reconciliation is implemented.
- One-map demo is playable with map rendering, enemy/player visuals, combat feedback, and HUD.
- Multi-tab local testing overrides (`roomId`, `playerId`) are implemented.

## Definition of Success
In one or more local tabs, player can:
1. See sprite-based placeholders (atlas/placeholders) instead of only primitive markers.
2. Keep smooth, stable entity visuals under snapshot jitter, out-of-order lifecycle, and reconnect.
3. See clearer combat UX feedback (primary cooldown state + hit/kill readability).
4. Keep existing prediction/reconciliation behavior unchanged.

## Mandatory Context
- `ARCHITECTURE.md`
- `CODING_GUIDELINES.md`
- `shared/INTEGRATION_CONTRACT.md`
- `shared/protocol/messages.ts`
- `assets/maps/starter-room.json`
- `assets/maps/map-schema.json`
- `backend/PROGRESS.md`

## File ownership
Edit only:
- `frontend/src/**`
- `frontend/README.md`
- frontend config files if strictly needed

Do not edit:
- `backend/**`, `shared/**`, `assets/sprites/**`, `tools/**`, `infra/**`

## Implementation Plan (ordered)

### Phase 1 — Sprite placeholder integration
1. Load and map placeholder sprite assets (or packed atlas references) for player/enemy/entity classes.
2. Preserve current fallback markers when sprite keys are missing.
3. Keep camera/static room behavior unchanged.

### Phase 2 — Entity lifecycle hardening
1. Handle snapshots that reference unknown entities by safe upsert behavior (no crashes).
2. Ensure despawn/rejoin/reconnect paths cleanly recreate render objects.
3. Keep interpolation smooth and bounded during correction spikes.

### Phase 3 — Combat UX polish
1. Keep LMB primary + RMB secondary input wiring.
2. Improve event-driven hit/kill readability and add explicit primary cooldown indicator state.
3. Keep HUD enemy counts and connection state aligned with authoritative snapshots.

### Phase 4 — Regression guardrails
1. Maintain current movement constants and reconciliation replay behavior exactly.
2. Verify no regressions in multi-tab room joins and remote entity visibility.

## Validation (required)
```bash
cd frontend
npm install
npm run build
```

## Local Demo Smoke Test (required)
1. Start backend and frontend.
2. Open 2 tabs with same `roomId`, different `playerId`.
3. Verify:
   - map and walls render,
   - both players see each other,
   - enemies appear and react to attacks,
   - HUD updates and connection status is correct.

## Definition of Done
- Sprite placeholders are rendering for key entity types with safe fallback.
- Entity lifecycle/reconnect handling is resilient under local multi-tab testing.
- Combat UX feedback is clearer without breaking existing input/prediction behavior.
- Build passes and code follows `CODING_GUIDELINES.md`.

## Agent response format
1. Files changed.
2. Map rendering approach.
3. Combat/HUD feedback added.
4. Multi-tab local testing UX changes.
5. Build + smoke test results.
