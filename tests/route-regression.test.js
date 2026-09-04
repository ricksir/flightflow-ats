const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function loadRouteApi(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script id="flightflow-route-processed-v7412">([\s\S]*?)<\/script>\s*<!-- flightflow-route-processed-v7412:end -->/);
  assert.ok(m, 'módulo flightflow-route-processed-v7412 deve existir no index.html');
  let source = m[1];
  const initTail = /if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',\(\)=>setTimeout\(init,0\),\{once:true\}\);else setTimeout\(init,0\);/;
  assert.match(source, initTail, 'gancho de inicialização esperado não encontrado');
  source = source.replace(initTail, 'window.FlightFlowRouteProcessedV7412=publicApi();');

  const sandbox = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    fetch: async () => { throw new Error('network disabled in regression test'); },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'flightflow-route-processed-v7412.js' });
  assert.ok(sandbox.FlightFlowRouteProcessedV7412, 'API pública da rota processada deve ser criada');
  return { api: sandbox.FlightFlowRouteProcessedV7412, sandbox };
}

function utcIso(hour, minute, second = 0) {
  return new Date(Date.UTC(2026, 8, 4, hour, minute, second)).toISOString();
}

function geo(ident, lat, lon) {
  return { ident, lat, lon, source: 'fixture regression', kind: /^[A-Z]{4}$/.test(ident) ? 'airport' : 'waypoint' };
}

function point(ident, hhmm, g, passed = false) {
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
}

function installCriticalFixture(api, sandbox) {
  const events = Array.from({ length: 80 }, (_, index) => ({
    index,
    timestamp: new Date(Date.UTC(2026, 8, 4, 0, Math.min(index, 59), 0)).toISOString(),
    operation: `EVENTO ${index + 1}`,
  }));

  // Mantém a sequência cronológica e reproduz a janela crítica 78 → 79 (índices 77 → 78).
  for (let i = 60; i <= 76; i++) {
    events[i].timestamp = utcIso(1, i - 60); // 01:00 ... 01:16
  }
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
    signature: 'fixture-critical-78-79',
  };

  const model = api.getModel();
  model.history = {
    sourceFile: 'fixture-glo1762-regression.txt',
    callsign: 'GLO1762',
    adep: 'SBBS',
    ades: 'SBPJ',
    idPlano: '12345678',
    route: 'SBBS ILKUS PADIL IRISO LIBEC EGDOD IBGAM PMS ILVES MASVA SBPJ',
    routeSegments: { segments: [], positions: [], firstPoints: [], transfers: [] },
    blocksCount: 80,
    events,
    snapshots: [snapshot],
    raw: '',
  };
  model.resolvedSnapshots = [snapshot];
  model.currentSnapshotIndex = 0;
  model.useFinalSnapshot = false;
  model.syncTimeline = true;
  model.routeProgress = 0;
  model.movementProfile = null;

  sandbox.__FlightFlowFirBridge = {
    state: {
      index: 77,
      parsed: { events },
      geo: { eventRoutes: Array.from({ length: events.length }, () => ({})) },
      motion: { velocity: 0 },
    },
  };

  return { events, points, snapshot, model, coords };
}

const ROOT = process.env.FLIGHTFLOW_ROOT || path.resolve(__dirname, '..');
const HTML = process.env.FLIGHTFLOW_HTML || path.resolve(ROOT, 'index.html');
const BASELINE_COMMIT = '73ebac3a9ad2ee4add6cf4a9d5eb2602e1d3bc97';
const BASELINE_SHA256 = '1a4ec449abd99ac34ffd5eeec91baa2c9975058b9459bf1952309c2fe0eac96f';
const { api, sandbox } = loadRouteApi(HTML);

test('baseline Git mantém o SHA-256 conhecido', () => {
  const shown = spawnSync('git', ['show', `${BASELINE_COMMIT}:index.html`], {
    cwd: ROOT, encoding: null, maxBuffer: 8 * 1024 * 1024,
  });
  // Em uma cópia sem o histórico Git completo, usa o index atual apenas como fallback local.
  const bytes = shown.status === 0 ? shown.stdout : fs.readFileSync(HTML);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, BASELINE_SHA256, 'o conteúdo do commit de baseline não pode mudar');
});

test('baseline expõe API pública v7.4.12 necessária aos testes', () => {
  assert.equal(api.version, '7.4.12');
  for (const name of [
    'parseHistory', 'buildMovementProfile', 'progressForNativeEventIndex',
    'routeDistanceFractions', 'candidateProgressFromSnapshot',
    'transitionPlanForEvents', 'transitionDurations', 'getModel'
  ]) assert.equal(typeof api[name], 'function', `${name} deve continuar público`);
});

test('rota crítica mantém ILVES 01:34 antes de MASVA 01:36', () => {
  const { points } = installCriticalFixture(api, sandbox);
  const ilves = points.findIndex(p => p.ident === 'ILVES');
  const masva = points.findIndex(p => p.ident === 'MASVA');
  assert.ok(ilves >= 0 && masva >= 0);
  assert.ok(ilves < masva, 'ILVES deve anteceder MASVA na sequência da rota');
  assert.ok(points[ilves].etimKey < points[masva].etimKey, 'ETIM 01:34 deve anteceder 01:36');
});

test('perfil de movimento nunca regride após a primeira DEP', () => {
  installCriticalFixture(api, sandbox);
  const profile = api.buildMovementProfile();
  assert.equal(profile.startNative, 70, 'primeira recepção DEP deve ancorar a decolagem');
  for (let i = profile.startNative + 1; i < profile.targets.length; i++) {
    assert.ok(profile.targets[i] + 1e-12 >= profile.targets[i - 1], `target regrediu no evento ${i + 1}`);
  }
});

test('evento 78 → 79 não salta PADIL..MASVA e preserva fixos de mesmo ETIM', () => {
  installCriticalFixture(api, sandbox);
  const plan = api.transitionPlanForEvents(77, 78);
  assert.ok(plan, 'plano de transição deve existir');
  assert.equal(plan.forward, true);
  const ids = Array.from(plan.checkpoints, x => x.ident);
  assert.deepEqual(
    ids,
    ['PADIL', 'IRISO', 'LIBEC', 'EGDOD', 'IBGAM', 'PMS', 'ILVES', 'MASVA'],
    'todos os fixos intermediários devem virar checkpoints, na ordem da rota'
  );
  assert.ok(ids.includes('IBGAM') && ids.includes('PMS'), 'fixos com ETIM idêntico não podem ser fundidos');
});

test('retrocesso 79 → 78 percorre os mesmos fixos em ordem inversa', () => {
  installCriticalFixture(api, sandbox);
  const forward = Array.from(api.transitionPlanForEvents(77, 78).checkpoints, x => x.ident);
  const backward = Array.from(api.transitionPlanForEvents(78, 77).checkpoints, x => x.ident);
  assert.deepEqual(backward, [...forward].reverse());
});

test('durações dão uma etapa visual a cada checkpoint intermediário', () => {
  installCriticalFixture(api, sandbox);
  const plan = api.transitionPlanForEvents(77, 78);
  const steps = api.transitionDurations(plan, 1, false);
  const checkpointIds = Array.from(steps).filter(s => !s.eventEnd).map(s => s.ident);
  assert.deepEqual(checkpointIds, Array.from(plan.checkpoints, s => s.ident));
  assert.ok(steps.every(s => Number.isInteger(s.duration) && s.duration >= 240), 'cada etapa manual deve ter duração mínima observável');
});

test('frações de distância são estritamente não decrescentes e terminam em 100%', () => {
  const { points } = installCriticalFixture(api, sandbox);
  const fractions = api.routeDistanceFractions(points);
  assert.equal(fractions[0], 0);
  assert.ok(Math.abs(fractions.at(-1) - 1) < 1e-12);
  for (let i = 1; i < fractions.length; i++) {
    assert.ok(fractions[i] >= fractions[i - 1], `fração regrediu em ${points[i].ident}`);
  }
});

test('mesmo índice nativo resolve sempre o mesmo progresso', () => {
  installCriticalFixture(api, sandbox);
  const profile = api.buildMovementProfile();
  api.getModel().movementProfile = profile;
  const a = api.progressForNativeEventIndex(78, 80);
  const b = api.progressForNativeEventIndex(78, 80);
  assert.equal(a, b, 'progresso deve ser determinístico para o mesmo evento');
});
