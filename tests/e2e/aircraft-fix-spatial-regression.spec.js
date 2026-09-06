const { test, expect } = require('@playwright/test');

const EXPECTED_FIXES = ['PADIL', 'IRISO', 'LIBEC', 'EGDOD', 'IBGAM', 'PMS', 'ILVES', 'MASVA'];

function installCriticalFixtureInBrowser() {
  const api = window.FlightFlowRouteProcessedV7412;
  const Motion = window.FlightFlowAircraftMotionController;
  if (!api) throw new Error('FlightFlowRouteProcessedV7412 não carregado');
  if (!Motion) throw new Error('FlightFlowAircraftMotionController não carregado');

  const utcIso = (hour, minute, second = 0) => new Date(Date.UTC(2026, 8, 4, hour, minute, second)).toISOString();
  const geo = (ident, lat, lon) => ({ ident, lat, lon, source: 'fixture e2e 78-79', kind: /^[A-Z]{4}$/.test(ident) ? 'airport' : 'waypoint' });
  const point = (ident, hhmm, g, passed = false) => {
    const [hour, minute] = hhmm.split(':').map(Number);
    const etim = `04-${hhmm}`;
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

  const events = Array.from({ length: 80 }, (_, index) => ({
    index,
    timestamp: new Date(Date.UTC(2026, 8, 4, 0, Math.min(index, 59), 0)).toISOString(),
    operation: `EVENTO ${index + 1}`,
  }));
  for (let i = 60; i <= 76; i += 1) events[i].timestamp = utcIso(1, i - 60);
  events[70].timestamp = utcIso(1, 10);
  events[70].operation = 'RECEPÇÃO DE MENSAGEM DEP';
  events[77].timestamp = utcIso(1, 20);
  events[77].operation = 'EVENTO 78 — antes de PADIL';
  events[78].timestamp = utcIso(1, 37);
  events[78].operation = 'EVENTO 79 — após MASVA';
  events[79].timestamp = utcIso(1, 45);
  events[79].operation = 'ARR / TÉRMINO';

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
    signature: 'fixture-critical-78-79-e2e',
  };

  const model = api.getModel();
  model.history = {
    sourceFile: 'fixture-glo1762-e2e.txt', callsign: 'GLO1762', adep: 'SBBS', ades: 'SBPJ',
    idPlano: '12345678', route: 'SBBS ILKUS PADIL IRISO LIBEC EGDOD IBGAM PMS ILVES MASVA SBPJ',
    routeSegments: { segments: [], positions: [], firstPoints: [], transfers: [] },
    blocksCount: 80, events, snapshots: [snapshot], raw: '',
  };
  model.resolvedSnapshots = [snapshot];
  model.currentSnapshotIndex = 0;
  model.useFinalSnapshot = false;
  model.syncTimeline = true;
  model.routeProgress = 0;
  model.movementProfile = null;

  const bridge = window.__FlightFlowFirBridge;
  if (!bridge?.state) throw new Error('__FlightFlowFirBridge.state indisponível');
  if (bridge.state.motion?.raf) cancelAnimationFrame(bridge.state.motion.raf);
  bridge.state.parsed = { events };
  bridge.state.index = 77;

  const profile = api.buildMovementProfile();
  model.movementProfile = profile;
  const plan = api.transitionPlanForEvents(77, 78);
  const steps = api.transitionDurations(plan, 16, true);
  const fractions = api.routeDistanceFractions(points);
  const pixelPoints = points.map((p, i) => ({ ident: p.ident, x: 100 + fractions[i] * 1200, y: 450 }));
  const expectedByIdent = Object.fromEntries(pixelPoints.map(p => [p.ident, p]));

  const eventRoutes = Array.from({ length: events.length }, (_, index) => ({ points: pixelPoints, target: profile.targets[index] }));
  const motionState = {
    parsed: { events },
    index: 78,
    playing: true,
    speed: 16,
    geo: { eventRoutes },
    motion: {
      initialized: true,
      targetProgress: plan.toProgress,
      currentProgress: plan.fromProgress,
      velocity: 0,
      heading: 90,
      pitch: 0,
      bank: 0,
      lastFrame: performance.now(),
      lastPoint: { x: pixelPoints[0].x, y: pixelPoints[0].y },
      ffrpTransition: {
        mode: 'waypoints', from: plan.fromProgress, to: plan.toProgress,
        steps, stepIndex: 0, stepFrom: plan.fromProgress,
        stepStart: performance.now(), plan,
      },
      raf: 0,
    },
    renderedProgress: plan.fromProgress,
    renderedPlane: { x: pixelPoints[0].x, y: pixelPoints[0].y, angle: 90, heading: 90, progress: plan.fromProgress, scale: 1 },
    lastPlane: { x: pixelPoints[0].x, y: pixelPoints[0].y },
  };

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '1px';
  svg.style.height = '1px';
  svg.style.overflow = 'hidden';
  const planeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const completedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.append(planeGroup, completedPath);
  document.body.appendChild(svg);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
  const clamp01 = value => clamp(value, 0, 1);
  const pointAlongPolyline = (route, progress) => {
    const lengths = [];
    let total = 0;
    for (let i = 1; i < route.length; i += 1) {
      const length = Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
      lengths.push(length);
      total += length;
    }
    const target = clamp01(progress) * total;
    let walked = 0;
    for (let i = 1; i < route.length; i += 1) {
      const length = lengths[i - 1];
      if (target <= walked + length || i === route.length - 1) {
        const local = length > 0 ? clamp((target - walked) / length, 0, 1) : 0;
        return {
          point: {
            x: route[i - 1].x + (route[i].x - route[i - 1].x) * local,
            y: route[i - 1].y + (route[i].y - route[i - 1].y) * local,
          },
          index: i,
        };
      }
      walked += length;
    }
    return { point: route.at(-1), index: route.length - 1 };
  };

  const controller = Motion.create({
    state: motionState,
    els: { planeGroup, completedPath },
    pointAlongPolyline,
    clamp01,
    getCurrentMapSymbolScale: () => 1,
    smoothPath: () => '',
    slicePolyline: route => ({ prefix: route }),
    updateRadarTagPosition: () => {},
    maybeFollowAircraft: () => {},
    updateRealMapAircraft: () => {},
    clamp,
  });

  return { controller, motionState, plan, steps, expectedByIdent, planeGroup, svg };
}

test('78 → 79 renderiza a aeronave exatamente em PADIL..MASVA, sem pular fixos', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await expect.poll(() => page.evaluate(() => Boolean(window.FlightFlowRouteProcessedV7412 && window.FlightFlowAircraftMotionController))).toBe(true);

  const result = await page.evaluate(async ({ expectedFixes }) => {
    const { controller, motionState, plan, expectedByIdent, planeGroup, svg } = installCriticalFixtureInBrowser();
    const crossed = [];

    const onCrossed = event => {
      const ident = event.detail?.ident || '';
      if (!expectedFixes.includes(ident)) return;
      const expected = expectedByIdent[ident];
      const transform = planeGroup.getAttribute('transform') || '';
      const match = transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
      crossed.push({
        ident,
        progress: event.detail.progress,
        eventIndex: event.detail.eventIndex,
        rendered: { x: motionState.renderedPlane.x, y: motionState.renderedPlane.y },
        expected: { x: expected.x, y: expected.y },
        transform: match ? { x: Number(match[1]), y: Number(match[2]) } : null,
      });
    };
    window.addEventListener('flightflow:route-fix-crossed', onCrossed);
    controller.startMotionLoop();

    const deadline = performance.now() + 8_000;
    while (crossed.length < expectedFixes.length && performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (motionState.motion.raf) cancelAnimationFrame(motionState.motion.raf);
    window.removeEventListener('flightflow:route-fix-crossed', onCrossed);
    svg.remove();

    return {
      crossed,
      planFixes: plan.checkpoints.map(cp => cp.ident),
      fromProgress: plan.fromProgress,
      toProgress: plan.toProgress,
    };
  }, { expectedFixes: EXPECTED_FIXES });

  expect(result.planFixes).toEqual(EXPECTED_FIXES);
  expect(result.crossed.map(item => item.ident)).toEqual(EXPECTED_FIXES);

  for (const item of result.crossed) {
    expect(item.eventIndex).toBe(78);
    expect(Math.hypot(item.rendered.x - item.expected.x, item.rendered.y - item.expected.y)).toBeLessThan(1e-6);
    expect(item.transform).not.toBeNull();
    expect(Math.hypot(item.transform.x - item.expected.x, item.transform.y - item.expected.y)).toBeLessThan(0.08);
  }

  const ilves = result.crossed.findIndex(item => item.ident === 'ILVES');
  const masva = result.crossed.findIndex(item => item.ident === 'MASVA');
  expect(ilves).toBeGreaterThanOrEqual(0);
  expect(masva).toBeGreaterThan(ilves);
});
