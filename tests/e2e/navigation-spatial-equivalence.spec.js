const { test, expect } = require('@playwright/test');

const BASE_INDEX = 77; // Evento 78 — antes de PADIL
const TARGET_INDEX = 78; // Evento 79 — após MASVA

async function loadDemoPaused(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('.timeline-item')).not.toHaveCount(0);
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  expect(await page.locator('.timeline-item').count()).toBeGreaterThan(TARGET_INDEX);
}

async function setScrubber(page, index) {
  await page.locator('#scrubber').evaluate((el, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, index);
}

async function waitForSpatialSettled(page, index) {
  await expect.poll(async () => page.evaluate(targetIndex => {
    const state = window.__FlightFlowFirBridge?.state;
    if (!state?.motion || state.index !== targetIndex) return false;
    const routeTarget = Number(state.geo?.eventRoutes?.[targetIndex]?.target);
    const current = Number(state.motion.currentProgress);
    const rendered = Number(state.renderedProgress);
    const planeProgress = Number(state.renderedPlane?.progress);
    if (![routeTarget, current, rendered, planeProgress].every(Number.isFinite)) return false;
    return state.motion.ffrpTransition == null
      && Math.abs(current - routeTarget) < 1e-6
      && Math.abs(rendered - routeTarget) < 1e-6
      && Math.abs(planeProgress - routeTarget) < 1e-6;
  }, index), { timeout: 10_000, intervals: [50, 100, 200] }).toBe(true);
}

async function spatialSnapshot(page) {
  return page.evaluate(() => {
    const state = window.__FlightFlowFirBridge?.state;
    const round = value => Number(Number(value).toFixed(6));
    const routeTarget = Number(state?.geo?.eventRoutes?.[state.index]?.target);
    return {
      index: state?.index,
      routeTarget: round(routeTarget),
      targetProgress: round(state?.motion?.targetProgress),
      currentProgress: round(state?.motion?.currentProgress),
      renderedProgress: round(state?.renderedProgress),
      plane: {
        x: round(state?.renderedPlane?.x),
        y: round(state?.renderedPlane?.y),
        progress: round(state?.renderedPlane?.progress),
      },
      transitionActive: state?.motion?.ffrpTransition != null,
    };
  });
}

async function resetToCriticalBaseline(page) {
  if (await page.locator('#playBtn').getAttribute('title').then(title => /Pausar/.test(title || ''))) {
    await page.locator('#playBtn').click();
    await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  }

  // A preparação não deve animar do evento 1 até o 78. Ao marcar o motor como
  // não inicializado, o próprio renderScene() de produção usa snapMotionTo(target)
  // para posicionar a aeronave exatamente no baseline. O salto 78 → 79 abaixo
  // continua usando integralmente o caminho real de navegação e animação.
  await page.evaluate(() => {
    const state = window.__FlightFlowFirBridge?.state;
    if (!state?.motion) throw new Error('estado de movimento indisponível');
    state.motion.initialized = false;
    state.motion.ffrpTransition = null;
    state.motion.velocity = 0;
  });

  await setScrubber(page, BASE_INDEX);
  await expect(page.locator('#scrubber')).toHaveValue(String(BASE_INDEX));
  await waitForSpatialSettled(page, BASE_INDEX);
}

async function navigateViaNext(page) {
  await page.locator('#nextBtn').click();
}

async function navigateViaTimeline(page) {
  await page.locator('.tab[data-tab="timeline"]').click();
  await expect(page.locator('[data-panel="timeline"]')).toHaveClass(/active/);
  await page.locator(`.timeline-item[data-event-index="${TARGET_INDEX}"]`).click();
}

async function navigateViaScrubber(page) {
  await setScrubber(page, TARGET_INDEX);
}

async function navigateViaKeyboard(page) {
  await page.keyboard.press('ArrowRight');
}

async function navigateViaAutoplay(page) {
  await page.locator('#speedSelect').selectOption('1');
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/);
  await expect.poll(async () => Number(await page.locator('#scrubber').inputValue()), { timeout: 4_000 })
    .toBe(TARGET_INDEX);
  await page.locator('#playBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
}

test('Próximo, timeline, scrubber, teclado e autoplay convergem para a mesma posição no trecho crítico 78 → 79', async ({ page }) => {
  await loadDemoPaused(page);

  const methods = [
    ['next', navigateViaNext],
    ['timeline', navigateViaTimeline],
    ['scrubber', navigateViaScrubber],
    ['keyboard', navigateViaKeyboard],
    ['autoplay', navigateViaAutoplay],
  ];

  const snapshots = {};
  for (const [name, navigate] of methods) {
    await resetToCriticalBaseline(page);
    await navigate(page);
    await expect(page.locator('#scrubber')).toHaveValue(String(TARGET_INDEX));
    await waitForSpatialSettled(page, TARGET_INDEX);
    snapshots[name] = await spatialSnapshot(page);
  }

  const reference = snapshots.next;
  expect(reference.index).toBe(TARGET_INDEX);
  expect(reference.transitionActive).toBe(false);
  expect(reference.currentProgress).toBe(reference.routeTarget);
  expect(reference.renderedProgress).toBe(reference.routeTarget);
  expect(reference.plane.progress).toBe(reference.routeTarget);

  for (const [name] of methods.slice(1)) {
    expect(snapshots[name], `${name} deve convergir para o mesmo estado espacial de Próximo`).toEqual(reference);
  }
});
