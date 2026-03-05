package server

import (
	"errors"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"game/backend/internal/game"
	"game/backend/internal/protocol"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(_ *http.Request) bool {
		return true
	},
}

type Handler struct {
	roomsMu sync.Mutex
	rooms   map[string]*game.Room
}

func NewHandler() *Handler {
	return &Handler{rooms: make(map[string]*game.Room)}
}

func (h *Handler) HandleWS(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("roomId")
	playerID := r.URL.Query().Get("playerId")
	if roomID == "" || playerID == "" {
		http.Error(w, "missing roomId or playerId", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade failed: %v", err)
		return
	}

	client := &wsClient{conn: conn}
	room := h.getOrCreateRoom(roomID)

	player, existing, ok := room.AddPlayer(playerID, client)
	if !ok {
		_ = client.SendJSON(protocol.GameOverMsg{Type: protocol.TypeGameOver, Victory: false})
		_ = client.Close()
		return
	}

	for _, peer := range existing {
		_ = client.SendJSON(newPlayerJoinedMsg(peer))
	}
	joinMsg := newPlayerJoinedMsg(player)
	_ = client.SendJSON(joinMsg)
	room.BroadcastExcept(joinMsg, player.EntityID)
	_ = client.SendJSON(protocol.GameStartMsg{Type: protocol.TypeGameStart, ServerTick: room.Tick(), MapID: room.MapID()})

	go h.readLoop(room, player, client)
}

func (h *Handler) getOrCreateRoom(roomID string) *game.Room {
	h.roomsMu.Lock()
	defer h.roomsMu.Unlock()

	if room, ok := h.rooms[roomID]; ok {
		return room
	}

	room := game.NewRoom(roomID)
	h.rooms[roomID] = room
	return room
}

func (h *Handler) readLoop(room *game.Room, player *game.Player, client *wsClient) {
	defer func() {
		room.RemovePlayer(player.EntityID)
		room.Broadcast(protocol.PlayerLeftMsg{Type: protocol.TypePlayerLeft, EntityID: player.EntityID})
		_ = client.Close()
	}()

	for {
		_, data, err := client.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("read error: %v", err)
			}
			return
		}

		msg, err := protocol.DecodeClientMessage(data)
		if err != nil {
			if !errors.Is(err, protocol.ErrUnknownMessageType) {
				log.Printf("decode error: %v", err)
			}
			continue
		}

		switch typed := msg.(type) {
		case protocol.PlayerInputMsg:
			if isStaleSeq(player.LastAppliedSeq, typed.Seq) {
				continue
			}
			room.ApplyInput(player.EntityID, game.PlayerInput{
				MoveX:     typed.MoveX,
				MoveY:     typed.MoveY,
				AimAngle:  typed.AimAngle,
				Primary:   typed.Primary,
				Secondary: typed.Secondary,
				Parry:     typed.Parry,
				Seq:       typed.Seq,
				Tick:      typed.Tick,
			})
		case protocol.AbilitySwapMsg:
			_ = typed
		case protocol.PingMsg:
			_ = client.SendJSON(protocol.PongMsg{
				Type:            protocol.TypePong,
				ClientTimestamp: typed.ClientTimestamp,
				ServerTimestamp: float64(time.Now().UnixMilli()),
			})
		}
	}
}

func newPlayerJoinedMsg(player *game.Player) protocol.PlayerJoinedMsg {
	return protocol.PlayerJoinedMsg{
		Type:     protocol.TypePlayerJoined,
		EntityID: player.EntityID,
		PlayerID: player.PlayerID,
		InitialState: protocol.EntitySnapshot{
			ID:        player.EntityID,
			Type:      0,
			State:     player.State,
			Facing:    player.Facing,
			HP:        player.HP,
			MaxHP:     player.MaxHP,
			AnimFrame: 0,
			X:         int16(player.X),
			Y:         int16(player.Y),
			VX:        0,
			VY:        0,
			Flags:     player.Flags,
		},
	}
}

func isStaleSeq(lastSeen, incoming uint16) bool {
	if incoming == lastSeen {
		return true
	}
	if lastSeen > incoming && (lastSeen-incoming) < 32768 {
		return true
	}
	return false
}

type wsClient struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (c *wsClient) SendJSON(msg any) error {
	payload, err := protocol.EncodeMessage(msg)
	if err != nil {
		return err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteMessage(websocket.TextMessage, payload)
}

func (c *wsClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.Close()
}
