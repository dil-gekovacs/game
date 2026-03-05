/**
 * shared/protocol/messages.ts
 *
 * All WebSocket message types exchanged between the frontend (client) and
 * backend (Go server). This is the canonical TypeScript definition; the Go
 * backend derives its struct definitions from the JSON Schema at
 * shared/protocol/schema.json.
 *
 * Transport (current): JSON over WebSocket.
 * Transport (future): binary over WebSocket — see §Binary migration notes
 * in INTEGRATION_CONTRACT.md and inline comments here.
 *
 * Discriminant field: every message carries a `"type"` string. In binary,
 * this becomes a single u8 message-type byte at offset 0.
 */

import type { EntityDelta, EntityId, EntitySnapshot, EventType } from "../types/entities";

// ---------------------------------------------------------------------------
// Message type constants
// (binary opcode is the numeric value — keep stable, never reuse)
// ---------------------------------------------------------------------------

export const MSG = {
  // Client → Server  (opcodes 0x01–0x0F)
  PLAYER_INPUT:   "PlayerInput",   // 0x01
  ABILITY_SWAP:   "AbilitySwap",   // 0x02
  PING:           "Ping",          // 0x03

  // Server → Client  (opcodes 0x10–0x2F)
  WORLD_SNAPSHOT: "WorldSnapshot", // 0x10
  EVENT:          "Event",         // 0x11
  PONG:           "Pong",          // 0x12
  PLAYER_JOINED:  "PlayerJoined",  // 0x13
  PLAYER_LEFT:    "PlayerLeft",    // 0x14
  GAME_START:     "GameStart",     // 0x15
  GAME_OVER:      "GameOver",      // 0x16
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];

// ---------------------------------------------------------------------------
// Client → Server messages
// ---------------------------------------------------------------------------

/**
 * Sent every input tick (up to 60 Hz; typical 30 Hz).
 *
 * Binary (10 bytes):
 *   opcode   u8   0x01
 *   seq      u16  monotonically increasing per-client input counter
 *   tick     u32  client local tick at time of input sample
 *   moveX    i8   [-127, 127]  (0 = no horizontal input)
 *   moveY    i8   [-127, 127]  (0 = no vertical input)
 *   buttons  u8   bit 0: primary, bit 1: secondary, bit 2: parry, bits 3-7: reserved
 *   aimAngle u8   [0, 255] mapped to [0, 2π]
 */
export interface PlayerInputMsg {
  type: typeof MSG.PLAYER_INPUT;
  /** Monotonically increasing per-client input sequence number. */
  seq: number;
  /** Client-local tick at time of sampling. */
  tick: number;
  /** Horizontal movement axis [-1.0, 1.0]. JSON float; binary i8 ÷ 127. */
  moveX: number;
  /** Vertical movement axis [-1.0, 1.0]. JSON float; binary i8 ÷ 127. */
  moveY: number;
  /** True when primary action button is held. */
  primary: boolean;
  /** True when secondary action button is held. */
  secondary: boolean;
  /** True when parry button was pressed this tick. */
  parry: boolean;
  /** Aim direction in radians [0, 2π]. Binary: u8 ÷ 255 × 2π. */
  aimAngle: number;
}

/**
 * Swap an ability into a slot (triggered by player interaction).
 *
 * Binary (4 bytes):
 *   opcode    u8   0x02
 *   slotIndex u8   [0, 3]
 *   itemId    u16
 */
export interface AbilitySwapMsg {
  type: typeof MSG.ABILITY_SWAP;
  /** Ability slot index [0, 3]. */
  slotIndex: number;
  /** Item/ability ID from game data tables. */
  itemId: number;
}

/**
 * Latency probe. Client sends its local timestamp; server echoes it back.
 *
 * Binary (9 bytes):
 *   opcode          u8
 *   clientTimestamp f64  (ms since page load)
 */
export interface PingMsg {
  type: typeof MSG.PING;
  /** performance.now() value in milliseconds. */
  clientTimestamp: number;
}

/** Union of all client→server messages. */
export type ClientMessage = PlayerInputMsg | AbilitySwapMsg | PingMsg;

// ---------------------------------------------------------------------------
// Server → Client messages
// ---------------------------------------------------------------------------

/**
 * Authoritative entity state snapshot, sent at ~20 Hz.
 * Contains delta-compressed entity states since the client's last acked snapshot.
 *
 * Binary (variable):
 *   opcode    u8
 *   tick      u32   server simulation tick
 *   ackSeq    u16   last client input seq the server has processed
 *   count     u16   number of entity deltas following
 *   [entities: variable — see EntitySnapshot binary layout in entities.ts]
 *
 * Binary migration note: full snapshots use the EntitySnapshot layout;
 * delta snapshots prefix each entity record with a u16 presence bitmask
 * indicating which optional fields are present.
 */
export interface WorldSnapshotMsg {
  type: typeof MSG.WORLD_SNAPSHOT;
  /** Server simulation tick this snapshot was generated at. */
  tick: number;
  /** Last PlayerInput.seq the server has applied. Used for reconciliation. */
  ackSeq: number;
  /**
   * Changed entities since client's last ack'd snapshot.
   * Full snapshot on first message or after reconnect; deltas thereafter.
   */
  entities: EntityDelta[];
}

/**
 * Discrete game event (reliable delivery assumed over WebSocket).
 *
 * Binary (10 bytes fixed + optional payload):
 *   opcode    u8
 *   tick      u32
 *   eventType u8
 *   entityId  u16
 *   targetId  u16  (0xFFFF = no target)
 *   value     i16  (damage amount, heal amount, etc.)
 */
export interface EventMsg {
  type: typeof MSG.EVENT;
  /** Server tick the event occurred on. */
  tick: number;
  eventType: EventType;
  /** Primary entity involved (attacker, spawned entity, etc.). */
  entityId: EntityId;
  /** Secondary entity involved (defender, pickup target, etc.). Omit if none. */
  targetId?: EntityId;
  /** Numeric value (damage dealt, HP healed, item ID, etc.). */
  value?: number;
}

/**
 * Echo of the client's Ping with an added server timestamp.
 *
 * Binary (17 bytes):
 *   opcode          u8
 *   clientTimestamp f64
 *   serverTimestamp f64
 */
export interface PongMsg {
  type: typeof MSG.PONG;
  /** Echoed from the client's PingMsg. */
  clientTimestamp: number;
  /** Server monotonic timestamp in milliseconds. */
  serverTimestamp: number;
}

/**
 * Broadcast when a player connects and is assigned an entity.
 *
 * Binary (19 bytes):
 *   opcode    u8
 *   entityId  u16
 *   playerId  16 bytes  (UUID raw bytes)
 *   class     u8
 */
export interface PlayerJoinedMsg {
  type: typeof MSG.PLAYER_JOINED;
  entityId: EntityId;
  /** UUID string in JSON. */
  playerId: string;
  /** Initial full entity snapshot for this player. */
  initialState: EntitySnapshot;
}

/**
 * Broadcast when a player disconnects.
 *
 * Binary (3 bytes):
 *   opcode    u8
 *   entityId  u16
 */
export interface PlayerLeftMsg {
  type: typeof MSG.PLAYER_LEFT;
  entityId: EntityId;
}

/**
 * Sent to all clients when the room simulation starts.
 *
 * Binary (5 bytes):
 *   opcode      u8
 *   serverTick  u32
 */
export interface GameStartMsg {
  type: typeof MSG.GAME_START;
  /** Server tick at game start (for client clock sync). */
  serverTick: number;
  /** Map identifier clients should load. */
  mapId: string;
}

/**
 * Sent when the room session ends (all players dead, or victory).
 *
 * Binary (2 bytes):
 *   opcode  u8
 *   victory u8  (0=defeat, 1=victory)
 */
export interface GameOverMsg {
  type: typeof MSG.GAME_OVER;
  victory: boolean;
}

/** Union of all server→client messages. */
export type ServerMessage =
  | WorldSnapshotMsg
  | EventMsg
  | PongMsg
  | PlayerJoinedMsg
  | PlayerLeftMsg
  | GameStartMsg
  | GameOverMsg;

/** Union of all messages (either direction). */
export type AnyMessage = ClientMessage | ServerMessage;
