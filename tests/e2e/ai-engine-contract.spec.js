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
      knowledgeIsArray: Array.isArray(window.__flightflowKnowledgeEntries),
    };
  }, PUBLIC_FUNCTIONS);

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.version).toBe('1.3.2');
  expect(contract.methods).toEqual(PUBLIC_FUNCTIONS);
  expect(contract.knowledgeIsArray).toBe(true);
});

test('self-tests internos do motor IA passam no navegador real', async ({ page }) => {
  await page.goto('/index.html?ffai-test=1', { waitUntil: 'load' });
  const marker = page.locator('#ffai-test-marker');
  await expect(marker).toHaveCount(1);

  const result = await page.evaluate(() => ({
    status: document.documentElement.getAttribute('data-ffai-test-result'),
    total: Number(document.querySelector('#ffai-test-marker')?.dataset.total || 0),
    passed: Number(document.querySelector('#ffai-test-marker')?.dataset.passed || 0),
    failed: Number(document.querySelector('#ffai-test-marker')?.dataset.failed || 0),
  }));

  expect(result.status).toBe('pass');
  expect(result.total).toBeGreaterThan(0);
  expect(result.passed).toBe(result.total);
  expect(result.failed).toBe(0);
});
