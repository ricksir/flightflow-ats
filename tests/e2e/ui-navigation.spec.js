const { test, expect } = require('@playwright/test');

async function loadDemo(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('.timeline-item').first()).toBeVisible();
}

async function visibleState(page) {
  return page.evaluate(() => {
    const active = document.querySelector('.timeline-item.active');
    return {
      frameCounter: document.querySelector('#frameCounter')?.textContent?.trim(),
      eventLabel: document.querySelector('#eventLabel')?.textContent?.trim(),
      currentTime: document.querySelector('#currentTimeLabel')?.textContent?.trim(),
      operation: document.querySelector('#operationTitle')?.textContent?.trim(),
      status: document.querySelector('#statusBadge')?.textContent?.trim(),
      scrubber: document.querySelector('#scrubber')?.value,
      activeIndex: active?.dataset?.eventIndex ?? null,
    };
  });
}

async function setScrubber(page, index) {
  await page.locator('#scrubber').evaluate((el, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, index);
}

test.beforeEach(async ({ page }) => {
  await loadDemo(page);
});

test('demonstração habilita timeline e controles no primeiro evento', async ({ page }) => {
  const total = await page.locator('.timeline-item').count();
  expect(total).toBeGreaterThan(2);
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');
});

test('Próximo e Anterior mantêm scrubber, frame e seleção sincronizados', async ({ page }) => {
  await page.locator('#nextBtn').click();
  expect(await page.locator('#scrubber').inputValue()).toBe('1');
  await expect(page.locator('#frameCounter')).toContainText('2 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '1');

  await page.locator('#prevBtn').click();
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');
});

test('Próximo, clique na timeline e scrubber convergem para o mesmo estado visível', async ({ page }) => {
  for (let i = 0; i < 3; i += 1) await page.locator('#nextBtn').click();
  const viaNext = await visibleState(page);
  expect(viaNext.activeIndex).toBe('3');

  await page.locator('#restartBtn').click();
  await page.locator('.timeline-item[data-event-index="3"]').click();
  const viaTimeline = await visibleState(page);

  await page.locator('#restartBtn').click();
  await setScrubber(page, 3);
  const viaScrubber = await visibleState(page);

  expect(viaTimeline).toEqual(viaNext);
  expect(viaScrubber).toEqual(viaNext);
});

test('teclado ArrowRight e ArrowLeft usa a mesma navegação da interface', async ({ page }) => {
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('#scrubber').inputValue()).toBe('1');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '1');

  await page.keyboard.press('ArrowLeft');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');
});

test('Home e End respeitam os limites e desabilitam os botões corretos', async ({ page }) => {
  const total = await page.locator('.timeline-item').count();
  await page.keyboard.press('End');
  expect(await page.locator('#scrubber').inputValue()).toBe(String(total - 1));
  await expect(page.locator('#nextBtn')).toBeDisabled();
  await expect(page.locator('#prevBtn')).toBeEnabled();

  await page.keyboard.press('Home');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();
});

test('autoplay avança e uma navegação manual interrompe a reprodução', async ({ page }) => {
  await page.locator('#speedSelect').selectOption('4');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);

  await expect.poll(async () => Number(await page.locator('#scrubber').inputValue()), { timeout: 3_000 }).toBeGreaterThan(0);
  const beforeManual = Number(await page.locator('#scrubber').inputValue());

  await page.locator('#nextBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  const afterManual = Number(await page.locator('#scrubber').inputValue());
  expect(afterManual).toBeGreaterThanOrEqual(beforeManual);
});
