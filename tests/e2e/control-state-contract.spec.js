const { test, expect } = require('@playwright/test');

const CORE_CONTROLS = ['#exportBtn', '#restartBtn', '#prevBtn', '#playBtn', '#nextBtn', '#scrubber'];

async function loadDemoWithoutWaitingForAutoplay(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();
  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
}

test('sem histórico os controles principais começam desabilitados', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  for (const selector of CORE_CONTROLS) await expect(page.locator(selector)).toBeDisabled();
  await expect(page.locator('#scrubber')).toHaveAttribute('max', '0');
  await expect(page.locator('#endTimeLabel')).toHaveText('--:--:--');
});

test('carregar histórico habilita controles mas preserva limite do primeiro evento', async ({ page }) => {
  await loadDemoWithoutWaitingForAutoplay(page);
  await expect(page.locator('#exportBtn')).toBeEnabled();
  await expect(page.locator('#restartBtn')).toBeEnabled();
  await expect(page.locator('#playBtn')).toBeEnabled();
  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();
  expect(Number(await page.locator('#scrubber').getAttribute('max'))).toBeGreaterThan(0);
  await expect(page.locator('#endTimeLabel')).not.toHaveText('--:--:--');
});

test('limites Anterior e Próximo acompanham primeiro, meio e último evento', async ({ page }) => {
  await loadDemoWithoutWaitingForAutoplay(page);
  await page.locator('#restartBtn').click();
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();

  await page.locator('#nextBtn').click();
  await expect(page.locator('#prevBtn')).toBeEnabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();

  await page.keyboard.press('End');
  await expect(page.locator('#prevBtn')).toBeEnabled();
  await expect(page.locator('#nextBtn')).toBeDisabled();
});
