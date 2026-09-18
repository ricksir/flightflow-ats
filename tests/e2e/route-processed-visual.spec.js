const { test, expect } = require('@playwright/test');

test('Rota Processada prioriza mapa, separa explicação e reduz labels permanentes', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  await expect.poll(() => page.evaluate(() => Boolean(window.FlightFlowRouteProcessedV7412 && window.__SAMPLE_HISTORY__))).toBe(true);
  await page.evaluate(async () => {
    await window.FlightFlowRouteProcessedV7412.analyzeText(window.__SAMPLE_HISTORY__, 'Demonstração visual');
  });

  await expect(page.locator('#ffrpOpen')).toBeVisible();
  await page.locator('#ffrpOpen').click();
  await expect(page.locator('#ffrpModal')).toBeVisible();

  const legend = page.locator('#ffrpLegend');
  const note = page.locator('#ffrpMapNote');
  const stage = page.locator('.ffrp-map-stage');
  const focus = page.locator('#ffrpFocusBtn');

  await expect(legend).not.toHaveAttribute('open', '');
  await expect(note).toBeVisible();
  await expect(stage).toBeVisible();
  await expect(focus).toHaveAttribute('aria-pressed', 'true');

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector('.ffrp-map-stage').getBoundingClientRect();
    const note = document.querySelector('#ffrpMapNote').getBoundingClientRect();
    const fontSize = Number.parseFloat(getComputedStyle(document.querySelector('#ffrpMapNote')).fontSize);
    const points = document.querySelectorAll('#ffrpMap .wp').length;
    const labels = document.querySelectorAll('#ffrpMap .wp > text:not(.meta)').length;
    return {
      noOverlap: note.top >= stage.bottom - 1,
      fontSize,
      points,
      labels,
    };
  });

  expect(geometry.noOverlap).toBe(true);
  expect(geometry.fontSize).toBeGreaterThanOrEqual(10.5);
  expect(geometry.points).toBeGreaterThan(3);
  expect(geometry.labels).toBeLessThan(geometry.points);

  await focus.click();
  await expect(focus).toHaveAttribute('aria-pressed', 'false');

  await legend.locator('summary').click();
  await expect(legend).toHaveAttribute('open', '');
  await expect(legend.locator('.ffrp-legend-items')).toBeVisible();
});


test('Rota Processada mantém mapa como área dominante e sidebar compacta', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await expect.poll(() => page.evaluate(() => Boolean(window.FlightFlowRouteProcessedV7412 && window.__SAMPLE_HISTORY__))).toBe(true);
  await page.evaluate(async () => {
    await window.FlightFlowRouteProcessedV7412.analyzeText(window.__SAMPLE_HISTORY__, 'Aceitação de layout');
    document.querySelector('#ffrpOpen')?.click();
  });
  await expect(page.locator('#ffrpModal')).toBeVisible();

  const layout = await page.evaluate(() => {
    const body = document.querySelector('.ffrp-body').getBoundingClientRect();
    const map = document.querySelector('.ffrp-map-wrap').getBoundingClientRect();
    const side = document.querySelector('.ffrp-side').getBoundingClientRect();
    const note = document.querySelector('#ffrpMapNote').getBoundingClientRect();
    return { body, map, side, note, noteFont: Number.parseFloat(getComputedStyle(document.querySelector('#ffrpMapNote')).fontSize) };
  });

  expect(layout.map.width).toBeGreaterThan(layout.side.width * 2.2);
  expect(layout.map.width).toBeGreaterThan(layout.body.width * 0.68);
  expect(layout.noteFont).toBeGreaterThanOrEqual(11);
  expect(layout.note.width).toBeGreaterThan(layout.side.width);
});
