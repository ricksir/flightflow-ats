const { test, expect } = require('@playwright/test');

async function loadHistory(page, text, name = 'ats-addresses.txt') {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.locator('#fileInput').setInputFiles({
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(text, 'utf8'),
  });
  await expect(page.locator('#readStartBtn')).toBeEnabled();
  await page.locator('#readStartBtn').click();
  await expect(page.locator('#callsignTitle')).not.toHaveText('—');
}

test('endereço ATS não cadastrado em Originador pode ser clicado e cadastrado', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  const sample = await page.evaluate(() => window.__SAMPLE_HISTORY__);
  const unknown = sample
    .replaceAll('SBBSZQZX', 'SBCFZTTX')
    .replaceAll('SBRJZPZX', 'SBGLZQZX');

  await page.locator('#fileInput').setInputFiles({
    name: 'unknown-ats-addresses.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(unknown, 'utf8'),
  });
  await page.locator('#readStartBtn').click();
  await expect(page.locator('#callsignTitle')).toHaveText('TAM3542');
  // No histórico de demonstração, o primeiro evento com comunicação ATS
  // (Originador/Destinatários preenchidos) é o terceiro evento.
  await page.locator('#nextBtn').click();
  await page.locator('#nextBtn').click();
  await expect(page.locator('#eventLabel')).toContainText('Evento 3');

  const originator = page.locator('.field-card[data-field="originator"]');
  const recipients = page.locator('.field-card[data-field="recipients"]');

  await expect(originator.locator('[data-register-ats-address="SBCFZTTX"]')).toBeVisible();
  await expect(originator.locator('[data-register-ats-address="SBCFZTTX"]')).toContainText('Cadastrar localidade');
  await expect(recipients.locator('[data-register-ats-address="SBGLZQZX"]')).toBeVisible();

  await originator.locator('[data-register-ats-address="SBCFZTTX"]').click();

  await expect(page.locator('#configDrawer')).toHaveClass(/open/);
  await expect(page.locator('#localityCodeInput')).toHaveValue('SBCFZTTX');
  await expect(page.locator('#localityNameInput')).toBeFocused();

  await page.locator('#localityNameInput').fill('ACC Belo Horizonte');
  await page.locator('#saveLocalityBtn').click();

  await expect(originator.locator('[data-register-ats-address="SBCFZTTX"]')).toHaveCount(0);
  await expect(originator.locator('.ats-address-entry.is-known')).toContainText('SBCFZTTX');
  await expect(originator.locator('.ats-address-entry.is-known')).toContainText('ACC Belo Horizonte');

  await expect(recipients.locator('[data-register-ats-address="SBGLZQZX"]')).toBeVisible();

  await page.locator('#closeConfigBtn').click();
  await expect(page.locator('#configDrawer')).not.toHaveClass(/open/);

  await recipients.locator('[data-register-ats-address="SBGLZQZX"]').click();
  await expect(page.locator('#configDrawer')).toHaveClass(/open/);
  await expect(page.locator('#localityCodeInput')).toHaveValue('SBGLZQZX');
  await expect(page.locator('#localityNameInput')).toBeFocused();
});

test('endereços ATS já cadastrados continuam exibindo código e localidade sem ação de cadastro', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#callsignTitle')).toHaveText('TAM3542');
  await page.locator('#nextBtn').click();
  await page.locator('#nextBtn').click();
  await expect(page.locator('#eventLabel')).toContainText('Evento 3');

  const originator = page.locator('.field-card[data-field="originator"]');
  await expect(originator.locator('.ats-address-entry.is-known')).toContainText('SBBSZQZX');
  await expect(originator.locator('.ats-address-entry.is-known')).toContainText('ACC Brasília');
  await expect(originator.locator('[data-register-ats-address]')).toHaveCount(0);
});
