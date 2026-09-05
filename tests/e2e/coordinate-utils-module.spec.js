const { test, expect } = require('@playwright/test');

const PUBLIC_FUNCTIONS = [
  'normalizeCoordinateInput',
  'validAerodromeCoordinate',
  'formatGeoCoord',
  'atsCoordinateLabel',
];

test('FlightFlowCoordinateUtils carrega antes do núcleo como API congelada', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate((names) => {
    const api = window.FlightFlowCoordinateUtils;
    return {
      exists: !!api,
      frozen: api ? Object.isFrozen(api) : false,
      methods: names.filter(name => typeof api?.[name] === 'function'),
    };
  }, PUBLIC_FUNCTIONS);

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.methods).toEqual(PUBLIC_FUNCTIONS);
});

test('utilitários de coordenadas preservam comportamento no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.FlightFlowCoordinateUtils;
    return {
      normalized: {
        comma: api.normalizeCoordinateInput(' -15,8692 '),
        dot: api.normalizeCoordinateInput('-47.9208'),
        empty: api.normalizeCoordinateInput(''),
        invalidIsNaN: Number.isNaN(api.normalizeCoordinateInput('abc')),
      },
      valid: {
        southWestLimit: api.validAerodromeCoordinate(-90, -180),
        northEastLimit: api.validAerodromeCoordinate(90, 180),
        tooFarNorth: api.validAerodromeCoordinate(90.0001, 0),
        tooFarWest: api.validAerodromeCoordinate(0, -180.0001),
      },
      formatted: {
        latitude: api.formatGeoCoord(-15.8692, 'NS'),
        longitude: api.formatGeoCoord(-47.9208, 'EW'),
        label: api.atsCoordinateLabel(-15.8692, -47.9208),
      },
    };
  });

  expect(result).toEqual({
    normalized: {
      comma: -15.8692,
      dot: -47.9208,
      empty: 0,
      invalidIsNaN: true,
    },
    valid: {
      southWestLimit: true,
      northEastLimit: true,
      tooFarNorth: false,
      tooFarWest: false,
    },
    formatted: {
      latitude: '15.8692°S',
      longitude: '47.9208°W',
      label: 'LAT 15.8692°S · LONG 47.9208°W',
    },
  });
});
