const { test, expect } = require('@playwright/test');

const PUBLIC_FUNCTIONS = [
  'analyzeRaw', 'parseHistory', 'runSelfTests', 'getModel', 'getCurrentAnalysis',
  'expectedNextMessages', 'inferCycleState', 'answerQuestion', 'buildReport',
  'getManualBrain', 'searchManuals', 'normativeSupport', 'findMessageAnywhereAfter',
  'applyFalsePositiveMask', 'getConfirmedErrors', 'getFalsePositives',
  'resetCurrentSession', 'refreshReviewUI'
];

test('API pública do motor IA permanece congelada e completa', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate((names) => {
    const api = window.__flightflowAI;
    return {
      exists: !!api,
      frozen: api ? Object.isFrozen(api) : false,
      version: api?.version,
      methods: names.filter(name => typeof api?.[name] === 'function'),
      knowledgePublished: typeof window.__flightflowKnowledgeEntries !== 'undefined',
    };
  }, PUBLIC_FUNCTIONS);

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.version).toBe('1.3.2');
  expect(contract.methods).toEqual(PUBLIC_FUNCTIONS);
  expect(contract.knowledgePublished).toBe(true);
});

test('runSelfTests público passa diretamente no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.__flightflowAI;
    if (!api || typeof api.runSelfTests !== 'function') return null;
    return api.runSelfTests();
  });

  expect(result).not.toBeNull();
  expect(result.total).toBeGreaterThan(0);
  expect(result.passed).toBe(result.total);
  expect(result.failed).toBe(0);
});
