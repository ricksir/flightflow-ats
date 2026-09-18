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


test('painel mantém contraste legível no modo claro e nomes longos em até duas linhas', async ({ page }) => {
  await loadDemo(page);
  await page.locator('#configBtn').click();
  await page.locator('#themeLightBtn').click();

  const metrics = await page.evaluate(() => {
    const card = document.querySelector('.current-flight-aerodrome-card');
    const code = card?.querySelector('.current-flight-aerodrome-code');
    const name = card?.querySelector('.current-flight-aerodrome-name');
    const coord = card?.querySelector('.current-flight-aerodrome-coord');
    const status = card?.querySelector('.current-flight-aerodrome-status');
    const button = card?.querySelector('.current-flight-aerodrome-review-btn');

    const rgb = value => {
      const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      return match ? match.slice(1, 4).map(Number) : null;
    };
    const luminance = color => {
      const values = rgb(color);
      if (!values) return null;
      const channels = values.map(value => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (foreground, background) => {
      const a = luminance(foreground);
      const b = luminance(background);
      if (a === null || b === null) return 0;
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };

    const cardStyle = getComputedStyle(card);
    const background = cardStyle.backgroundColor;
    const statusStyle = getComputedStyle(status);
    const buttonStyle = getComputedStyle(button);

    return {
      background,
      codeContrast: contrast(getComputedStyle(code).color, background),
      nameContrast: contrast(getComputedStyle(name).color, background),
      coordContrast: contrast(getComputedStyle(coord).color, background),
      statusContrast: contrast(statusStyle.color, statusStyle.backgroundColor),
      buttonContrast: contrast(buttonStyle.color, buttonStyle.backgroundColor),
      lineClamp: getComputedStyle(name).webkitLineClamp,
      statusText: status.textContent.trim(),
      cardMinHeight: Number.parseFloat(cardStyle.minHeight),
    };
  });

  expect(metrics.background).toBe('rgb(255, 255, 255)');
  expect(metrics.codeContrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.nameContrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.coordContrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.statusContrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.buttonContrast).toBeGreaterThanOrEqual(4.5);
  expect(metrics.lineClamp).toBe('2');
  expect(metrics.statusText.length).toBeLessThanOrEqual(16);
  expect(metrics.cardMinHeight).toBeGreaterThanOrEqual(170);
});
