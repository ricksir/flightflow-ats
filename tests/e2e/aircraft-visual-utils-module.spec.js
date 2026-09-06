const { test, expect } = require('@playwright/test');

test('módulo visual da aeronave carrega e preserva contrato no Chrome real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  const result = await page.evaluate(() => {
    const factory = window.FlightFlowAircraftVisualUtils;
    const api = factory?.create?.({
      clamp: (value, min, max) => Math.max(Number(min), Math.min(Number(max), Number(value))),
      escapeHtml: value => `ESC(${String(value)})`,
    });
    return {
      factoryExists: !!factory,
      factoryFrozen: factory ? Object.isFrozen(factory) : false,
      factoryKeys: factory ? Object.keys(factory) : [],
      apiFrozen: api ? Object.isFrozen(api) : false,
      apiKeys: api ? Object.keys(api) : [],
      size10: api?.aircraftPixelSizeForZoom?.(10),
      regular: api?.planeIconHtml?.(45, 'GLO<1>', 30),
      compact: api?.planeIconHtml?.(0, 'TAM3720', 18),
    };
  });
  expect(result.factoryExists).toBe(true);
  expect(result.factoryFrozen).toBe(true);
  expect(result.factoryKeys).toEqual(['create']);
  expect(result.apiFrozen).toBe(true);
  expect(result.apiKeys).toEqual(['aircraftPixelSizeForZoom', 'planeIconHtml']);
  expect(result.size10).toBe(21);
  expect(result.regular).toContain('--ff-aircraft-size:30px;transform:rotate(45.0deg)');
  expect(result.regular).toContain('ESC(GLO<1>)');
  expect(result.compact).toContain('ff-aircraft-icon compact');
});
