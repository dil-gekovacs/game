import { test, expect } from '@playwright/test';

test('game loads and connects to WebSocket server', async ({ page }) => {
  // Navigate to the game with a test room and player ID
  await page.goto('/?roomId=e2e-test&playerId=e2e-p1');

  // Verify the canvas element renders inside #app
  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible({ timeout: 10_000 });

  // Wait for the HUD to show a successful WebSocket connection
  const hud = page.locator('[data-testid="hud"]');
  await expect(hud).toContainText('connection: connected', { timeout: 15_000 });

  // Verify the HUD displays the correct room name
  await expect(hud).toContainText('room: e2e-test');

  // Verify the HUD displays the correct player ID
  await expect(hud).toContainText('player: e2e-p1');

  // Capture a screenshot for visual verification
  await page.screenshot({ path: 'screenshots/smoke.png', fullPage: true });
});
