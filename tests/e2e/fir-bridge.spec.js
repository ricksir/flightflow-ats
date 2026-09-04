const { test, expect } = require('@playwright/test');

const EXPECTED_KEYS = [
  'state',
  'realMapState',
  'normalizeLocalityCode',
  'closeLeafletRing',
  'sanitizeLeafletAreaPoints',
  'projectGeo',
  'polygonCentroid',
  'escapeHtml',
  'toast',
].sort();

test('ponte FIR e renderizador manual são publicados no Chrome real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate(() => {
    const bridge = window.__FlightFlowFirBridge;
    return {
      exists: !!bridge,
      frozen: bridge ? Object.isFrozen(bridge) : false,
      keys: bridge ? Object.keys(bridge).sort() : [],
      stateType: typeof bridge?.state,
      realMapStateType: typeof bridge?.realMapState,
      functionMembers: [
        'normalizeLocalityCode', 'closeLeafletRing', 'sanitizeLeafletAreaPoints',
        'projectGeo', 'polygonCentroid', 'escapeHtml', 'toast'
      ].filter(name => typeof bridge?.[name] === 'function'),
      renderManualFirLayers: typeof window.renderManualFirLayers,
    };
  });

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.keys).toEqual(EXPECTED_KEYS);
  expect(contract.stateType).toBe('object');
  expect(contract.realMapStateType).toBe('object');
  expect(contract.functionMembers).toHaveLength(7);
  expect(contract.renderManualFirLayers).toBe('function');
});
