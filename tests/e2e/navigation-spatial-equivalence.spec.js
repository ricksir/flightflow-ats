const { test, expect } = require('@playwright/test');

const BASE_INDEX = 77; // Evento 78 — antes de PADIL
const TARGET_INDEX = 78; // Evento 79 — após MASVA
const TEST_TIMEOUT_MS = 60_000;

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

async function snapToIndex(page, index) {
  if (await page.locator('#playBtn').getAttribute('title').then(title => /Pausar/.test(title || ''))) {
    await page.locator('#playBtn').click();
    await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  }

  // A preparação não deve introduzir uma animação longa e irrelevante. Ao marcar
  // o motor como não inicializado, o próprio renderScene() de produção usa
  // snapMotionTo(target) para posicionar a aeronave exatamente no índice pedido.
  await page.evaluate(() => {
    const state = window.__FlightFlowFirBridge?.state;
    if (!state?.motion) throw new Error('estado de movimento indisponível');
    state.motion.initialized = false;
    state.motion.ffrpTransition = null;
    state.motion.velocity = 0;
  });

  await setScrubber(page, index);
  await expect(page.locator('#scrubber')).toHaveValue(String(index));
  await waitForSpatialSettled(page, index);
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

  // O autoplay agenda continuamente o próximo evento enquanto state.playing=true.
  // Para testar exatamente a transição 78 → 79 sem deixar o relógio avançar para o
  // evento seguinte, iniciamos pelo botão real e o pausamos pelo mesmo botão assim
  // que o estado de produção alcançar o índice-alvo. O requestAnimationFrame fecha
  // a janela de corrida do polling externo sem chamar nenhuma API interna de teste.
  await page.evaluate(targetIndex => new Promise((resolve, reject) => {
    const playBtn = document.querySelector('#playBtn');
    if (!playBtn) {
      reject(new Error('botão de autoplay indisponível'));
      return;
    }

    const deadline = performance.now() + 4_000;
    const watchTarget = () => {
      const state = window.__FlightFlowFirBridge?.state;
      if (state?.index === targetIndex) {
        if (state.playing) playBtn.click();
        resolve();
        return;
      }
      if (performance.now() >= deadline) {
        reject(new Error(`autoplay não alcançou o índice ${targetIndex} no prazo esperado`));
        return;
      }
      requestAnimationFrame(watchTarget);
    };

    playBtn.click();
    requestAnimationFrame(watchTarget);
  }), TARGET_INDEX);

  await expect(page.locator('#scrubber')).toHaveValue(String(TARGET_INDEX));
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
}

const methods = [
  ['Próximo', navigateViaNext],
  ['timeline', navigateViaTimeline],
  ['scrubber', navigateViaScrubber],
  ['teclado', navigateViaKeyboard],
  ['autoplay', navigateViaAutoplay],
];

for (const [name, navigate] of methods) {
  test(`${name} converge para a posição espacial canônica no trecho crítico 78 → 79`, async ({ page }) => {
    // Este cenário faz dois snaps determinísticos, carregamento da demo e a
    // transição real 78 → 79. Mantemos cada espera funcional curta e rígida;
    // ampliamos somente o orçamento total deste teste, sem alterar produção.
    test.setTimeout(TEST_TIMEOUT_MS);

    await loadDemoPaused(page);

    // O target canônico é obtido pelo snap determinístico já existente em produção.
    // Depois voltamos ao Evento 78 e exercitamos integralmente o caminho real 78 → 79.
    await snapToIndex(page, TARGET_INDEX);
    const expected = await spatialSnapshot(page);
    expect(expected.index).toBe(TARGET_INDEX);
    expect(expected.transitionActive).toBe(false);
    expect(expected.currentProgress).toBe(expected.routeTarget);
    expect(expected.renderedProgress).toBe(expected.routeTarget);
    expect(expected.plane.progress).toBe(expected.routeTarget);

    await snapToIndex(page, BASE_INDEX);
    await navigate(page);
    await expect(page.locator('#scrubber')).toHaveValue(String(TARGET_INDEX));
    await waitForSpatialSettled(page, TARGET_INDEX);

    const actual = await spatialSnapshot(page);
    expect(actual, `${name} deve convergir para o mesmo estado espacial canônico`).toEqual(expected);
  });
}
