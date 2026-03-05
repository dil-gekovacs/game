import { test, expect } from '@playwright/test';

test('clicking kills enemies and their count decreases', async ({ page }) => {
  // Navigate to the game with a test room and player ID
  await page.goto('/?roomId=e2e-attack&playerId=e2e-attacker');

  // Verify the canvas element renders inside #app
  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible({ timeout: 10_000 });

  // Wait for the HUD to show a successful WebSocket connection
  const hud = page.locator('[data-testid="hud"]');
  await expect(hud).toContainText('connection: connected', { timeout: 15_000 });

  // Read the initial enemy count from the HUD
  const hudText = await hud.textContent();
  const initialMatch = hudText?.match(/enemies:\s*(\d+)/);
  expect(initialMatch).not.toBeNull();
  const initialEnemyCount = parseInt(initialMatch![1], 10);
  expect(initialEnemyCount).toBeGreaterThan(0);

  // Get canvas bounding box for coordinate calculations
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  // Move toward enemies: press 'd' (right) for 3 seconds to get close
  await page.keyboard.down('d');
  await page.waitForTimeout(3000);
  await page.keyboard.up('d');

  // Brief pause to let the player settle
  await page.waitForTimeout(200);

  // Attack repeatedly: click to the right of canvas center to aim eastward toward enemies
  const clickX = canvasBox!.x + canvasBox!.width * 0.7;
  const clickY = canvasBox!.y + canvasBox!.height * 0.5;

  for (let i = 0; i < 15; i++) {
    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(400);
  }

  // Wait for server to process kills and snapshots to propagate
  await page.waitForTimeout(500);

  // Read the enemy count again from the HUD
  const hudTextAfter = await hud.textContent();
  const afterMatch = hudTextAfter?.match(/enemies:\s*(\d+)/);
  expect(afterMatch).not.toBeNull();
  const finalEnemyCount = parseInt(afterMatch![1], 10);

  // Assert that at least one enemy was killed
  expect(finalEnemyCount).toBeLessThan(initialEnemyCount);

  // Capture a screenshot for visual verification
  await page.screenshot({ path: 'screenshots/attack.png', fullPage: true });
});
