package game

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"sync"
	"time"

	"game/backend/internal/protocol"
)

const MaxPlayers = 3

const (
	PlayerSpeed   = 96 // pixels per second
	EnemySpeed    = 56 // pixels per second
	SimTickRate   = 30  // Hz
	SimDeltaMs    = 33  // milliseconds per sim tick
	SimDeltaSec   = float64(SimDeltaMs) / 1000.0
	PlayerRadius  = 6.0
	EnemyRadius   = 6.0
	EnemyAggroRng = 120.0

	PrimaryAttackCooldownTicks          = 12
	PrimaryAttackRange                  = 40.0
	PrimaryAttackConeHalfAngle          = math.Pi / 4 // 45 degrees each side = 90 degree cone
	PrimaryAttackDamage          uint8  = 50

	EnemyContactDamage       uint8  = 10
	EnemyAttackCooldownTicks uint8  = 30
	EnemyMeleeRange                 = 16.0
	EnemyRespawnTicks        uint16 = 150

	PlayerStateDead      uint8  = 5
	PlayerStateAttacking uint8  = 2
	PlayerRespawnTicks   uint16 = 90 // 3 seconds at 30Hz

	eventTypeDamage        uint8 = 0
	eventTypeEntityDespawn uint8 = 5
	enemyType              uint8 = 1
)

var fallbackSpawnPositions = [MaxPlayers][2]float64{
	{100, 300},
	{400, 300},
	{700, 300},
}

// PlayerConn abstracts the WebSocket connection for testability.
type PlayerConn interface {
	SendJSON(any) error
	Close() error
}

// PlayerInput holds the latest input received from a client.
type PlayerInput struct {
	MoveX     float64
	MoveY     float64
	AimAngle  float64
	Primary   bool
	Secondary bool
	Parry     bool
	Seq       uint16
	Tick      uint32
}

// Player represents a connected player and their authoritative simulation state.
type Player struct {
	PlayerID       string
	EntityID       uint16
	Conn           PlayerConn
	LastAppliedSeq uint16

	X      float64
	Y      float64
	VX     float64
	VY     float64
	Facing uint8 // 0=Down 1=Up 2=Left 3=Right
	State  uint8 // 0=Idle 1=Moving
	HP     uint8
	MaxHP  uint8
	Flags  uint8 // bit 0: visible

	SpawnX float64
	SpawnY float64

	LatestInput              PlayerInput
	PrimaryCooldownRemaining uint8
	RespawnTimer             uint16
}

type Enemy struct {
	EntityID uint16
	X        float64
	Y        float64
	VX       float64
	VY       float64
	Facing   uint8
	State    uint8
	HP       uint8
	MaxHP    uint8
	Flags    uint8

	SpawnX                  float64
	SpawnY                  float64
	Dead                    bool
	RespawnTimer            uint16
	AttackCooldownRemaining uint8

	// Per-archetype stats
	Speed         float64
	ContactDamage uint8
}

type collisionRect struct {
	X      float64
	Y      float64
	Width  float64
	Height float64
}

type spawnPoint struct {
	X      float64
	Y      float64
	Facing uint8
}

type mapRuntime struct {
	WidthPx      float64
	HeightPx     float64
	Collisions   []collisionRect
	PlayerSpawns []spawnPoint
	EnemySpawns  []spawnPoint
}

type Room struct {
	id      string
	mapID   string
	tick    uint32
	players map[uint16]*Player
	enemies map[uint16]*Enemy

	worldWidth   float64
	worldHeight  float64
	collisions   []collisionRect
	playerSpawns []spawnPoint

	mu     sync.RWMutex
	stopCh chan struct{}
	once   sync.Once
}

func NewRoom(id string) *Room {
	runtimeMap, ok := loadStarterRoomRuntime()
	if !ok {
		runtimeMap = fallbackRuntimeMap()
	}

	r := &Room{
		id:           id,
		mapID:        "dungeon-large",
		players:      make(map[uint16]*Player, MaxPlayers),
		enemies:      make(map[uint16]*Enemy),
		worldWidth:   runtimeMap.WidthPx,
		worldHeight:  runtimeMap.HeightPx,
		collisions:   runtimeMap.Collisions,
		playerSpawns: runtimeMap.PlayerSpawns,
		stopCh:       make(chan struct{}),
	}
	r.initEnemies(runtimeMap.EnemySpawns)
	go r.run()
	return r
}

func (r *Room) ID() string {
	return r.id
}

func (r *Room) MapID() string {
	return r.mapID
}

func (r *Room) Tick() uint32 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.tick
}

func (r *Room) AddPlayer(playerID string, conn PlayerConn) (*Player, []*Player, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.players) >= MaxPlayers {
		return nil, nil, false
	}

	entityID := r.nextEntityIDLocked()
	spawnX, spawnY := r.playerSpawnForSlotLocked(int(entityID) - 1)

	player := &Player{
		PlayerID: playerID,
		EntityID: entityID,
		Conn:     conn,
		X:        spawnX,
		Y:        spawnY,
		HP:       200,
		MaxHP:    200,
		Facing:   0,
		State:    0,
		Flags:    1,
		SpawnX:   spawnX,
		SpawnY:   spawnY,
	}

	existing := make([]*Player, 0, len(r.players))
	for _, p := range r.players {
		existing = append(existing, p)
	}

	r.players[entityID] = player
	return player, existing, true
}

func (r *Room) RemovePlayer(entityID uint16) {
	r.mu.Lock()
	delete(r.players, entityID)
	empty := len(r.players) == 0
	r.mu.Unlock()

	if empty {
		r.Stop()
	}
}

func (r *Room) ApplyInput(entityID uint16, input PlayerInput) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p, ok := r.players[entityID]; ok {
		p.LatestInput = input
		p.LastAppliedSeq = input.Seq
	}
}

func (r *Room) SnapshotFor(entityID uint16) protocol.WorldSnapshotMsg {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ackSeq := uint16(0)
	if p, ok := r.players[entityID]; ok {
		ackSeq = p.LastAppliedSeq
	}

	return protocol.WorldSnapshotMsg{
		Type:     protocol.TypeWorldSnapshot,
		Tick:     r.tick,
		AckSeq:   ackSeq,
		Entities: r.buildEntityDeltasLocked(),
	}
}

func (r *Room) Broadcast(msg any) {
	r.mu.RLock()
	players := make([]*Player, 0, len(r.players))
	for _, p := range r.players {
		players = append(players, p)
	}
	r.mu.RUnlock()

	for _, p := range players {
		_ = p.Conn.SendJSON(msg)
	}
}

func (r *Room) BroadcastExcept(msg any, exceptEntityID uint16) {
	r.mu.RLock()
	players := make([]*Player, 0, len(r.players))
	for id, p := range r.players {
		if id == exceptEntityID {
			continue
		}
		players = append(players, p)
	}
	r.mu.RUnlock()

	for _, p := range players {
		_ = p.Conn.SendJSON(msg)
	}
}

func (r *Room) Stop() {
	r.once.Do(func() {
		close(r.stopCh)
	})
}

func (r *Room) IsStopped() bool {
	select {
	case <-r.stopCh:
		return true
	default:
		return false
	}
}

func (r *Room) run() {
	simTicker := time.NewTicker(33 * time.Millisecond)
	snapTicker := time.NewTicker(50 * time.Millisecond)
	defer simTicker.Stop()
	defer snapTicker.Stop()

	for {
		select {
		case <-simTicker.C:
			r.simulateTick()
		case <-snapTicker.C:
			r.sendSnapshots()
		case <-r.stopCh:
			return
		}
	}
}

func (r *Room) simulateTick() {
	r.mu.Lock()
	r.tick++
	events := make([]protocol.EventMsg, 0, 4)

	for _, player := range r.players {
		// Handle dead players: respawn timer
		if player.HP == 0 {
			player.VX = 0
			player.VY = 0
			player.State = PlayerStateDead
			if player.RespawnTimer > 0 {
				player.RespawnTimer--
			}
			if player.RespawnTimer == 0 && player.State == PlayerStateDead {
				player.HP = player.MaxHP
				player.State = 0
				player.X = player.SpawnX
				player.Y = player.SpawnY
				player.VX = 0
				player.VY = 0
				player.Flags = 1
			}
			continue
		}

		input := player.LatestInput
		moveX := input.MoveX
		moveY := input.MoveY
		magnitude := math.Sqrt(moveX*moveX + moveY*moveY)
		if magnitude > 1.0 {
			moveX /= magnitude
			moveY /= magnitude
			magnitude = 1.0
		}

		if magnitude > 0.001 {
			vx := moveX * PlayerSpeed
			vy := moveY * PlayerSpeed
			nextX, nextY, collidedX, collidedY := r.moveWithCollisionLocked(player.X, player.Y, vx*SimDeltaSec, vy*SimDeltaSec, PlayerRadius)

			// Prevent player from overlapping with other players
			for otherID, other := range r.players {
				if otherID == player.EntityID || other.HP == 0 {
					continue
				}
				pdx := nextX - other.X
				pdy := nextY - other.Y
				pdist := math.Sqrt(pdx*pdx + pdy*pdy)
				minDist := PlayerRadius * 2
				if pdist < minDist && pdist > 0.001 {
					overlap := minDist - pdist
					pushX := (pdx / pdist) * overlap * 0.5
					pushY := (pdy / pdist) * overlap * 0.5
					nextX += pushX
					nextY += pushY
				}
			}

			if r.collidesCircleLocked(nextX, nextY, PlayerRadius) {
				nextX, nextY, collidedX, collidedY = r.moveWithCollisionLocked(player.X, player.Y, vx*SimDeltaSec, vy*SimDeltaSec, PlayerRadius)
			}

			player.X = nextX
			player.Y = nextY
			player.VX = vx
			player.VY = vy
			if collidedX {
				player.VX = 0
			}
			if collidedY {
				player.VY = 0
			}
			if player.PrimaryCooldownRemaining == 0 {
				player.State = 1
			}
			updateFacingFromVector(&player.Facing, moveX, moveY)
		} else {
			player.VX = 0
			player.VY = 0
			if player.PrimaryCooldownRemaining == 0 {
				player.State = 0
			}
		}

		if player.PrimaryCooldownRemaining > 0 {
			player.PrimaryCooldownRemaining--
			if player.PrimaryCooldownRemaining == 0 {
				// Attack finished, revert to idle/moving
				if magnitude > 0.001 {
					player.State = 1
				} else {
					player.State = 0
				}
			}
		}
		if input.Primary && player.PrimaryCooldownRemaining == 0 {
			r.applyPrimaryAttackLocked(player, &events)
			player.PrimaryCooldownRemaining = PrimaryAttackCooldownTicks
			player.State = PlayerStateAttacking
		}
	}

	r.simulateEnemiesLocked(&events)
	r.mu.Unlock()

	for _, event := range events {
		r.Broadcast(event)
	}
}

func (r *Room) applyPrimaryAttackLocked(player *Player, events *[]protocol.EventMsg) {
	for _, enemy := range r.enemies {
		if enemy.Dead {
			continue
		}
		if !inPrimaryAttackArc(player, enemy) {
			continue
		}

		damage := PrimaryAttackDamage
		if enemy.HP < damage {
			damage = enemy.HP
		}
		enemy.HP -= damage
		value := int16(damage)
		targetID := enemy.EntityID
		*events = append(*events, protocol.EventMsg{
			Type:      protocol.TypeEvent,
			Tick:      r.tick,
			EventType: eventTypeDamage,
			EntityID:  player.EntityID,
			TargetID:  &targetID,
			Value:     &value,
		})

		if enemy.HP == 0 {
			enemy.Dead = true
			enemy.RespawnTimer = EnemyRespawnTicks
			enemy.Flags = 0
			enemy.VX = 0
			enemy.VY = 0
			enemy.State = 0
			*events = append(*events, protocol.EventMsg{
				Type:      protocol.TypeEvent,
				Tick:      r.tick,
				EventType: eventTypeEntityDespawn,
				EntityID:  targetID,
			})
		}
	}
}

func inPrimaryAttackArc(player *Player, enemy *Enemy) bool {
	dx := enemy.X - player.X
	dy := enemy.Y - player.Y
	distSq := dx*dx + dy*dy
	if distSq > PrimaryAttackRange*PrimaryAttackRange {
		return false
	}
	if distSq < 0.0001 {
		return true // enemy is on top of player
	}

	// Use aim angle from latest input for continuous-direction attack
	aimAngle := player.LatestInput.AimAngle
	aimDirX := math.Cos(aimAngle)
	aimDirY := math.Sin(aimAngle)

	dist := math.Sqrt(distSq)
	toEnemyX := dx / dist
	toEnemyY := dy / dist

	// Dot product gives cosine of angle between aim direction and enemy direction
	dotProduct := aimDirX*toEnemyX + aimDirY*toEnemyY
	return dotProduct >= math.Cos(PrimaryAttackConeHalfAngle)
}

func (r *Room) simulateEnemiesLocked(events *[]protocol.EventMsg) {
	for _, enemy := range r.enemies {
		// Handle respawn timer for dead enemies
		if enemy.Dead {
			if enemy.RespawnTimer > 0 {
				enemy.RespawnTimer--
			}
			if enemy.RespawnTimer == 0 {
				enemy.Dead = false
				enemy.HP = enemy.MaxHP
				enemy.Flags = 1
				enemy.X = enemy.SpawnX
				enemy.Y = enemy.SpawnY
				enemy.State = 0
				enemy.VX = 0
				enemy.VY = 0
			}
			continue
		}

		// Decrement attack cooldown
		if enemy.AttackCooldownRemaining > 0 {
			enemy.AttackCooldownRemaining--
		}

		nearest := r.findNearestPlayerLocked(enemy.X, enemy.Y)
		if nearest == nil {
			enemy.VX = 0
			enemy.VY = 0
			enemy.State = 0
			continue
		}

		dx := nearest.X - enemy.X
		dy := nearest.Y - enemy.Y
		distance := math.Sqrt(dx*dx + dy*dy)

		// Contact damage check
		if distance <= EnemyMeleeRange && enemy.AttackCooldownRemaining == 0 && nearest.HP > 0 {
			damage := enemy.ContactDamage
			if nearest.HP < damage {
				damage = nearest.HP
			}
			nearest.HP -= damage
			value := int16(damage)
			targetID := nearest.EntityID
			*events = append(*events, protocol.EventMsg{
				Type:      protocol.TypeEvent,
				Tick:      r.tick,
				EventType: eventTypeDamage,
				EntityID:  enemy.EntityID,
				TargetID:  &targetID,
				Value:     &value,
			})
			enemy.AttackCooldownRemaining = EnemyAttackCooldownTicks
			if nearest.HP == 0 {
				nearest.State = PlayerStateDead
				nearest.RespawnTimer = PlayerRespawnTicks
			}
		}

		if distance <= 0.001 || distance > EnemyAggroRng {
			enemy.VX = 0
			enemy.VY = 0
			enemy.State = 0
			continue
		}

		dirX := dx / distance
		dirY := dy / distance
		vx := dirX * enemy.Speed
		vy := dirY * enemy.Speed
		nextX, nextY, collidedX, collidedY := r.moveWithCollisionLocked(enemy.X, enemy.Y, vx*SimDeltaSec, vy*SimDeltaSec, EnemyRadius)

		// Prevent enemy from overlapping with players
		for _, player := range r.players {
			if player.HP == 0 {
				continue
			}
			pdx := nextX - player.X
			pdy := nextY - player.Y
			pdist := math.Sqrt(pdx*pdx + pdy*pdy)
			minDist := EnemyRadius + PlayerRadius
			if pdist < minDist && pdist > 0.001 {
				overlap := minDist - pdist
				pushX := (pdx / pdist) * overlap
				pushY := (pdy / pdist) * overlap
				nextX += pushX
				nextY += pushY
			}
		}

		// Prevent enemy from overlapping with other enemies
		for otherID, other := range r.enemies {
			if otherID == enemy.EntityID || other.Dead {
				continue
			}
			edx := nextX - other.X
			edy := nextY - other.Y
			edist := math.Sqrt(edx*edx + edy*edy)
			minDist := EnemyRadius * 2
			if edist < minDist && edist > 0.001 {
				overlap := minDist - edist
				pushX := (edx / edist) * overlap * 0.5
				pushY := (edy / edist) * overlap * 0.5
				nextX += pushX
				nextY += pushY
			}
		}

		// Re-check wall collision after separation pushes
		if r.collidesCircleLocked(nextX, nextY, EnemyRadius) {
			// Separation pushed us into a wall — revert to pre-separation position
			nextX, nextY, _, _ = r.moveWithCollisionLocked(enemy.X, enemy.Y, vx*SimDeltaSec, vy*SimDeltaSec, EnemyRadius)
		}

		enemy.X = nextX
		enemy.Y = nextY
		enemy.VX = vx
		enemy.VY = vy
		if collidedX {
			enemy.VX = 0
		}
		if collidedY {
			enemy.VY = 0
		}
		enemy.State = 1
		updateFacingFromVector(&enemy.Facing, dirX, dirY)
	}
}

func (r *Room) findNearestPlayerLocked(x, y float64) *Player {
	var nearest *Player
	nearestDistSq := math.MaxFloat64
	for _, player := range r.players {
		if player.HP == 0 {
			continue
		}
		dx := player.X - x
		dy := player.Y - y
		distSq := dx*dx + dy*dy
		if distSq < nearestDistSq {
			nearestDistSq = distSq
			nearest = player
		}
	}
	return nearest
}

func updateFacingFromVector(facing *uint8, moveX, moveY float64) {
	if math.Abs(moveX) >= math.Abs(moveY) {
		if moveX > 0 {
			*facing = 3
		} else {
			*facing = 2
		}
		return
	}
	if moveY > 0 {
		*facing = 0
	} else {
		*facing = 1
	}
}

func (r *Room) moveWithCollisionLocked(x, y, dx, dy, radius float64) (float64, float64, bool, bool) {
	nextX := clamp(x+dx, radius, r.worldWidth-radius)
	nextY := y
	collidedX := false
	if r.collidesCircleLocked(nextX, nextY, radius) {
		nextX = x
		collidedX = true
	}

	nextY = clamp(y+dy, radius, r.worldHeight-radius)
	collidedY := false
	if r.collidesCircleLocked(nextX, nextY, radius) {
		nextY = y
		collidedY = true
	}

	return nextX, nextY, collidedX, collidedY
}

func (r *Room) collidesCircleLocked(cx, cy, radius float64) bool {
	for _, rect := range r.collisions {
		if circleIntersectsRect(cx, cy, radius, rect) {
			return true
		}
	}
	return false
}

func circleIntersectsRect(cx, cy, radius float64, rect collisionRect) bool {
	closestX := clamp(cx, rect.X, rect.X+rect.Width)
	closestY := clamp(cy, rect.Y, rect.Y+rect.Height)
	dx := cx - closestX
	dy := cy - closestY
	return dx*dx+dy*dy < radius*radius
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func (r *Room) buildEntityDeltasLocked() []protocol.EntityDelta {
	playerIDs := make([]int, 0, len(r.players))
	for id := range r.players {
		playerIDs = append(playerIDs, int(id))
	}
	sort.Ints(playerIDs)

	enemyIDs := make([]int, 0, len(r.enemies))
	for id := range r.enemies {
		enemyIDs = append(enemyIDs, int(id))
	}
	sort.Ints(enemyIDs)

	deltas := make([]protocol.EntityDelta, 0, len(playerIDs)+len(enemyIDs))
	for _, id := range playerIDs {
		deltas = append(deltas, buildEntityDeltaFromPlayer(r.players[uint16(id)]))
	}
	for _, id := range enemyIDs {
		deltas = append(deltas, buildEntityDeltaFromEnemy(r.enemies[uint16(id)]))
	}

	return deltas
}

func buildEntityDeltaFromPlayer(player *Player) protocol.EntityDelta {
	entityType := uint8(0)
	posX := int16(math.Round(player.X))
	posY := int16(math.Round(player.Y))
	velX := int16(math.Round(player.VX * 100.0 / PlayerSpeed))
	velY := int16(math.Round(player.VY * 100.0 / PlayerSpeed))
	facing := player.Facing
	state := player.State
	hp := player.HP
	maxHP := player.MaxHP
	flags := player.Flags
	animFrame := uint8(0)

	return protocol.EntityDelta{
		ID:        player.EntityID,
		Type:      &entityType,
		X:         &posX,
		Y:         &posY,
		VX:        &velX,
		VY:        &velY,
		Facing:    &facing,
		State:     &state,
		HP:        &hp,
		MaxHP:     &maxHP,
		Flags:     &flags,
		AnimFrame: &animFrame,
	}
}

func buildEntityDeltaFromEnemy(enemy *Enemy) protocol.EntityDelta {
	entityType := enemyType
	posX := int16(math.Round(enemy.X))
	posY := int16(math.Round(enemy.Y))
	velX := int16(math.Round(enemy.VX * 100.0 / PlayerSpeed))
	velY := int16(math.Round(enemy.VY * 100.0 / PlayerSpeed))
	facing := enemy.Facing
	state := enemy.State
	hp := enemy.HP
	maxHP := enemy.MaxHP
	flags := enemy.Flags
	animFrame := uint8(0)

	return protocol.EntityDelta{
		ID:        enemy.EntityID,
		Type:      &entityType,
		X:         &posX,
		Y:         &posY,
		VX:        &velX,
		VY:        &velY,
		Facing:    &facing,
		State:     &state,
		HP:        &hp,
		MaxHP:     &maxHP,
		Flags:     &flags,
		AnimFrame: &animFrame,
	}
}

func (r *Room) sendSnapshots() {
	r.mu.RLock()
	players := make([]*Player, 0, len(r.players))
	for _, p := range r.players {
		players = append(players, p)
	}
	tick := r.tick
	entities := r.buildEntityDeltasLocked()
	r.mu.RUnlock()

	for _, p := range players {
		snapshot := protocol.WorldSnapshotMsg{
			Type:     protocol.TypeWorldSnapshot,
			Tick:     tick,
			AckSeq:   p.LastAppliedSeq,
			Entities: entities,
		}
		_ = p.Conn.SendJSON(snapshot)
	}
}

func (r *Room) nextEntityIDLocked() uint16 {
	for i := uint16(1); i <= MaxPlayers; i++ {
		if _, exists := r.players[i]; !exists {
			return i
		}
	}
	return 0
}

func (r *Room) playerSpawnForSlotLocked(slot int) (float64, float64) {
	if len(r.playerSpawns) == 0 {
		if slot < 0 || slot >= len(fallbackSpawnPositions) {
			slot = 0
		}
		return fallbackSpawnPositions[slot][0], fallbackSpawnPositions[slot][1]
	}

	spawn := r.playerSpawns[slot%len(r.playerSpawns)]
	offsets := [MaxPlayers][2]float64{{0, 0}, {20, 0}, {0, 20}}
	offset := offsets[slot%MaxPlayers]
	x := clamp(spawn.X+offset[0], PlayerRadius, r.worldWidth-PlayerRadius)
	y := clamp(spawn.Y+offset[1], PlayerRadius, r.worldHeight-PlayerRadius)
	return x, y
}

// enemyArchetype defines stats for an enemy variant.
type enemyArchetype struct {
	Speed         float64
	HP            uint8
	ContactDamage uint8
}

var enemyArchetypes = []enemyArchetype{
	{Speed: EnemySpeed, HP: 100, ContactDamage: EnemyContactDamage},  // standard
	{Speed: 80, HP: 60, ContactDamage: 10},                            // fast
	{Speed: 32, HP: 200, ContactDamage: 25},                          // tank
}

func (r *Room) initEnemies(spawns []spawnPoint) {
	for i, spawn := range spawns {
		id := uint16(1000 + i)
		sx := clamp(spawn.X, EnemyRadius, r.worldWidth-EnemyRadius)
		sy := clamp(spawn.Y, EnemyRadius, r.worldHeight-EnemyRadius)
		archetype := enemyArchetypes[i%len(enemyArchetypes)]
		r.enemies[id] = &Enemy{
			EntityID:      id,
			X:             sx,
			Y:             sy,
			Facing:        spawn.Facing,
			State:         0,
			HP:            archetype.HP,
			MaxHP:         archetype.HP,
			Flags:         1,
			SpawnX:        sx,
			SpawnY:        sy,
			Speed:         archetype.Speed,
			ContactDamage: archetype.ContactDamage,
		}
	}
}

func fallbackRuntimeMap() mapRuntime {
	players := make([]spawnPoint, 0, len(fallbackSpawnPositions))
	for _, spawn := range fallbackSpawnPositions {
		players = append(players, spawnPoint{X: spawn[0], Y: spawn[1], Facing: 0})
	}
	return mapRuntime{
		WidthPx:      800,
		HeightPx:     600,
		PlayerSpawns: players,
	}
}

type tiledMap struct {
	Width      int          `json:"width"`
	Height     int          `json:"height"`
	TileWidth  int          `json:"tilewidth"`
	TileHeight int          `json:"tileheight"`
	Layers     []tiledLayer `json:"layers"`
}

type tiledLayer struct {
	Name    string        `json:"name"`
	Type    string        `json:"type"`
	Objects []tiledObject `json:"objects"`
}

type tiledObject struct {
	Type       string          `json:"type"`
	X          float64         `json:"x"`
	Y          float64         `json:"y"`
	Width      float64         `json:"width"`
	Height     float64         `json:"height"`
	Properties []tiledProperty `json:"properties"`
}

type tiledProperty struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Value any    `json:"value"`
}

func loadStarterRoomRuntime() (mapRuntime, bool) {
	// Try MAP_DIR env var first (for Docker), then working directory, then runtime.Caller fallback
	mapDir := os.Getenv("MAP_DIR")
	if mapDir == "" {
		// Try relative to working directory (works with `go run` from backend/)
		candidates := []string{
			"../assets/maps/dungeon-large.json",
			"assets/maps/dungeon-large.json",
		}
		for _, candidate := range candidates {
			if _, err := os.Stat(candidate); err == nil {
				mapDir = filepath.Dir(candidate)
				break
			}
		}
	}

	var mapPath string
	if mapDir != "" {
		mapPath = filepath.Join(mapDir, "dungeon-large.json")
	} else {
		// Last resort: runtime.Caller-based path (works when running compiled binary from project root)
		_, currentFile, _, ok := runtime.Caller(0)
		if !ok {
			return mapRuntime{}, false
		}
		mapPath = filepath.Clean(filepath.Join(filepath.Dir(currentFile), "../../../assets/maps/dungeon-large.json"))
	}
	data, err := os.ReadFile(mapPath)
	if err != nil {
		return mapRuntime{}, false
	}

	var tm tiledMap
	if err := json.Unmarshal(data, &tm); err != nil {
		return mapRuntime{}, false
	}

	runtimeMap := mapRuntime{
		WidthPx:      float64(tm.Width * tm.TileWidth),
		HeightPx:     float64(tm.Height * tm.TileHeight),
		Collisions:   make([]collisionRect, 0, 8),
		PlayerSpawns: make([]spawnPoint, 0, 4),
		EnemySpawns:  make([]spawnPoint, 0, 8),
	}

	for _, layer := range tm.Layers {
		if layer.Type != "objectgroup" {
			continue
		}
		switch layer.Name {
		case "Collision":
			for _, obj := range layer.Objects {
				if !isCollidable(obj.Properties) {
					continue
				}
				runtimeMap.Collisions = append(runtimeMap.Collisions, collisionRect{
					X:      obj.X,
					Y:      obj.Y,
					Width:  obj.Width,
					Height: obj.Height,
				})
			}
		case "Spawns":
			for _, obj := range layer.Objects {
				spawnType := objectSpawnType(obj)
				spawn := spawnPoint{X: obj.X, Y: obj.Y, Facing: parseFacing(obj.Properties)}
				switch spawnType {
				case "player":
					runtimeMap.PlayerSpawns = append(runtimeMap.PlayerSpawns, spawn)
				case "enemy":
					runtimeMap.EnemySpawns = append(runtimeMap.EnemySpawns, spawn)
				}
			}
		}
	}

	if runtimeMap.WidthPx <= 0 || runtimeMap.HeightPx <= 0 {
		return mapRuntime{}, false
	}
	return runtimeMap, true
}

func isCollidable(properties []tiledProperty) bool {
	for _, prop := range properties {
		if prop.Name != "collidable" {
			continue
		}
		value, ok := prop.Value.(bool)
		return ok && value
	}
	return false
}

func objectSpawnType(obj tiledObject) string {
	for _, prop := range obj.Properties {
		if prop.Name == "spawn_type" {
			if value, ok := prop.Value.(string); ok {
				return value
			}
		}
	}
	return obj.Type
}

func parseFacing(properties []tiledProperty) uint8 {
	for _, prop := range properties {
		if prop.Name != "facing" {
			continue
		}
		value, ok := prop.Value.(string)
		if !ok {
			continue
		}
		switch value {
		case "up":
			return 1
		case "left":
			return 2
		case "right":
			return 3
		}
	}
	return 0
}
