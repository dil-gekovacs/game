package game

import (
	"math"
	"testing"

	"game/backend/internal/protocol"
)

// mockConn implements PlayerConn for testing.
type mockConn struct {
	messages []any
	closed   bool
}

func (m *mockConn) SendJSON(msg any) error {
	m.messages = append(m.messages, msg)
	return nil
}

func (m *mockConn) Close() error {
	m.closed = true
	return nil
}

func newTestRoom() *Room {
	room := NewRoom("test-room")
	room.Stop()
	return room
}

func TestAddPlayer_SpawnPositions(t *testing.T) {
	room := newTestRoom()

	tests := []struct {
		name   string
		wantX  float64
		wantY  float64
		wantHP uint8
	}{
		{name: "player1", wantX: 32, wantY: 56, wantHP: 200},
		{name: "player2", wantX: 60, wantY: 80, wantHP: 200},
		{name: "player3", wantX: 32, wantY: 124, wantHP: 200},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			conn := &mockConn{}
			player, _, ok := room.AddPlayer(tt.name, conn)
			if !ok {
				t.Fatal("expected AddPlayer to succeed")
			}
			if player.X != tt.wantX {
				t.Errorf("X = %v, want %v", player.X, tt.wantX)
			}
			if player.Y != tt.wantY {
				t.Errorf("Y = %v, want %v", player.Y, tt.wantY)
			}
			if player.HP != tt.wantHP {
				t.Errorf("HP = %v, want %v", player.HP, tt.wantHP)
			}
			if player.Flags != 1 {
				t.Errorf("Flags = %v, want 1 (visible)", player.Flags)
			}
		})
	}
}

func TestAddPlayer_MaxCapacity(t *testing.T) {
	room := newTestRoom()

	for i := 0; i < MaxPlayers; i++ {
		conn := &mockConn{}
		_, _, ok := room.AddPlayer("player"+string(rune('A'+i)), conn)
		if !ok {
			t.Fatalf("expected player %d to join", i+1)
		}
	}

	conn := &mockConn{}
	_, _, ok := room.AddPlayer("player4", conn)
	if ok {
		t.Error("expected 4th player to be rejected")
	}
}

func TestApplyInput_UpdatesLatestInput(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	input := PlayerInput{MoveX: 1.0, MoveY: 0.0, Seq: 5, Tick: 100}
	room.ApplyInput(player.EntityID, input)

	room.mu.RLock()
	defer room.mu.RUnlock()
	p := room.players[player.EntityID]
	if p.LastAppliedSeq != 5 {
		t.Errorf("LastAppliedSeq = %v, want 5", p.LastAppliedSeq)
	}
	if p.LatestInput.MoveX != 1.0 {
		t.Errorf("LatestInput.MoveX = %v, want 1.0", p.LatestInput.MoveX)
	}
}

func TestSimulateTick_MovesPlayer(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	startX := player.X
	room.ApplyInput(player.EntityID, PlayerInput{MoveX: 1.0, MoveY: 0.0, Seq: 1})
	room.simulateTick()

	room.mu.RLock()
	p := room.players[player.EntityID]
	newX := p.X
	state := p.State
	facing := p.Facing
	room.mu.RUnlock()

	expectedDelta := 1.0 * PlayerSpeed * SimDeltaSec
	if math.Abs(newX-startX-expectedDelta) > 0.001 {
		t.Errorf("X moved by %v, want %v", newX-startX, expectedDelta)
	}
	if state != 1 {
		t.Errorf("State = %v, want 1 (Moving)", state)
	}
	if facing != 3 {
		t.Errorf("Facing = %v, want 3 (Right)", facing)
	}
}

func TestSimulateTick_ClampsToWorldBounds(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	room.mu.Lock()
	room.players[player.EntityID].X = room.worldWidth - PlayerRadius
	room.mu.Unlock()

	room.ApplyInput(player.EntityID, PlayerInput{MoveX: 1.0, MoveY: 0.0, Seq: 1})
	room.simulateTick()

	room.mu.RLock()
	posX := room.players[player.EntityID].X
	room.mu.RUnlock()

	if posX > room.worldWidth-PlayerRadius {
		t.Errorf("X = %v, should be clamped to <= %v", posX, room.worldWidth-PlayerRadius)
	}
}

func TestSnapshotFor_ContainsEntities(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	snapshot := room.SnapshotFor(player.EntityID)
	if len(snapshot.Entities) < 2 {
		t.Fatalf("expected player + enemy entities, got %d", len(snapshot.Entities))
	}

	foundPlayer := false
	foundEnemy := false
	for _, entity := range snapshot.Entities {
		if entity.ID == player.EntityID {
			foundPlayer = true
		}
		if entity.Type != nil && *entity.Type == enemyType {
			foundEnemy = true
		}
	}
	if !foundPlayer || !foundEnemy {
		t.Fatalf("expected both player and enemy in snapshot, player=%v enemy=%v", foundPlayer, foundEnemy)
	}
}

func TestSimulateTick_NormalizesDiagonalInput(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	startX := player.X
	startY := player.Y

	room.ApplyInput(player.EntityID, PlayerInput{MoveX: 1.0, MoveY: 1.0, Seq: 1})
	room.simulateTick()

	room.mu.RLock()
	p := room.players[player.EntityID]
	dx := p.X - startX
	dy := p.Y - startY
	room.mu.RUnlock()

	actualSpeed := math.Sqrt(dx*dx+dy*dy) / SimDeltaSec
	if math.Abs(actualSpeed-PlayerSpeed) > 1.0 {
		t.Errorf("diagonal speed = %v, want ~%v", actualSpeed, PlayerSpeed)
	}
}

func TestPlayerRespawn_AfterDeath(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	spawnX := player.SpawnX
	spawnY := player.SpawnY

	// Kill the player
	room.mu.Lock()
	room.players[player.EntityID].HP = 0
	room.players[player.EntityID].State = PlayerStateDead
	room.players[player.EntityID].RespawnTimer = 3
	room.players[player.EntityID].X = 999
	room.players[player.EntityID].Y = 999
	room.mu.Unlock()

	// Tick 3 times to count down the respawn timer
	room.simulateTick()
	room.simulateTick()
	room.simulateTick()

	room.mu.RLock()
	p := room.players[player.EntityID]
	if p.HP != p.MaxHP {
		t.Errorf("HP = %v, want %v (MaxHP)", p.HP, p.MaxHP)
	}
	if p.State == PlayerStateDead {
		t.Error("expected player to no longer be dead after respawn")
	}
	if p.X != spawnX || p.Y != spawnY {
		t.Errorf("position = (%v, %v), want spawn (%v, %v)", p.X, p.Y, spawnX, spawnY)
	}
	room.mu.RUnlock()
}

func TestAimDirectionAttack_HitsEnemyInAimCone(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	room.mu.Lock()
	// Place one enemy directly above the player
	for _, enemy := range room.enemies {
		enemy.X = player.X
		enemy.Y = player.Y - 20
		enemy.HP = 100
		break
	}
	room.mu.Unlock()

	// Aim upward: angle = -PI/2 = 3*PI/2 in [0, 2PI)
	aimAngle := 3 * math.Pi / 2
	room.ApplyInput(player.EntityID, PlayerInput{Primary: true, Seq: 1, AimAngle: aimAngle})
	room.simulateTick()

	foundDamage := false
	for _, msg := range conn.messages {
		event, ok := msg.(protocol.EventMsg)
		if !ok {
			continue
		}
		if event.EventType == eventTypeDamage {
			foundDamage = true
		}
	}
	if !foundDamage {
		t.Error("expected aim-direction attack to hit enemy above player")
	}
}

func TestEnemyVariety_DifferentStats(t *testing.T) {
	room := newTestRoom()

	room.mu.RLock()
	speeds := make(map[float64]bool)
	hps := make(map[uint8]bool)
	for _, enemy := range room.enemies {
		speeds[enemy.Speed] = true
		hps[enemy.MaxHP] = true
	}
	room.mu.RUnlock()

	if len(room.enemies) >= 3 && len(speeds) < 2 {
		t.Errorf("expected different enemy speeds, got %d unique values", len(speeds))
	}
}

func TestPlayerAttackState_SetDuringCooldown(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	room.ApplyInput(player.EntityID, PlayerInput{Primary: true, Seq: 1, AimAngle: 0})
	room.simulateTick()

	room.mu.RLock()
	state := room.players[player.EntityID].State
	cooldown := room.players[player.EntityID].PrimaryCooldownRemaining
	room.mu.RUnlock()

	if state != PlayerStateAttacking {
		t.Errorf("State = %v, want %v (Attacking)", state, PlayerStateAttacking)
	}
	if cooldown == 0 {
		t.Error("expected cooldown to be non-zero after attack")
	}
}

func TestPrimaryAttack_DamageAndKillEvents(t *testing.T) {
	room := newTestRoom()

	conn := &mockConn{}
	player, _, ok := room.AddPlayer("p1", conn)
	if !ok {
		t.Fatal("expected AddPlayer to succeed")
	}

	room.mu.Lock()
	for _, enemy := range room.enemies {
		enemy.X = player.X + 20
		enemy.Y = player.Y
		enemy.HP = PrimaryAttackDamage
	}
	room.players[player.EntityID].Facing = 3
	room.mu.Unlock()

	// AimAngle=0 aims right (+X direction), matching enemy placement
	room.ApplyInput(player.EntityID, PlayerInput{Primary: true, Seq: 1, AimAngle: 0})
	room.simulateTick()

	room.mu.RLock()
	aliveCount := 0
	for _, enemy := range room.enemies {
		if !enemy.Dead {
			aliveCount++
		}
	}
	room.mu.RUnlock()
	if aliveCount != 0 {
		t.Fatalf("expected all enemies to be dead, alive=%d", aliveCount)
	}

	foundDamage := false
	foundDespawn := false
	for _, msg := range conn.messages {
		event, ok := msg.(protocol.EventMsg)
		if !ok {
			continue
		}
		if event.EventType == eventTypeDamage {
			foundDamage = true
		}
		if event.EventType == eventTypeEntityDespawn {
			foundDespawn = true
		}
	}
	if !foundDamage || !foundDespawn {
		t.Fatalf("expected damage and despawn events, damage=%v despawn=%v", foundDamage, foundDespawn)
	}
}
