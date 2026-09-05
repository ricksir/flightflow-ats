const { test, expect } = require('@playwright/test');

test('sample history externo continua disponível no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const sample = await page.evaluate(() => ({
    type: typeof window.__SAMPLE_HISTORY__,
    length: typeof window.__SAMPLE_HISTORY__ === 'string' ? window.__SAMPLE_HISTORY__.length : 0,
    hasHeader: typeof window.__SAMPLE_HISTORY__ === 'string' && window.__SAMPLE_HISTORY__.includes('HISTÓRICO DE PLANOS'),
    hasCallsign: typeof window.__SAMPLE_HISTORY__ === 'string' && window.__SAMPLE_HISTORY__.includes('TAM3542'),
    hasAdep: typeof window.__SAMPLE_HISTORY__ === 'string' && window.__SAMPLE_HISTORY__.includes('ADEP: SBBR'),
  }));

  expect(sample.type).toBe('string');
  expect(sample.length).toBeGreaterThan(1000);
  expect(sample.hasHeader).toBe(true);
  expect(sample.hasCallsign).toBe(true);
  expect(sample.hasAdep).toBe(true);
});
