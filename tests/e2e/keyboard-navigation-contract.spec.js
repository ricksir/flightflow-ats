const { test, expect } = require('@playwright/test');

async function loadDemoPaused(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
}

test('dialog aberto bloqueia a navegação global por teclado', async ({ page }) => {
  await loadDemoPaused(page);

  await page.evaluate(() => {
    const dialog = document.createElement('dialog');
    dialog.id = 'keyboard-contract-dialog';
    dialog.textContent = 'Contrato de teclado';
    document.body.appendChild(dialog);
    dialog.showModal();
  });

  await expect(page.locator('#keyboard-contract-dialog')).toHaveAttribute('open', '');
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');

  await page.evaluate(() => document.querySelector('#keyboard-contract-dialog')?.close());
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('#scrubber').inputValue()).toBe('1');
  await expect(page.locator('#frameCounter')).toContainText('2 / ');
});
