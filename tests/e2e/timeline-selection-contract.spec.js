const { test, expect } = require('@playwright/test');

async function loadDemo(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();
  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('.timeline-item')).not.toHaveCount(0);
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');
}

test.beforeEach(async ({ page }) => {
  await loadDemo(page);
  await page.evaluate(() => {
    window.__timelineScrollCalls = [];
    Element.prototype.scrollIntoView = function scrollIntoView(options) {
      window.__timelineScrollCalls.push({ index: this.dataset?.eventIndex ?? null, options });
    };
  });
});

test('painel oculto atualiza item ativo sem rolagem automática', async ({ page }) => {
  await expect(page.locator('[data-panel="timeline"]')).not.toHaveClass(/active/);
  await page.locator('#nextBtn').click();
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '1');
  const calls = await page.evaluate(() => window.__timelineScrollCalls);
  expect(calls).toEqual([]);
});

test('abrir aba Eventos rola o item já ativo com nearest e smooth', async ({ page }) => {
  await page.locator('#nextBtn').click();
  await page.locator('.tab[data-tab="timeline"]').click();
  await expect(page.locator('[data-panel="timeline"]')).toHaveClass(/active/);
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '1');
  const calls = await page.evaluate(() => window.__timelineScrollCalls);
  expect(calls.at(-1)).toEqual({ index: '1', options: { block: 'nearest', behavior: 'smooth' } });
});

test('navegação com Eventos aberto move seleção e rola somente o novo ativo', async ({ page }) => {
  await page.locator('.tab[data-tab="timeline"]').click();
  await expect(page.locator('[data-panel="timeline"]')).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => window.__timelineScrollCalls.at(-1)?.index)).toBe('0');
  await page.evaluate(() => { window.__timelineScrollCalls.length = 0; });
  await page.locator('#nextBtn').click();
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '1');
  await page.locator('#nextBtn').click();
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '2');
  const calls = await page.evaluate(() => window.__timelineScrollCalls);
  expect(calls.map(call => call.index)).toEqual(['1', '2']);
  for (const call of calls) expect(call.options).toEqual({ block: 'nearest', behavior: 'smooth' });
});