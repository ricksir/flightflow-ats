const { test, expect } = require('@playwright/test');

async function loadDemoPaused(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('.timeline-item')).not.toHaveCount(0);
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
}

async function setScrubber(page, index) {
  await page.locator('#scrubber').evaluate((el, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, index);
}

test.beforeEach(async ({ page }) => {
  await loadDemoPaused(page);
});

test('FlightFlowPlaybackController está disponível como API externa congelada', async ({ page }) => {
  const contract = await page.evaluate(() => {
    const api = window.FlightFlowPlaybackController;
    return {
      exists: !!api,
      frozen: api ? Object.isFrozen(api) : false,
      keys: api ? Object.keys(api) : [],
      createType: typeof api?.create,
    };
  });
  expect(contract).toEqual({ exists: true, frozen: true, keys: ['create'], createType: 'function' });
});

test('Play no último evento reinicia no primeiro antes de reproduzir', async ({ page }) => {
  const total = await page.locator('.timeline-item').count();
  await page.keyboard.press('End');
  expect(await page.locator('#scrubber').inputValue()).toBe(String(total - 1));
  await expect(page.locator('#nextBtn')).toBeDisabled();

  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('#prevBtn')).toBeDisabled();

  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
});

test('playback iniciado no penúltimo evento encerra exatamente no último', async ({ page }) => {
  const total = await page.locator('.timeline-item').count();
  await setScrubber(page, total - 2);
  expect(await page.locator('#scrubber').inputValue()).toBe(String(total - 2));

  await page.locator('#speedSelect').selectOption('4');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);

  await expect.poll(async () => Number(await page.locator('#scrubber').inputValue()), { timeout: 3_500 })
    .toBe(total - 1);
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/, { timeout: 3_500 });
  await expect(page.locator('#nextBtn')).toBeDisabled();
  expect(await page.locator('#scrubber').inputValue()).toBe(String(total - 1));
});

test('pausar pelo próprio botão cancela o avanço pendente', async ({ page }) => {
  await page.locator('#speedSelect').selectOption('1');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);

  const indexAtPause = Number(await page.locator('#scrubber').inputValue());
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  await page.waitForTimeout(2_300);

  expect(Number(await page.locator('#scrubber').inputValue())).toBe(indexAtPause);
  await expect(page.locator('#playBtn')).toHaveText('▶');
});
