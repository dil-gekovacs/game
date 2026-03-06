# Prison Labyrinth ASCII Map Analysis

## ASCII Map (40x30 tiles, 16px per tile = 640x480 pixels)

```
     0         1         2         3         
     0123456789012345678901234567890123456789
   0 ########################################
   1 #.........##############################
   2 #.T.....T.##############################
   3 #..P.P....##############################
   4 #......E...#############################
   5 #..P.P.....#############################
   6 #.......E.##############################
   7 #.........##############################
   8 ########################################
   9 ##############.###########..############
  10 #......#....##.#T.......T####.T.......T#
  11 #...E..#.E..##.#.........####..........#
  12 #.....S......#.#...E.....####....E.....#
  13 ##############.#..#....#.#.............#
  14 ###############..........#..........E..#
  15 #.T.....T......T..........###..........#
  16 #....................E....###..........#
  17 #........................###############
  18 ################.........########.######
  19 ##############.#..#....#.##T...#..#....#
  20 #......#....##.#.E.......##..E.#..#....#
  21 #...E..#.E..##.#T.......T##....#..#.E..#
  22 #..S...#..S.##.####################....#
  23 ##############.################........#
  24 ###############...............##########
  25 ##############.#################..E....#
  26 #################################S######
  27 ########################################
  28 #####################################S##
  29 ########################################
     0123456789012345678901234567890123456789
```

## Legend

| Symbol | Meaning |
|--------|---------|
| `#` | Wall (collision) |
| `.` | Floor (walkable) |
| `P` | Player spawn |
| `E` | Enemy spawn |
| `T` | Torch decoration |
| `S` | Skeleton decoration |

## Room Labels and Boundaries

### Connected Regions (flood fill)

**Region 1: Guard Room (Player Start)** (65 tiles)
- Bounds: tiles (1,1) to (10,7)
- Spawns: player_spawn_1, player_spawn_2, player_spawn_3, player_spawn_4, enemy_guard_1, enemy_guard_2, deco_torch_guardroom_1, deco_torch_guardroom_2

**Region 2: Passage at (14,9)-(14,13)** (5 tiles)
- Bounds: tiles (14,9) to (14,13)
- Adjacent (1 wall tile away): North Cell Block, Main Connected Area (Corridors + Interrogation Chamber)

**Region 3: Passage at (26,9)-(27,9)** (2 tiles)
- Bounds: tiles (26,9) to (27,9)

**Region 4: North Cell Block** (32 tiles)
- Bounds: tiles (1,10) to (12,12)
- Spawns: enemy_ncell_1, enemy_ncell_2, deco_skeleton_ncell_1
- Adjacent (1 wall tile away): Passage at (14,9)-(14,13)

**Region 5: Main Connected Area (Corridors + Interrogation Chamber)** (152 tiles)
- Bounds: tiles (1,10) to (25,21)
- Spawns: enemy_interrog_1, enemy_interrog_2, enemy_interrog_3, deco_torch_corridor_w, deco_torch_corridor_c1, deco_torch_corridor_c2, deco_torch_interrog_nw, deco_torch_interrog_ne, deco_torch_interrog_sw, deco_torch_interrog_se
- Adjacent (1 wall tile away): Passage at (14,9)-(14,13), Warden's Office, Passage at (14,19)-(14,23)

**Region 6: Warden's Office** (76 tiles)
- Bounds: tiles (26,10) to (38,16)
- Spawns: enemy_warden_1, enemy_warden_2, deco_torch_warden_1, deco_torch_warden_2
- Adjacent (1 wall tile away): Main Connected Area (Corridors + Interrogation Chamber), Passage at (32,18)-(33,21)

**Region 7: Passage at (32,18)-(33,21)** (7 tiles)
- Bounds: tiles (32,18) to (33,21)
- Adjacent (1 wall tile away): Escape Tunnel (West), Escape Tunnel (East), Warden's Office

**Region 8: Passage at (14,19)-(14,23)** (5 tiles)
- Bounds: tiles (14,19) to (14,23)
- Adjacent (1 wall tile away): Main Connected Area (Corridors + Interrogation Chamber), Passage at (14,25)-(14,25)

**Region 9: Escape Tunnel (West)** (12 tiles)
- Bounds: tiles (27,19) to (30,21)
- Spawns: enemy_escape_1, deco_torch_escape_1
- Adjacent (1 wall tile away): Passage at (32,18)-(33,21)

**Region 10: Escape Tunnel (East)** (24 tiles)
- Bounds: tiles (31,19) to (38,23)
- Spawns: enemy_escape_2
- Adjacent (1 wall tile away): Passage at (32,18)-(33,21), Oubliette

**Region 11: South Cell 1** (18 tiles)
- Bounds: tiles (1,20) to (6,22)
- Spawns: enemy_scell_1, deco_skeleton_scell_1
- Adjacent (1 wall tile away): South Cell 2

**Region 12: South Cell 2** (12 tiles)
- Bounds: tiles (8,20) to (11,22)
- Spawns: enemy_scell_2, deco_skeleton_scell_2
- Adjacent (1 wall tile away): South Cell 1

**Region 13: Passage at (15,24)-(29,24)** (15 tiles)
- Bounds: tiles (15,24) to (29,24)

**Region 14: Passage at (14,25)-(14,25)** (1 tiles)
- Bounds: tiles (14,25) to (14,25)
- Adjacent (1 wall tile away): Passage at (14,19)-(14,23)

**Region 15: Oubliette** (8 tiles)
- Bounds: tiles (32,25) to (38,26)
- Spawns: enemy_oubliette, deco_skeleton_oubliette_1
- Adjacent (1 wall tile away): Escape Tunnel (East)

**Region 16: Oubliette Skeleton Nook** (1 tiles)
- Bounds: tiles (37,28) to (37,28)
- Spawns: deco_skeleton_oubliette_2

## Entrance Analysis

### How rooms connect (walkable adjacency)

The flood fill found **16 disconnected regions**. Only tiles within the same
region can be reached from each other by walking. Regions separated by
walls with no gap are unreachable from each other.

### Detailed Room-by-Room Entrance Check

**Guard Room (Player Start)** (Region 1):

**Passage at (14,9)-(14,13)** (Region 2):
  - Separated from Region 5 (Main Connected Area (Corridors + Interrogation Chamber)) by thin wall: wall@(15,12) direction E, wall@(15,13) direction E, wall@(14,14) direction S, wall@(15,10) direction E, wall@(15,11) direction E
  - Separated from Region 4 (North Cell Block) by thin wall: wall@(13,12) direction W

**Passage at (26,9)-(27,9)** (Region 3):

**North Cell Block** (Region 4):
  - Separated from Region 2 (Passage at (14,9)-(14,13)) by thin wall: wall@(13,12) direction E

**Main Connected Area (Corridors + Interrogation Chamber)** (Region 5):
  - Separated from Region 8 (Passage at (14,19)-(14,23)) by thin wall: wall@(14,18) direction S, wall@(15,19) direction W, wall@(15,21) direction W, wall@(15,20) direction W
  - Separated from Region 2 (Passage at (14,9)-(14,13)) by thin wall: wall@(15,10) direction W, wall@(15,12) direction W, wall@(15,13) direction W, wall@(14,14) direction N, wall@(15,11) direction W
  - Separated from Region 6 (Warden's Office) by thin wall: wall@(25,13) direction E, wall@(25,14) direction E
  - This is the MAIN connected area

**Warden's Office** (Region 6):
  - Separated from Region 5 (Main Connected Area (Corridors + Interrogation Chamber)) by thin wall: wall@(25,13) direction W, wall@(25,14) direction W
  - Separated from Region 7 (Passage at (32,18)-(33,21)) by thin wall: wall@(33,17) direction S

**Passage at (32,18)-(33,21)** (Region 7):
  - Separated from Region 6 (Warden's Office) by thin wall: wall@(33,17) direction N
  - Separated from Region 10 (Escape Tunnel (East)) by thin wall: wall@(34,19) direction E, wall@(32,22) direction S, wall@(34,21) direction E, wall@(33,22) direction S, wall@(34,20) direction E
  - Separated from Region 9 (Escape Tunnel (West)) by thin wall: wall@(31,20) direction W, wall@(31,19) direction W, wall@(31,21) direction W

**Passage at (14,19)-(14,23)** (Region 8):
  - Separated from Region 5 (Main Connected Area (Corridors + Interrogation Chamber)) by thin wall: wall@(15,20) direction E, wall@(14,18) direction N, wall@(15,19) direction E, wall@(15,21) direction E
  - Separated from Region 14 (Passage at (14,25)-(14,25)) by thin wall: wall@(14,24) direction S

**Escape Tunnel (West)** (Region 9):
  - Separated from Region 7 (Passage at (32,18)-(33,21)) by thin wall: wall@(31,19) direction E, wall@(31,21) direction E, wall@(31,20) direction E

**Escape Tunnel (East)** (Region 10):
  - Separated from Region 7 (Passage at (32,18)-(33,21)) by thin wall: wall@(33,22) direction N, wall@(34,21) direction W, wall@(32,22) direction N, wall@(34,19) direction W, wall@(34,20) direction W
  - Separated from Region 15 (Oubliette) by thin wall: wall@(37,24) direction S, wall@(35,24) direction S, wall@(36,24) direction S, wall@(34,24) direction S, wall@(33,24) direction S

**South Cell 1** (Region 11):
  - Separated from Region 12 (South Cell 2) by thin wall: wall@(7,22) direction E, wall@(7,21) direction E, wall@(7,20) direction E

**South Cell 2** (Region 12):
  - Separated from Region 11 (South Cell 1) by thin wall: wall@(7,21) direction W, wall@(7,20) direction W, wall@(7,22) direction W

**Passage at (15,24)-(29,24)** (Region 13):

**Passage at (14,25)-(14,25)** (Region 14):
  - Separated from Region 8 (Passage at (14,19)-(14,23)) by thin wall: wall@(14,24) direction N

**Oubliette** (Region 15):
  - Separated from Region 10 (Escape Tunnel (East)) by thin wall: wall@(35,24) direction N, wall@(38,24) direction N, wall@(33,24) direction N, wall@(37,24) direction N, wall@(36,24) direction N

**Oubliette Skeleton Nook** (Region 16):

## Unreachable Rooms

The main playable area is **Region 5: Main Connected Area (Corridors + Interrogation Chamber)** (152 tiles).

The following rooms are **DISCONNECTED** from the main area and unreachable:

- **Guard Room (Player Start)** (65 tiles) - spawns: player_spawn_1, player_spawn_2, player_spawn_3, player_spawn_4, enemy_guard_1, enemy_guard_2, deco_torch_guardroom_1, deco_torch_guardroom_2
- **Passage at (14,9)-(14,13)** (5 tiles) - spawns: none
- **Passage at (26,9)-(27,9)** (2 tiles) - spawns: none
- **North Cell Block** (32 tiles) - spawns: enemy_ncell_1, enemy_ncell_2, deco_skeleton_ncell_1
- **Warden's Office** (76 tiles) - spawns: enemy_warden_1, enemy_warden_2, deco_torch_warden_1, deco_torch_warden_2
- **Passage at (32,18)-(33,21)** (7 tiles) - spawns: none
- **Passage at (14,19)-(14,23)** (5 tiles) - spawns: none
- **Escape Tunnel (West)** (12 tiles) - spawns: enemy_escape_1, deco_torch_escape_1
- **Escape Tunnel (East)** (24 tiles) - spawns: enemy_escape_2
- **South Cell 1** (18 tiles) - spawns: enemy_scell_1, deco_skeleton_scell_1
- **South Cell 2** (12 tiles) - spawns: enemy_scell_2, deco_skeleton_scell_2
- **Passage at (15,24)-(29,24)** (15 tiles) - spawns: none
- **Passage at (14,25)-(14,25)** (1 tiles) - spawns: none
- **Oubliette** (8 tiles) - spawns: enemy_oubliette, deco_skeleton_oubliette_1
- **Oubliette Skeleton Nook** (1 tiles) - spawns: deco_skeleton_oubliette_2

## Summary

- Total walkable regions: 16
- Main connected area: 152 tiles
- Disconnected areas: 15

### CRITICAL ISSUES

- **Guard Room (Player Start)**: Contains gameplay spawns (player_spawn_1, player_spawn_2, player_spawn_3, player_spawn_4, enemy_guard_1, enemy_guard_2, deco_torch_guardroom_1, deco_torch_guardroom_2) but is unreachable!
- **North Cell Block**: Contains gameplay spawns (enemy_ncell_1, enemy_ncell_2, deco_skeleton_ncell_1) but is unreachable!
- **Warden's Office**: Contains gameplay spawns (enemy_warden_1, enemy_warden_2, deco_torch_warden_1, deco_torch_warden_2) but is unreachable!
- **Escape Tunnel (West)**: Contains gameplay spawns (enemy_escape_1, deco_torch_escape_1) but is unreachable!
- **Escape Tunnel (East)**: Contains gameplay spawns (enemy_escape_2) but is unreachable!
- **South Cell 1**: Contains gameplay spawns (enemy_scell_1, deco_skeleton_scell_1) but is unreachable!
- **South Cell 2**: Contains gameplay spawns (enemy_scell_2, deco_skeleton_scell_2) but is unreachable!
- **Oubliette**: Contains gameplay spawns (enemy_oubliette, deco_skeleton_oubliette_1) but is unreachable!

### Root Cause Analysis

The map has vertical connector corridors at tile column x=14 (pixels x=224-240)
that serve as passages between the west cell blocks and the central area.
However, these corridors are isolated 1-tile-wide vertical strips that don't
connect to the rooms on either side. Each major area (Guard Room, North Cells,
South Cells, Central Corridor, etc.) is walled off with no gap.

Key missing connections:
- Guard Room has no exit (east wall is solid at row 8)
- North Cell Block has no entrance from the corridor above/below
- South Cell Block has no entrance from the corridor above
- The vertical passages at x=14 don't connect to anything on east or west side
- Warden's Office is separated from Interrogation Chamber
- Escape Tunnel west section doesn't connect to east section
- Oubliette is completely sealed
