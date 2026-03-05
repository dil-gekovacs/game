# Scrolling Map Camera System — Implementation Plan

## Summary
Replace the current fit-to-viewport static camera with a deadzone-based scrolling camera that follows the local player. The map becomes larger than one screen (32x20 tiles), and the camera smoothly scrolls as the player approaches screen edges.

## Architecture

### New module: `src/camera.ts`

| Field | Type | Purpose |
|---|---|---|
| `x`, `y` | number | Current camera center (world px) |
| `targetX`, `targetY` | number | Where camera wants to be (before lerp) |
| `worldWidth`, `worldHeight` | number | Map bounds for clamping |
| `viewportWidthWorld`, `viewportHeightWorld` | number | Visible world pixels (screen size / scale) |
| `scale` | number | Fixed zoom (e.g., 4x) |
| `deadzoneHalfW`, `deadzoneHalfH` | number | Deadzone half-dimensions in world px |
| `lerpSpeed` | number | Smoothing factor (0.08-0.12) |

### API
```typescript
type Camera = {
  update: (playerWorldX: number, playerWorldY: number) => void;
  applyToContainer: (container: Container, screenW: number, screenH: number, shake?: ShakeOffset) => void;
  screenToWorld: (screenX: number, screenY: number, screenW: number, screenH: number) => { worldX: number; worldY: number };
  resize: (screenW: number, screenH: number) => void;
  getWorldCenter: () => { x: number; y: number };
  getScale: () => number;
};
```

## Deadzone Logic

Player moves freely in center 40% of visible area. When they exit the deadzone, camera target shifts so player sits at deadzone edge.

```
dx = playerX - targetX
if dx > dzHalfW:   targetX = playerX - dzHalfW
if dx < -dzHalfW:  targetX = playerX + dzHalfW
// same for Y
// clamp target to map boundaries
// lerp current position toward target
```

## Scale Recommendation: 4x

| Scale | Visible at 1080p | Tiles visible |
|---|---|---|
| 3x | 640x360 world px | 40x22 |
| **4x** | **480x270 world px** | **30x17** |
| 5x | 384x216 world px | 24x14 |

4x shows ~60% of a 32x20 map at once — good tactical awareness while keeping 16px sprites at readable 64 screen pixels. Snap container position to whole pixels to prevent sub-pixel blur.

## Impact on Existing Code

| File | Changes |
|---|---|
| `main.ts` | Remove `layoutWorld()`, `baseWorldX/Y`, `ROOM_PADDING_PX`. Add camera create/update/apply in render loop. Fix `getAimAngle` to use player screen position instead of screen center. |
| `camera.ts` | New file — all camera logic |
| `entityRenderer.ts` | No changes (world-space rendering) |
| `mapRenderer.ts` | No changes (world-space rendering) |
| `entityStore.ts` | No changes (world-space positions) |
| `room.go` | No changes (reads bounds from map JSON) |

## Aim Angle Fix Required
With scrolling, the player is no longer at screen center. `getAimAngle` must compute angle from **player's screen position** to pointer, not from screen center:
```typescript
const playerScreenX = (playerWorldX - camera.x) * scale + screenW / 2;
const playerScreenY = (playerWorldY - camera.y) * scale + screenH / 2;
const angle = Math.atan2(pointerY - playerScreenY, pointerX - playerScreenX);
```

## Implementation Steps
1. Create `src/camera.ts` with deadzone, lerp, clamping, applyToContainer, screenToWorld
2. Integrate into `main.ts` — replace layoutWorld, update in onRender
3. Fix aim angle to use camera worldToScreen
4. Load larger map (32x20 tiles)
5. Test and tune deadzone size + lerp speed
