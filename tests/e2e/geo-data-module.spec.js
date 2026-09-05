const { test, expect } = require('@playwright/test');

test('base geográfica externa continua disponível no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate(() => {
    const geo = window.__FLIGHTFLOW_GEO_DATA__;
    let serializedLength = 0;
    try { serializedLength = geo ? JSON.stringify(geo).length : 0; } catch (_) {}
    return {
      exists: !!geo,
      type: typeof geo,
      keyCount: geo && typeof geo === 'object' ? Object.keys(geo).length : 0,
      serializedLength,
    };
  });

  expect(contract.exists).toBe(true);
  expect(contract.type).toBe('object');
  expect(contract.keyCount).toBeGreaterThan(0);
  expect(contract.serializedLength).toBeGreaterThan(100000);
});
