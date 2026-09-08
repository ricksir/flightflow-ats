const { test, expect } = require('@playwright/test');

const BASE_INDEX = 77; // Evento 78 — antes de PADIL
const TARGET_INDEX = 78; // Evento 79 — após MASVA
const TEST_TIMEOUT_MS = 60_000;
const METHOD_FILTER = String(process.env.SPATIAL_EQ_METHOD || '').trim().toLowerCase();
const EXPECTED_FIXES = ['PADIL', 'IRISO', 'LIBEC', 'EGDOD', 'IBGAM', 'PMS', 'ILVES', 'MASVA'];

async function installCriticalFixture(page) {
  return page.evaluate(({ baseIndex, targetIndex }) => {
    const bridge = window.__FlightFlowFirBridge;
    const api = window.FlightFlowRouteProcessedV7412;
    const state = bridge?.state;
    if (!state?.parsed?.events?.length) throw new Error('demo base não carregada');
    if (!api) throw new Error('FlightFlowRouteProcessedV7412 não carregado');

    const utcIso = (hour, minute, second = 0) => new Date(Date.UTC(2026, 8, 4, hour, minute, second)).toISOString();
    const eventTimestamp = index => {
      if (index <= 59) return utcIso(0, index);
      if (index <= 76) return utcIso(1, index - 60);
      if (index === 77) return utcIso(1, 20);
      if (index === 78) return utcIso(1, 37);
      return utcIso(1, 45);
    };
    const hhmm = iso => iso.slice(11, 16);

    // A demo embarcada possui menos eventos que o histórico operacional protegido.
    // Preservamos o formato real dos eventos da demo e estendemos somente o fixture
    // E2E para 80 eventos, sem alterar qualquer código de produção.
    const seedEvents = state.parsed.events;
    const events = Array.from({ length: 80 }, (_, index) => {
      const seed = seedEvents[Math.min(index, seedEvents.length - 1)];
      const clone = JSON.parse(JSON.stringify(seed));
      const timestamp = eventTimestamp(index);
      clone.index = index;
      clone.time = hhmm(timestamp);
      clone.operation = `EVENTO ${index + 1}`;
      return clone;
    });
    events[70].operation = 'RECEPÇÃO DE MENSAGEM DEP';
    events[77].operation = 'EVENTO 78 — antes de PADIL';
    events[78].operation = 'EVENTO 79 — após MASVA';
    events[79].operation = 'ARR / TÉRMINO';

    const historyEvents = events.map((event, index) => ({
      index,
      timestamp: eventTimestamp(index),
      operation: event.operation,
    }));

    const geo = (ident, lat, lon) => ({
      ident,
      lat,
      lon,
      source: 'fixture e2e navigation equivalence',
      kind: /^[A-Z]{4}$/.test(ident) ? 'airport' : 'waypoint',
    });
    const point = (ident, time, g, passed = false) => {
      const [hour, minute] = time.split(':').map(Number);
      const etim = `04-${time}`;
      return {
        ident,
        etim,
        etimRaw: passed ? `${etim}*` : etim,
        passed,
        cfl: 'F350',
        etimKey: Date.UTC(2026, 8, 4, hour, minute, 0),
        geo: g,
      };
    };

    const coords = {
      SBBS: geo('SBBS', -15.8692, -47.9208),
      ILKUS: geo('ILKUS', -14.9230555556, -48.1988888889),
      PADIL: geo('PADIL', -12.4402777778, -48.2675),
      IRISO: geo('IRISO', -11.6894444444, -48.2880555556),
      LIBEC: geo('LIBEC', -11.2908333333, -48.2988888889),
      EGDOD: geo('EGDOD', -10.9594444444, -48.3205555556),
      IBGAM: geo('IBGAM', -10.335, -48.3558333333),
      PMS: geo('PMS', -10.2880555556, -48.3586111111),
      ILVES: geo('ILVES', -9.7858333333, -48.3658333333),
      MASVA: geo('MASVA', -9.6213888889, -48.3677777778),
      SBPJ: geo('SBPJ', -10.2915, -48.3570),
    };
    const points = [
      point('SBBS', '01:10', coords.SBBS, true),
      point('ILKUS', '01:18', coords.ILKUS, true),
      point('PADIL', '01:24', coords.PADIL),
      point('IRISO', '01:27', coords.IRISO),
      point('LIBEC', '01:29', coords.LIBEC),
      point('EGDOD', '01:31', coords.EGDOD),
      point('IBGAM', '01:33', coords.IBGAM),
      point('PMS', '01:33', coords.PMS),
      point('ILVES', '01:34', coords.ILVES),
      point('MASVA', '01:36', coords.MASVA),
      point('SBPJ', '01:45', coords.SBPJ),
    ];
    const snapshot = {
      blockIndex: 70,
      eventDt: { key: Date.UTC(2026, 8, 4, 1, 10, 0) },
      operation: 'ROTA PROCESSADA APÓS DEP',
      points,
      signature: 'fixture-critical-78-79-navigation-equivalence',
    };

    const model = api.getModel();
    model.history = {
      sourceFile: 'fixture-glo1762-navigation-equivalence.txt',
      callsign: 'GLO1762',
      adep: 'SBBS',
      ades: 'SBPJ',
      idPlano: '12345678',
      route: 'SBBS ILKUS PADIL IRISO LIBEC EGDOD IBGAM PMS ILVES MASVA SBPJ',
      routeSegments: { segments: [], positions: [], firstPoints: [], transfers: [] },
      blocksCount: 80,
      events: historyEvents,
      snapshots: [snapshot],
      raw: '',
    };
    model.resolvedSnapshots = [snapshot];
    model.currentSnapshotIndex = 0;
    model.useFinalSnapshot = false;
    model.syncTimeline = true;
    model.routeProgress = 0;
    model.movementProfile = null;

    const profile = api.buildMovementProfile();
    model.movementProfile = profile;
    const plan = api.transitionPlanForEvents(baseIndex, targetIndex);
    const fractions = api.routeDistanceFractions(points);
    const pixelPoints = points.map((p, index) => ({
      ident: p.ident,
      x: 100 + fractions[index] * 1200,
      y: 450,
    }));

    state.parsed = { ...state.parsed, events };
    state.index = 0;
    state.playing = false;
    state.speed = 1;
    state.geo = state.geo || {};
    state.geo.eventRoutes = Array.from({ length: events.length }, (_, index) => ({
      points: pixelPoints,
      target: profile.targets[index],
    }));

    if (!state.motion) throw new Error('estado de movimento indisponível');
    if (state.motion.raf) cancelAnimationFrame(state.motion.raf);
    state.motion.initialized = false;
    state.motion.ffrpTransition = null;
    state.motion.velocity = 0;
    state.motion.targetProgress = Number(profile.targets[0]) || 0;
    state.motion.currentProgress = Number(profile.targets[0]) || 0;
    state.renderedProgress = Number(profile.targets[0]) || 0;

    const scrubber = document.querySelector('#scrubber');
    if (!scrubber) throw new Error('scrubber indisponível');
    scrubber.min = '0';
    scrubber.max = String(events.length - 1);
    scrubber.value = '0';

    // Reutilizamos um item de timeline criado pelo controlador real. O listener de
    // produção lê data-event-index no momento do clique, então trocar somente o
    // dataset permite exercitar o goTo() real para o índice 78 sem reconstruir UI.
    const timelineItems = [...document.querySelectorAll('.timeline-item')];
    const targetItem = timelineItems.at(-1);
    if (!targetItem) throw new Error('timeline real indisponível');
    targetItem.dataset.eventIndex = String(targetIndex);
    const numberEl = targetItem.querySelector('.timeline-event-number');
    if (numberEl) numberEl.textContent = `EVENTO ${String(targetIndex + 1).padStart(2, '0')}`;

    return {
      parsedEventCount: state.parsed.events.length,
      sourceTimelineCount: timelineItems.length,
      planFixes: Array.isArray(plan?.checkpoints) ? plan.checkpoints.map(cp => cp.ident) : [],
      scrubberMax: scrubber.max,
    };
  }, { baseIndex: BASE_INDEX, targetIndex: TARGET_INDEX });
}

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

  const fixture = await installCriticalFixture(page);
  expect(fixture.parsedEventCount).toBeGreaterThan(TARGET_INDEX);
  expect(fixture.planFixes).toEqual(EXPECTED_FIXES);
  expect(Number(fixture.scrubberMax)).toBeGreaterThanOrEqual(TARGET_INDEX);
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
  }, index), { timeout: 12_000, intervals: [50, 100, 200] }).toBe(true);
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

async function collectDiagnostic(page) {
  return page.evaluate(() => {
    const state = window.__FlightFlowFirBridge?.state;
    const finiteOrNull = value => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };
    const index = Number.isInteger(state?.index) ? state.index : null;
    const routeTarget = index == null
      ? null
      : finiteOrNull(state?.geo?.eventRoutes?.[index]?.target);

    return {
      index,
      playing: typeof state?.playing === 'boolean' ? state.playing : null,
      parsedEventCount: Array.isArray(state?.parsed?.events) ? state.parsed.events.length : null,
      routeTarget,
      motion: state?.motion ? {
        initialized: Boolean(state.motion.initialized),
        targetProgress: finiteOrNull(state.motion.targetProgress),
        currentProgress: finiteOrNull(state.motion.currentProgress),
        renderedProgress: finiteOrNull(state.renderedProgress),
        velocity: finiteOrNull(state.motion.velocity),
        transitionActive: state.motion.ffrpTransition != null,
      } : null,
      renderedPlane: state?.renderedPlane ? {
        x: finiteOrNull(state.renderedPlane.x),
        y: finiteOrNull(state.renderedPlane.y),
        progress: finiteOrNull(state.renderedPlane.progress),
      } : null,
      scrubber: document.querySelector('#scrubber')?.value ?? null,
      scrubberMax: document.querySelector('#scrubber')?.max ?? null,
      playTitle: document.querySelector('#playBtn')?.title ?? null,
      speed: document.querySelector('#speedSelect')?.value ?? null,
      activeTimelineIndex: document.querySelector('.timeline-item.active')?.getAttribute('data-event-index') ?? null,
    };
  });
}

async function emitFailureDiagnostic({ page, testInfo, method, phase, expected, actual, error }) {
  const observed = actual ?? await spatialSnapshot(page).catch(() => null);
  const state = await collectDiagnostic(page).catch(() => null);
  const payload = {
    method,
    phase,
    expected,
    actual: observed,
    state,
    error: error instanceof Error ? error.message : String(error),
  };
  const compact = JSON.stringify(payload);

  console.log(`SPATIAL_EQ_DIAG=${compact}`);
  await testInfo.attach('spatial-equivalence-diagnostic', {
    body: Buffer.from(JSON.stringify(payload, null, 2)),
    contentType: 'application/json',
  });
}

async function snapToIndex(page, index) {
  if (await page.locator('#playBtn').getAttribute('title').then(title => /Pausar/.test(title || ''))) {
    await page.locator('#playBtn').click();
    await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
  }

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

async function startFixCapture(page) {
  await page.evaluate(expectedFixes => {
    const prior = window.__spatialEqFixCapture;
    if (prior?.handler) window.removeEventListener('flightflow:route-fix-crossed', prior.handler);

    const crossed = [];
    const handler = event => {
      const ident = event.detail?.ident || '';
      if (event.detail?.eventIndex !== 78 || !expectedFixes.includes(ident)) return;
      crossed.push(ident);
    };
    window.__spatialEqFixCapture = { crossed, handler };
    window.addEventListener('flightflow:route-fix-crossed', handler);
  }, EXPECTED_FIXES);
}

async function stopFixCapture(page) {
  return page.evaluate(() => {
    const capture = window.__spatialEqFixCapture;
    if (!capture) return [];
    window.removeEventListener('flightflow:route-fix-crossed', capture.handler);
    const crossed = [...capture.crossed];
    delete window.__spatialEqFixCapture;
    return crossed;
  });
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
  { slug: 'next', name: 'Próximo', navigate: navigateViaNext },
  { slug: 'timeline', name: 'timeline', navigate: navigateViaTimeline },
  { slug: 'scrubber', name: 'scrubber', navigate: navigateViaScrubber },
  { slug: 'keyboard', name: 'teclado', navigate: navigateViaKeyboard },
  { slug: 'autoplay', name: 'autoplay', navigate: navigateViaAutoplay },
];

const validMethodSlugs = new Set(methods.map(method => method.slug));
if (METHOD_FILTER && !validMethodSlugs.has(METHOD_FILTER)) {
  throw new Error(`SPATIAL_EQ_METHOD inválido: ${METHOD_FILTER}. Use: ${[...validMethodSlugs].join(', ')}`);
}

for (const method of methods) {
  test(`${method.name} converge para a posição espacial canônica no trecho crítico 78 → 79`, async ({ page }, testInfo) => {
    test.skip(Boolean(METHOD_FILTER && METHOD_FILTER !== method.slug), `filtrado por SPATIAL_EQ_METHOD=${METHOD_FILTER}`);
    test.setTimeout(TEST_TIMEOUT_MS);

    let phase = 'load-demo';
    let expected = null;
    let actual = null;

    try {
      await loadDemoPaused(page);

      phase = 'canonical-snap';
      await snapToIndex(page, TARGET_INDEX);
      expected = await spatialSnapshot(page);
      expect(expected.index).toBe(TARGET_INDEX);
      expect(expected.transitionActive).toBe(false);
      expect(expected.currentProgress).toBe(expected.routeTarget);
      expect(expected.renderedProgress).toBe(expected.routeTarget);
      expect(expected.plane.progress).toBe(expected.routeTarget);

      phase = 'base-snap';
      await snapToIndex(page, BASE_INDEX);

      phase = `navigate-${method.slug}`;
      await startFixCapture(page);
      await method.navigate(page);
      await expect(page.locator('#scrubber')).toHaveValue(String(TARGET_INDEX));

      phase = 'wait-spatial-settled';
      await waitForSpatialSettled(page, TARGET_INDEX);

      phase = 'verify-fix-sequence';
      const crossed = await stopFixCapture(page);
      expect(crossed, `${method.name} deve atravessar todos os fixos protegidos na ordem`).toEqual(EXPECTED_FIXES);

      phase = 'compare-canonical';
      actual = await spatialSnapshot(page);
      expect(actual, `${method.name} deve convergir para o mesmo estado espacial canônico`).toEqual(expected);
    } catch (error) {
      await emitFailureDiagnostic({
        page,
        testInfo,
        method: method.slug,
        phase,
        expected,
        actual,
        error,
      }).catch(diagnosticError => {
        console.log(`SPATIAL_EQ_DIAG_ERROR=${JSON.stringify({
          method: method.slug,
          phase,
          error: diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError),
        })}`);
      });
      throw error;
    }
  });
}
