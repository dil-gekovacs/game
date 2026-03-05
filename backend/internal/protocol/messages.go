package protocol

import (
	"encoding/json"
	"errors"
)

const (
	TypePlayerInput   = "PlayerInput"
	TypeAbilitySwap   = "AbilitySwap"
	TypePing          = "Ping"
	TypeWorldSnapshot = "WorldSnapshot"
	TypeEvent         = "Event"
	TypePong          = "Pong"
	TypePlayerJoined  = "PlayerJoined"
	TypePlayerLeft    = "PlayerLeft"
	TypeGameStart     = "GameStart"
	TypeGameOver      = "GameOver"
)

type Envelope struct {
	Type string `json:"type"`
}

type EntitySnapshot struct {
	ID        uint16 `json:"id"`
	Type      uint8  `json:"type"`
	State     uint8  `json:"state"`
	Facing    uint8  `json:"facing"`
	HP        uint8  `json:"hp"`
	MaxHP     uint8  `json:"maxHp"`
	AnimFrame uint8  `json:"animFrame"`
	X         int16  `json:"x"`
	Y         int16  `json:"y"`
	VX        int16  `json:"vx"`
	VY        int16  `json:"vy"`
	Flags     uint8  `json:"flags"`
}

type EntityDelta struct {
	ID        uint16 `json:"id"`
	Type      *uint8 `json:"type,omitempty"`
	State     *uint8 `json:"state,omitempty"`
	Facing    *uint8 `json:"facing,omitempty"`
	HP        *uint8 `json:"hp,omitempty"`
	MaxHP     *uint8 `json:"maxHp,omitempty"`
	AnimFrame *uint8 `json:"animFrame,omitempty"`
	X         *int16 `json:"x,omitempty"`
	Y         *int16 `json:"y,omitempty"`
	VX        *int16 `json:"vx,omitempty"`
	VY        *int16 `json:"vy,omitempty"`
	Flags     *uint8 `json:"flags,omitempty"`
}

type PlayerInputMsg struct {
	Type      string  `json:"type"`
	Seq       uint16  `json:"seq"`
	Tick      uint32  `json:"tick"`
	MoveX     float64 `json:"moveX"`
	MoveY     float64 `json:"moveY"`
	Primary   bool    `json:"primary"`
	Secondary bool    `json:"secondary"`
	Parry     bool    `json:"parry"`
	AimAngle  float64 `json:"aimAngle"`
}

type AbilitySwapMsg struct {
	Type      string `json:"type"`
	SlotIndex uint8  `json:"slotIndex"`
	ItemID    uint16 `json:"itemId"`
}

type PingMsg struct {
	Type            string  `json:"type"`
	ClientTimestamp float64 `json:"clientTimestamp"`
}

type WorldSnapshotMsg struct {
	Type     string        `json:"type"`
	Tick     uint32        `json:"tick"`
	AckSeq   uint16        `json:"ackSeq"`
	Entities []EntityDelta `json:"entities"`
}

type EventMsg struct {
	Type      string  `json:"type"`
	Tick      uint32  `json:"tick"`
	EventType uint8   `json:"eventType"`
	EntityID  uint16  `json:"entityId"`
	TargetID  *uint16 `json:"targetId,omitempty"`
	Value     *int16  `json:"value,omitempty"`
}

type PongMsg struct {
	Type            string  `json:"type"`
	ClientTimestamp float64 `json:"clientTimestamp"`
	ServerTimestamp float64 `json:"serverTimestamp"`
}

type PlayerJoinedMsg struct {
	Type         string         `json:"type"`
	EntityID     uint16         `json:"entityId"`
	PlayerID     string         `json:"playerId"`
	InitialState EntitySnapshot `json:"initialState"`
}

type PlayerLeftMsg struct {
	Type     string `json:"type"`
	EntityID uint16 `json:"entityId"`
}

type GameStartMsg struct {
	Type       string `json:"type"`
	ServerTick uint32 `json:"serverTick"`
	MapID      string `json:"mapId"`
}

type GameOverMsg struct {
	Type    string `json:"type"`
	Victory bool   `json:"victory"`
}

var ErrUnknownMessageType = errors.New("unknown message type")

func DecodeClientMessage(data []byte) (any, error) {
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}

	switch env.Type {
	case TypePlayerInput:
		var msg PlayerInputMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return nil, err
		}
		return msg, nil
	case TypeAbilitySwap:
		var msg AbilitySwapMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return nil, err
		}
		return msg, nil
	case TypePing:
		var msg PingMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			return nil, err
		}
		return msg, nil
	default:
		return nil, ErrUnknownMessageType
	}
}

func EncodeMessage(msg any) ([]byte, error) {
	return json.Marshal(msg)
}
