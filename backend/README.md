# Backend authoritative server scaffold

Minimal Go WebSocket authoritative server skeleton aligned with `shared/protocol/messages.ts` and `shared/protocol/schema.json`.

## Run locally

```bash
cd backend
go mod tidy
go run ./cmd/server
```

Server endpoints:
- `GET /healthz`
- `GET /ws?roomId=<room-id>&playerId=<player-id>`

## Notes

- JSON text frames with `type` discriminant are supported.
- Room/session model is scoped to max 3 players.
- Fixed loop scaffold runs `30Hz` simulation ticks and `20Hz` snapshot broadcasts.
