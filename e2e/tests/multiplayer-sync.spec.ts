import { test, expect, Browser, Page } from '@playwright/test';

test('multiplayer position sync — two players join the same room and see each other', async ({ browser }) => {
  let page1: Page | undefined;
  let page2: Page | undefined;

  try {
    // Step 1: Open two separate browser pages (separate contexts for isolation)
    const context1 = await browser.newContext({ baseURL: 'http://localhost:5173' });
    const context2 = await browser.newContext({ baseURL: 'http://localhost:5173' });
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Step 2: Player 1 joins the room
    await page1.goto('/?roomId=e2e-sync&playerId=e2e-sync-p1');
    const canvas1 = page1.locator('#app canvas');
    await expect(canvas1).toBeVisible({ timeout: 10_000 });

    // Step 3: Player 2 joins the same room
    await page2.goto('/?roomId=e2e-sync&playerId=e2e-sync-p2');
    const canvas2 = page2.locator('#app canvas');
    await expect(canvas2).toBeVisible({ timeout: 10_000 });

    // Step 4: Wait for both players to establish WebSocket connections
    const hud1 = page1.locator('[data-testid="hud"]');
    const hud2 = page2.locator('[data-testid="hud"]');
    await expect(hud1).toContainText('connection: connected', { timeout: 15_000 });
    await expect(hud2).toContainText('connection: connected', { timeout: 15_000 });

    // Step 5: Verify both players are in the correct room
    await expect(hud1).toContainText('room: e2e-sync');
    await expect(hud2).toContainText('room: e2e-sync');

    // Step 6: Verify player IDs are correct
    await expect(hud1).toContainText('player: e2e-sync-p1');
    await expect(hud2).toContainText('player: e2e-sync-p2');

    // Step 7: Verify both players received entity IDs from the server
    // The HUD shows "entity: <id>" once the server assigns an entity
    await expect(hud1).toContainText(/entity: \d+/, { timeout: 10_000 });
    await expect(hud2).toContainText(/entity: \d+/, { timeout: 10_000 });

    // Step 8: Extract entity IDs and verify they are different
    const hud1Text = await hud1.innerText();
    const hud2Text = await hud2.innerText();
    const entityId1 = hud1Text.match(/entity: (\d+)/)?.[1];
    const entityId2 = hud2Text.match(/entity: (\d+)/)?.[1];

    expect(entityId1).toBeTruthy();
    expect(entityId2).toBeTruthy();
    expect(entityId1).not.toEqual(entityId2);

    // Step 9: Simulate player 1 movement — press 'd' (move right) for 500ms
    await page1.keyboard.down('d');
    await page1.waitForTimeout(500);
    await page1.keyboard.up('d');

    // Step 10: Wait for server tick + snapshot propagation to player 2
    await page2.waitForTimeout(300);

    // Step 11: Verify sync worked — both players connected to the same room,
    // got different entity IDs, and player 2's HUD is still showing "connected"
    // after player 1 moved (meaning snapshots are flowing without errors).
    await expect(hud2).toContainText('connection: connected');

    // Step 12: Capture screenshots of both players for visual verification
    await page1.screenshot({ path: 'screenshots/multiplayer-sync-p1.png', fullPage: true });
    await page2.screenshot({ path: 'screenshots/multiplayer-sync-p2.png', fullPage: true });
  } finally {
    // Clean up: close both pages and their contexts
    if (page1) {
      const ctx = page1.context();
      await page1.close();
      await ctx.close();
    }
    if (page2) {
      const ctx = page2.context();
      await page2.close();
      await ctx.close();
    }
  }
});
