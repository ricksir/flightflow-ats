const { test, expect } = require('@playwright/test');

async function loadDemo(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('.timeline-item')).not.toHaveCount(0);

  // Os botões de demonstração chamam loadDemo(true): a aplicação inicia o autoplay
  // cerca de 500 ms depois. Esperamos esse estado e usamos Reiniciar, que para a
  // reprodução e volta ao evento 1. Assim todos os cenários começam determinísticos.
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  expect(await page.locator('.timeline-item').count()).toBeGreaterThan(2);
}

async function openTimeline(page) {
  await page.locator('.tab[data-tab="timeline"]').click();
  await expect(page.locator('[data-panel="timeline"]')).toHaveClass(/active/);
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

test('demonstração inicia no evento 1 e troca de histórico sem resíduo da sessão anterior', async ({ page }) => {
  const total = await page.locator('.timeline-item').count();
  expect(total).toBeGreaterThan(2);
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeEnabled();
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');

  for (let index = 0; index < 3; index += 1) await page.locator('#nextBtn').click();
  expect(await page.locator('#scrubber').inputValue()).toBe('3');

  const previousSession = await page.evaluate(() => {
    const state = window.__FlightFlowFirBridge?.state;
    const routeApi = window.FlightFlowRouteProcessedV7412;
    if (!state || !routeApi) throw new Error('estado de sessão/rota indisponível');

    window.__flightflowHistoryResetModes = [];
    document.addEventListener('flightflow:history-session-reset', event => {
      window.__flightflowHistoryResetModes.push(event?.detail?.mode || '');
    });

    const model = routeApi.getModel();
    model.history = { callsign: 'TAM3542', sourceFile: 'Demonstração TAM3542' };
    model.resolvedSnapshots = [{ signature: 'stale-session' }];
    model.currentSnapshotIndex = 7;
    model.routeProgress = 0.77;
    model.sourceFile = 'Demonstração TAM3542';
    model.lastNativeIndex = 42;
    model.movementProfile = { stale: true };
    state.geo = state.geo || {};
    state.geo.ffrpProcessedRoute = { session: 'stale' };

    return {
      activeSourceId: state.activeSourceId,
      sourceNames: state.sources.map(source => source.name),
    };
  });

  expect(previousSession.sourceNames).toContain('Demonstração TAM3542');

  const sample = await page.evaluate(() => window.__SAMPLE_HISTORY__);
  expect(sample).toContain('TAM3542');
  const secondHistory = sample.replaceAll('TAM3542', 'GLO4321');

  await page.locator('#fileInput').setInputFiles({
    name: 'history-second.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(secondHistory, 'utf8'),
  });
  await expect(page.locator('#readStartBtn')).toBeEnabled();

  await expect.poll(() => page.evaluate(() => {
    const model = window.FlightFlowRouteProcessedV7412?.getModel();
    const state = window.__FlightFlowFirBridge?.state;
    return {
      history: model?.history ?? null,
      resolvedSnapshots: model?.resolvedSnapshots?.length ?? -1,
      currentSnapshotIndex: model?.currentSnapshotIndex,
      routeProgress: model?.routeProgress,
      sourceFile: model?.sourceFile,
      lastNativeIndex: model?.lastNativeIndex,
      movementProfile: model?.movementProfile ?? null,
      hasProcessedRoute: Boolean(state?.geo?.ffrpProcessedRoute),
      modes: window.__flightflowHistoryResetModes || [],
    };
  })).toEqual({
    history: null,
    resolvedSnapshots: 0,
    currentSnapshotIndex: 0,
    routeProgress: 0,
    sourceFile: '',
    lastNativeIndex: -1,
    movementProfile: null,
    hasProcessedRoute: false,
    modes: ['pending'],
  });

  await page.locator('#readStartBtn').click();

  await expect(page.locator('#callsignTitle')).toHaveText('GLO4321');
  await expect(page.locator('#selectedFileLabel')).toContainText('history-second.txt');
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);

  const currentSession = await page.evaluate(() => {
    const state = window.__FlightFlowFirBridge?.state;
    const model = window.FlightFlowRouteProcessedV7412?.getModel();
    return {
      activeSourceId: state?.activeSourceId,
      sourceName: state?.sourceName,
      sourceNames: (state?.sources || []).map(source => source.name),
      callsign: state?.parsed?.meta?.callsign || state?.parsed?.events?.at(-1)?.snapshot?.callsign || '',
      index: state?.index,
      modes: window.__flightflowHistoryResetModes || [],
      staleProcessedRoute: state?.geo?.ffrpProcessedRoute?.session === 'stale',
      staleSnapshot: Boolean(model?.resolvedSnapshots?.some?.(snapshot => snapshot?.signature === 'stale-session')),
      staleMovementProfile: model?.movementProfile?.stale === true,
      staleRouteHistory: model?.history?.callsign === 'TAM3542',
    };
  });

  expect(currentSession.activeSourceId).not.toBe(previousSession.activeSourceId);
  expect(currentSession.sourceName).toBe('history-second');
  expect(currentSession.sourceNames).toEqual(['history-second']);
  expect(currentSession.callsign).toBe('GLO4321');
  expect(currentSession.index).toBe(0);
  expect(currentSession.modes).toEqual(['pending', 'source']);
  expect(currentSession.staleProcessedRoute).toBe(false);
  expect(currentSession.staleSnapshot).toBe(false);
  expect(currentSession.staleMovementProfile).toBe(false);
  expect(currentSession.staleRouteHistory).toBe(false);

  await openTimeline(page);
  await expect(page.locator('.timeline-item.active')).toBeVisible();
});

test('Próximo e Anterior mantêm navegação sincronizada e atualizam STRIP/FPV', async ({ page }) => {
  await expect(page.locator('#stripToggleBtn')).toBeEnabled();
  await expect(page.locator('#fpvToggleBtn')).toBeEnabled();

  await page.locator('#stripToggleBtn').click();
  await expect(page.locator('#stripWindow')).toBeVisible();
  await expect(page.locator('#stripToggleBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stripCanvas [data-strip-field="E"] .strip-value')).toHaveText('TAM3542');
  await expect(page.locator('#stripCanvas [data-strip-field="F"] .strip-value')).toHaveText('SBBR');
  await expect(page.locator('#stripCanvas [data-strip-field="H"] .strip-value')).toHaveText('SBGO');
  await expect(page.locator('#stripStageLabel')).toContainText('evento 1');
  expect(await page.locator('#stripCanvas .strip-cell').count()).toBeGreaterThan(20);

  await page.locator('#stripRecognizeBtn').click();
  await expect(page.locator('#stripNotice')).toContainText('Alterações reconhecidas');

  await page.locator('#stripCloseBtn').click();
  await expect(page.locator('#stripWindow')).toBeHidden();
  await expect(page.locator('#stripToggleBtn')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#stripToggleBtn')).toHaveClass(/is-minimized/);

  await page.locator('#stripToggleBtn').click();
  await expect(page.locator('#stripWindow')).toBeVisible();
  await expect(page.locator('#stripToggleBtn')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#fpvToggleBtn').click();
  await expect(page.locator('#fpvWindow')).toBeVisible();
  await expect(page.locator('#fpvToggleBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-fpv="acft"] b')).toHaveText('TAM3542');
  await expect(page.locator('[data-fpv="dest"] b')).toHaveText('SBGO');
  await expect(page.locator('#fpvNotice')).not.toHaveText('');

  await page.locator('#nextBtn').click();
  expect(await page.locator('#scrubber').inputValue()).toBe('1');
  await expect(page.locator('#frameCounter')).toContainText('2 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '1');
  await expect(page.locator('#stripStageLabel')).toContainText('evento 2');
  await expect(page.locator('#stripCanvas [data-strip-field="E"] .strip-value')).toHaveText('TAM3542');

  await page.locator('#fpvCloseBtn').click();
  await expect(page.locator('#fpvWindow')).toBeHidden();
  await expect(page.locator('#fpvToggleBtn')).toHaveClass(/is-minimized/);
  await page.locator('#fpvToggleBtn').click();
  await expect(page.locator('#fpvWindow')).toBeVisible();

  await page.locator('#prevBtn').click();
  expect(await page.locator('#scrubber').inputValue()).toBe('0');
  await expect(page.locator('#frameCounter')).toContainText('1 / ');
  await expect(page.locator('.timeline-item.active')).toHaveAttribute('data-event-index', '0');
  await expect(page.locator('#stripStageLabel')).toContainText('evento 1');
  await expect(page.locator('[data-fpv="acft"] b')).toHaveText('TAM3542');
  await expect(page.locator('#prevBtn')).toBeDisabled();
});

test('Próximo, clique na timeline e scrubber convergem para o mesmo estado visível', async ({ page }) => {
  for (let i = 0; i < 3; i += 1) await page.locator('#nextBtn').click();
  const viaNext = await visibleState(page);
  expect(viaNext.activeIndex).toBe('3');

  await page.locator('#restartBtn').click();
  await openTimeline(page);
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
  await expect(page.locator('#prevBtn')).toBeDisabled();
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
  await page.locator('#speedSelect').selectOption('1');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);

  await expect.poll(async () => Number(await page.locator('#scrubber').inputValue()), { timeout: 3_500 }).toBeGreaterThan(0);
  const beforeManual = Number(await page.locator('#scrubber').inputValue());

  await page.locator('#nextBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  const afterManual = Number(await page.locator('#scrubber').inputValue());
  expect(afterManual).toBeGreaterThanOrEqual(beforeManual);
});
