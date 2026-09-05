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
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
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

test('Restart durante playback interrompe reprodução e volta ao primeiro evento', async ({ page }) => {
  await page.locator('#nextBtn').click();
  await page.locator('#nextBtn').click();
  expect(Number(await page.locator('#scrubber').inputValue())).toBeGreaterThan(0);

  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);

  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();
});

test('scrubber interrompe playback e navega exatamente ao índice solicitado', async ({ page }) => {
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);

  await setScrubber(page, 5);
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('#scrubber').inputValue()).toBe('5');
  await expect(page.locator('#frameCounter')).toContainText('6 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '5');
});

test('ArrowRight mantém a navegação global mesmo quando o foco está no botão Play', async ({ page }) => {
  await page.locator('#playBtn').focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('#scrubber').inputValue()).toBe('1');
  await expect(page.locator('#frameCounter')).toContainText('2 / ');
});

test('tecla de navegação é ignorada dentro de contenteditable', async ({ page }) => {
  await page.evaluate(() => {
    const editable = document.createElement('div');
    editable.id = 'transport-contract-editable';
    editable.setAttribute('contenteditable', 'true');
    editable.textContent = 'edição';
    document.body.appendChild(editable);
    editable.focus();
  });
  await page.keyboard.press('End');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
});

test('Ctrl+ArrowRight preserva a navegação atual e ArrowRight simples avança novamente', async ({ page }) => {
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+ArrowRight');
  expect(await page.locator('#scrubber').inputValue()).toBe('1');
  await expect(page.locator('#frameCounter')).toContainText('2 / ');

  await page.keyboard.press('ArrowRight');
  expect(await page.locator('#scrubber').inputValue()).toBe('2');
  await expect(page.locator('#frameCounter')).toContainText('3 / ');
});

test('Home e End interrompem playback e levam aos limites exatos', async ({ page }) => {
  const total = await page.locator('.timeline-item').count();

  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);
  await page.keyboard.press('End');
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('#scrubber').inputValue()).toBe(String(total - 1));
  await expect(page.locator('#nextBtn')).toBeDisabled();

  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);
  await page.keyboard.press('Home');
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#prevBtn')).toBeDisabled();
});
