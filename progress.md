# Project Progress

## Update Log

### 2026-03-05

#### Completed
- Architecture investigation and recommendations documented in:
  - `ARCHITECTURE.md`
  - `multiplayer-architecture.md`
- Workspace structure created:
  - `frontend/`, `backend/`, `shared/`, `assets/`, `tools/`, `infra/`
- Shared integration contract and JSON protocol artifacts created in `shared/`
- Frontend scaffold created with PixiJS + TypeScript + Vite in `frontend/`
- Backend authoritative Go + WebSocket scaffold created in `backend/`
- Sprite pipeline artifacts created in `tools/sprites/` and `assets/sprites/`
- Map schema and starter assets created in `assets/maps/`
- Integration validation completed; frontend and backend builds pass
- Class roster updated across docs/specs to include 4th class **Ranger**:
  - Ranger primary: bow-and-arrow
  - Ranger secondary: thrown net

- Creative kit consolidation completed and implementation handoffs finalized:
  - `CREATIVE-next.md`
  - `CREATIVE-EXECUTION-HANDOFF.md`
  - Source kits finalized: gameplay, enemy encounters, pixel-art direction, and map kit/room index
- Fleet playable-slice documentation finalized:
  - Backend authoritative movement slice completed (`backend/PROGRESS.md`)
  - Frontend prediction/reconciliation + one-map demo UX slice completed (`frontend/PROGRESS.md`)
  - Sprite placeholder pass + model capability evaluation completed

#### Current Direction
- Network protocol starts as JSON, then migrates to binary after schema stabilization.
- Local development run model:
  - Frontend: Vite dev server
  - Backend: Go server (`go run` / built binary)

#### Next Steps
- Backend: implement Ranger authoritative combat slice (bow projectile primary + net crowd-control secondary).
- Frontend: integrate sprite placeholders/atlas mapping into entity rendering and harden lifecycle handling for reconnect/snapshot ordering.
- Creative: run human pixel-art cleanup pass on placeholder outputs; use AI for spec/QA only per `SPRITE-MODEL-EVAL.md`.
