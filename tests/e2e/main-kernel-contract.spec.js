const { test, expect } = require('@playwright/test');

const GEO_METHODS = ['register', 'get', 'has', 'request', 'list', 'currentRouteEndpoints'];

test('núcleo publica leitura normativa por cópia defensiva', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate(() => {
    const reader = window.__flightflowKnowledgeEntries;
    const first = typeof reader === 'function' ? reader() : null;
    const second = typeof reader === 'function' ? reader() : null;
    return {
      readerType: typeof reader,
      firstIsArray: Array.isArray(first),
      secondIsArray: Array.isArray(second),
      distinctArrays: !!first && !!second && first !== second,
      firstLength: Array.isArray(first) ? first.length : -1,
      secondLength: Array.isArray(second) ? second.length : -1,
      distinctFirstEntry: Array.isArray(first) && Array.isArray(second) && first.length > 0 && second.length > 0
        ? first[0] !== second[0]
        : true,
    };
  });

  expect(contract.readerType).toBe('function');
  expect(contract.firstIsArray).toBe(true);
  expect(contract.secondIsArray).toBe(true);
  expect(contract.distinctArrays).toBe(true);
  expect(contract.firstLength).toBeGreaterThan(0);
  expect(contract.secondLength).toBe(contract.firstLength);
  expect(contract.distinctFirstEntry).toBe(true);
});

test('GeoResolver permanece congelado, versão 1.0.0 e com seis operações públicas', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate((methods) => {
    const api = window.__flightflowGeoResolver;
    let listed = null;
    try { listed = api?.list?.(); } catch (_) {}
    return {
      exists: !!api,
      frozen: api ? Object.isFrozen(api) : false,
      version: api?.version,
      methods: methods.filter(name => typeof api?.[name] === 'function'),
      listedIsObject: !!listed && typeof listed === 'object' && !Array.isArray(listed),
    };
  }, GEO_METHODS);

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.version).toBe('1.0.0');
  expect(contract.methods).toEqual(GEO_METHODS);
  expect(contract.listedIsObject).toBe(true);
});
