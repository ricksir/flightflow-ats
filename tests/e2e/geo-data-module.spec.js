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


test('SBCT oficial prevalece sobre coordenada customizada antiga no navegador', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('flightflow-custom-aerodromes-v1', JSON.stringify({
      version: 1,
      aerodromes: {
        SBCT: {
          code: 'SBCT',
          name: 'Coordenada antiga',
          lat: -25.10,
          lon: -49.80,
          source: 'user-confirmed',
        },
      },
    }));
  });

  await page.goto('/index.html', { waitUntil: 'load' });

  await expect.poll(() => page.evaluate(() => Boolean(
    window.__FlightFlowFirBridge?.state?.geo?.airportByCode?.get?.('SBCT')
  ))).toBe(true);

  const sbct = await page.evaluate(() => {
    const record = window.__FlightFlowFirBridge.state.geo.airportByCode.get('SBCT');
    return {
      lat: Number(record.lat),
      lon: Number(record.lon),
      source: record.source,
      customLat: Number(window.__FlightFlowFirBridge.state.customAerodromes?.SBCT?.lat),
      customLon: Number(window.__FlightFlowFirBridge.state.customAerodromes?.SBCT?.lon),
    };
  });

  expect(sbct.customLat).toBeCloseTo(-25.10, 6);
  expect(sbct.customLon).toBeCloseTo(-49.80, 6);
  expect(sbct.lat).toBeCloseTo(-25.5316666667, 8);
  expect(sbct.lon).toBeCloseTo(-49.1761111111, 8);
  expect(sbct.source).toBe('official-aip');
});
