const { test, expect } = require('@playwright/test');

async function loadHistory(page, text, name = 'missing-aerodromes.txt') {
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

test('ADEP e ADES realmente ausentes da base abrem o cadastro automático em sequência', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  const sample = await page.evaluate(() => window.__SAMPLE_HISTORY__);
  expect(sample).toContain('SBBR');
  expect(sample).toContain('SBGO');

  const unknown = sample
    .replaceAll('SBBR', 'SZZZ')
    .replaceAll('SBGO', 'SZZY');

  await page.locator('#fileInput').setInputFiles({
    name: 'missing-aerodromes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(unknown, 'utf8'),
  });
  await expect(page.locator('#readStartBtn')).toBeEnabled();
  await page.locator('#readStartBtn').click();

  await expect(page.locator('#aerodromeLocationModal')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#aerodromeMissingCode')).toHaveText('SZZZ');
  await expect(page.locator('#aerodromeMissingTitle')).toContainText('não possui coordenadas');

  await page.locator('#aerodromeSkipBtn').click();

  await expect(page.locator('#aerodromeLocationModal')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#aerodromeMissingCode')).toHaveText('SZZY');
  await expect(page.locator('#aerodromeMissingTitle')).toContainText('não possui coordenadas');

  await page.locator('#aerodromeSkipBtn').click();
  await expect(page.locator('#aerodromeLocationModal')).not.toBeVisible();
});

test('histórico com SBBR e SBCT conhecidos não abre cadastro automático', async ({ page }) => {
  const fixture = String.raw`
Indicativo do plano: TAM3774
ADEP: SBBR
ADES: SBCT

############################################################
OPERAÇÃO : Criação pelo Arquivo de RPL
data:   08/07/2026      hora:   18:00:34      posição: SPA01      ambiente: OpA

Indicativo   : TAM3774
ADEP        : SBBR
ADES        : SBCT
Estado      : INA
PONTOS : SBBR UMSUB KUKOL UMGUL
CFL/IFL: 340 340 340 340
ETIM   : 08-23:45 08-23:50 08-23:55 09-00:10
############################################################
`;

  await loadHistory(page, fixture, 'tam3774-known-endpoints.txt');
  await page.waitForTimeout(500);

  await expect(page.locator('#aerodromeLocationModal')).not.toBeVisible();

  const known = await page.evaluate(() => {
    const endpoints = window.__flightflowGeoResolver?.currentRouteEndpoints?.();
    return {
      dep: endpoints?.dep || null,
      arr: endpoints?.arr || null,
      depKnown: Boolean(endpoints?.depAirport),
      arrKnown: Boolean(endpoints?.arrAirport),
      arrSource: endpoints?.arrAirport?.source || null,
    };
  });

  expect(known.dep).toBe('SBBR');
  expect(known.arr).toBe('SBCT');
  expect(known.depKnown).toBe(true);
  expect(known.arrKnown).toBe(true);
});
