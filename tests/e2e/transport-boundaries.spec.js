const { test, expect } = require('@playwright/test');

test('carregar uma fonte no evento 1 mantém Anterior desabilitado', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  // click() termina depois do handler síncrono de loadDemo(true), mas antes do
  // autoplay agendado para ~500 ms. É exatamente a janela em que o enableControls(true)
  // redundante sobrescreve o limite calculado por renderCurrent().
  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('#frameCounter')).toContainText('1 / ');

  const previousDisabledImmediatelyAfterLoad = await page.locator('#prevBtn').isDisabled();
  expect(previousDisabledImmediatelyAfterLoad).toBe(true);
});
