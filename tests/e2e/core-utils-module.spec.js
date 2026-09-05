const { test, expect } = require('@playwright/test');

const PUBLIC_FUNCTIONS = [
  'shortMessageType', 'displayValue', 'cleanDisplay', 'humanize', 'clone', 'formatBytes'
];

test('FlightFlowCoreUtils carrega antes do núcleo como API congelada', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate((names) => {
    const api = window.FlightFlowCoreUtils;
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

test('utilitários externos preservam comportamento no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.FlightFlowCoreUtils;
    const original = { a: 1, nested: { b: 2 } };
    const copied = api.clone(original);
    copied.nested.b = 99;
    return {
      shortDefault: api.shortMessageType(),
      shortCpl: api.shortMessageType('  cpl-abc/12 !!'),
      displayEmpty: api.displayValue(null),
      displayArray: api.displayValue([1, 2]),
      displayObjectArray: api.displayValue([{ a: 'X', b: 'Y' }]),
      cleaned: api.cleanDisplay('  A   B  '),
      humanized: api.humanize('messageType'),
      original,
      copied,
      kb: api.formatBytes(1536),
      mb: api.formatBytes(1048576),
    };
  });

  expect(result).toEqual({
    shortDefault: 'ATS',
    shortCpl: 'cplabc/1',
    displayEmpty: '—',
    displayArray: '1 | 2',
    displayObjectArray: 'X · Y',
    cleaned: 'A B',
    humanized: 'MESSAGE TYPE',
    original: { a: 1, nested: { b: 2 } },
    copied: { a: 1, nested: { b: 99 } },
    kb: '1.5 KB',
    mb: '1.0 MB',
  });
});
