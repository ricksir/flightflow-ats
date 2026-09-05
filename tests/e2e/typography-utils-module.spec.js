const { test, expect } = require('@playwright/test');

const PUBLIC_FUNCTIONS = [
  'normalizeFontScale',
  'fontLayoutForScale',
  'fontLayoutDescription',
];

test('API pública de tipografia permanece congelada e completa', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate((names) => {
    const api = window.FlightFlowTypographyUtils;
    return {
      exists: !!api,
      frozen: api ? Object.isFrozen(api) : false,
      methods: names.filter(name => typeof api?.[name] === 'function'),
      extraKeys: api ? Object.keys(api).filter(name => !names.includes(name)) : [],
    };
  }, PUBLIC_FUNCTIONS);

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.methods).toEqual(PUBLIC_FUNCTIONS);
  expect(contract.extraKeys).toEqual([]);
});

test('utilitários de tipografia preservam comportamento em Chrome real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.FlightFlowTypographyUtils;
    return {
      defaultScale: api.normalizeFontScale(undefined),
      nullScale: api.normalizeFontScale(null),
      lowClamp: api.normalizeFontScale(0.5),
      highClamp: api.normalizeFontScale(5),
      stringScale: api.normalizeFontScale('1.2'),
      layouts: [1, 1.1, 1.3, 1.5].map(value => api.fontLayoutForScale(value)),
      descriptions: ['normal', 'large', 'stacked', 'xlarge'].map(value => api.fontLayoutDescription(value)),
    };
  });

  expect(result.defaultScale).toBe(1);
  expect(result.nullScale).toBe(0.9);
  expect(result.lowClamp).toBe(0.9);
  expect(result.highClamp).toBe(1.6);
  expect(result.stringScale).toBe(1.2);
  expect(result.layouts).toEqual(['normal', 'large', 'stacked', 'xlarge']);
  expect(result.descriptions).toEqual([
    'Painéis lado a lado.',
    'Colunas e espaçamentos ajustados para preservar a área útil.',
    'Área de voo e painel de dados organizados verticalmente.',
    'Painéis empilhados e campos organizados em coluna única.',
  ]);
});

test('reparo de layout continua pertencendo ao núcleo e não à API pura', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => ({
    exposedPureRepair: typeof window.FlightFlowTypographyUtils?.repairTypographyLayout,
    appLoaded: !!document.querySelector('body'),
  }));

  expect(result.exposedPureRepair).toBe('undefined');
  expect(result.appLoaded).toBe(true);
});