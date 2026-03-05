# Frontend Runtime

## Requirements
- Node.js 20+

## Local run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```
3. Build check:
   ```bash
   npm run build
   ```

## Environment
Create `frontend/.env.local` with:

```bash
VITE_WS_URL=ws://localhost:8080/ws?roomId=<uuid>&playerId=<uuid>
```

The client uses JSON WebSocket messages defined in `shared/protocol/messages.ts`.

## Multi-tab local demo
- You can override IDs without editing env vars:
  - `http://localhost:5173/?roomId=<uuid>&playerId=<uuid>`
- Query params override `VITE_WS_URL` search params for this tab only.
