# Single Docker Image Implementation Plan

## Goal

Produce one production Docker image that serves the frontend and backend together, so running the app is a single `docker run` command while preserving local multiplayer behavior.

## Current State (as of this plan)

- Backend (Go) exposes:
  - `GET /ws?roomId=<id>&playerId=<id>`
  - `GET /healthz`
- Frontend (Vite + PixiJS) currently expects `VITE_WS_URL` at build/runtime and connects directly via browser WebSocket.
- Frontend loads map/tiles/sprites from `/assets/...` paths.
- Backend map loading currently reads file path from source-relative disk path (`runtime.Caller` + `os.ReadFile`), which is fragile in containerized runtime.
- No Dockerfile currently exists.

## Target Runtime Architecture (Single Container)

- One process in container: Go server binary.
- Go server responsibilities:
  1. Serve API/WS endpoints (`/ws`, `/healthz`).
  2. Serve built frontend static files (`/` and static assets).
  3. Provide SPA fallback to `index.html` for unknown non-API routes.
- Browser connects back to same origin:
  - `ws://<host>/ws` in local HTTP
  - `wss://<host>/ws` behind TLS reverse proxy

## Implementation Phases

### Phase 1: Make frontend URL strategy container-safe

1. Update frontend connection config to support same-origin default:
   - If `VITE_WS_URL` is set, keep current behavior.
   - Else derive URL from `window.location`:
     - protocol `http:` -> `ws:`
     - protocol `https:` -> `wss:`
     - path `/ws`
2. Preserve `roomId` / `playerId` query param override behavior.
3. Keep current env-var path for local FE-only dev workflows.

**Files likely touched**
- `frontend/src/main.ts`
- `frontend/README.md`

### Phase 2: Serve frontend build from backend

1. Add static file serving in backend main:
   - Serve `frontend/dist` under `/`.
   - Keep explicit `/ws` and `/healthz` handlers.
2. Add SPA fallback behavior:
   - For non-API routes, return `index.html`.
3. Ensure static file server does not intercept `/ws`.

**Files likely touched**
- `backend/cmd/server/main.go`
- Possibly new helper under `backend/internal/server/` for SPA/static handler
- `backend/README.md`

### Phase 3: Make map/assets loading deterministic in container

1. Replace backend source-relative file lookup with robust approach:
   - Preferred: `go:embed` map JSON assets used by authoritative simulation.
   - Optional fallback: `MAP_PATH` env var for overrides.
2. Keep map ID behavior aligned with frontend map selection.
3. Validate map parse/load failure surfaces clear startup/runtime errors.

**Files likely touched**
- `backend/internal/game/room.go`
- optional `backend/internal/game/maps_embed.go`

### Phase 4: Add multi-stage Dockerfile

1. Stage A (frontend build):
   - Base: Node 20+
   - `npm ci`
   - `npm run build`
2. Stage B (backend build):
   - Base: Go 1.22+
   - `go mod download`
   - build Linux binary (`CGO_ENABLED=0`)
3. Stage C (runtime):
   - Base: distroless/static-debian or alpine
   - copy backend binary
   - copy frontend dist (if not embedded)
   - set non-root user
   - `EXPOSE 8080`
   - `HEALTHCHECK` on `/healthz`
   - `ENTRYPOINT` backend binary

**Files to add**
- `Dockerfile`
- `.dockerignore`

### Phase 5: Verification and smoke tests

1. Pre-container checks:
   - `cd frontend && npm run build`
   - `cd backend && go test ./...`
   - `cd backend && go build ./cmd/server`
2. Container checks:
   - `docker build -t game:single .`
   - `docker run --rm -p 8080:8080 game:single`
   - Verify:
     - `curl http://localhost:8080/healthz` returns `ok`
     - frontend loads at `http://localhost:8080`
     - 2–3 tabs can join same room with query params
     - movement + attack + enemy sync still works
3. Log and fix regressions before finalizing.

## Detailed Task Breakdown

1. **Frontend net URL fallback**
   - Add same-origin WS resolver utility.
   - Preserve current query override path.
   - Document env and fallback precedence.
2. **Backend static hosting**
   - Add file server + SPA fallback.
   - Keep `/ws` upgrade path unchanged.
   - Confirm no CORS requirement for same-origin mode.
3. **Asset/map robustness**
   - Embed required maps in backend, remove runtime path fragility.
   - Verify frontend static paths remain valid in container.
4. **Containerization**
   - Build, copy artifacts, run as non-root, add healthcheck.
5. **Operational docs**
   - Add simple run commands to top-level docs:
     - build image
     - run image
     - join demo tabs with room/player query params

## Risks and Mitigations

1. **WS URL mismatch in container**
   - Mitigation: same-origin default with protocol switch `ws/wss`.
2. **SPA deep-link 404s**
   - Mitigation: explicit fallback to `index.html`.
3. **Backend map load failure in image**
   - Mitigation: `go:embed` + startup validation.
4. **Large image size**
   - Mitigation: multi-stage build, distroless/alpine runtime, `.dockerignore`.
5. **Behavior drift between local and container**
   - Mitigation: identical smoke checks in both modes.

## Acceptance Criteria

- A single image can be built from repository root.
- `docker run -p 8080:8080 <image>` starts complete app.
- Browser gameplay works from same origin with no manual WS env required.
- `/healthz` remains functional.
- Multiplayer room join and real-time combat function for at least 2 clients locally.
- README docs include container build/run instructions.

## Suggested Execution Order

1. Frontend WS same-origin fallback.
2. Backend static hosting + SPA fallback.
3. Backend map embed/refactor.
4. Dockerfile + `.dockerignore`.
5. Validate end-to-end in container.
6. Update docs and handoff notes.

## Out of Scope for This Slice

- Kubernetes manifests / Helm.
- Horizontal room scaling across multiple container instances.
- Binary protocol migration.
- TLS termination inside container (assume reverse proxy or local HTTP).
