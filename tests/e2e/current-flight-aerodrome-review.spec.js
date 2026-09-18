const { test, expect } = require('@playwright/test');

async function loadDemo(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#callsignTitle')).toHaveText('TAM3542');
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
}

test('Configurações mostram ADEP e ADES do voo atual com revisão manual disponível', async ({ page }) => {
  await loadDemo(page);
  await page.locator('#configBtn').click();

  const panel = page.locator('#currentFlightAerodromeReview');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-has-flight', 'true');

  const adep = panel.locator('[data-role="ADEP"]');
  const ades = panel.locator('[data-role="ADES"]');

  await expect(adep).toContainText('SBBR');
  await expect(ades).toContainText('SBGO');
  await expect(adep).toHaveAttribute('data-known', 'true');
  await expect(ades).toHaveAttribute('data-known', 'true');
  await expect(adep.locator('.current-flight-aerodrome-review-btn')).toHaveText('Revisar localização');
  await expect(ades.locator('.current-flight-aerodrome-review-btn')).toHaveText('Revisar localização');

  await adep.locator('.current-flight-aerodrome-review-btn').click();
  await expect(page.locator('#aerodromeLocationModal')).toBeVisible();
  await expect(page.locator('#aerodromeMissingCode')).toHaveText('SBBR');
  await expect(page.locator('#aerodromeMissingTitle')).toContainText('Atualizar coordenadas');
  await page.locator('#aerodromeLocationCloseBtn').click();

  await expect(page.locator('#aerodromeLocationModal')).not.toBeVisible();

  await ades.locator('.current-flight-aerodrome-review-btn').click();
  await expect(page.locator('#aerodromeLocationModal')).toBeVisible();
  await expect(page.locator('#aerodromeMissingCode')).toHaveText('SBGO');
  await expect(page.locator('#aerodromeMissingTitle')).toContainText('Atualizar coordenadas');
});

test('painel informa quando ainda não há histórico carregado', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.locator('#configBtn').click();

  const panel = page.locator('#currentFlightAerodromeReview');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-has-flight', 'false');
  await expect(panel).toContainText('Carregue um histórico para revisar ADEP e ADES');
});
