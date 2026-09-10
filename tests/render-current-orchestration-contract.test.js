const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'core', 'render-current-controller.js');
const MODULE = fs.readFileSync(MODULE_PATH, 'utf8');

function namedFunctionSource(source, name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${name} deve permanecer no controller extraído`);

  const paramsClose = source.indexOf(')', start + signature.length);
  assert.ok(paramsClose >= 0, `${name} deve possuir parâmetros delimitados`);
  const openBrace = source.indexOf('{', paramsClose + 1);
  assert.ok(openBrace >= 0, `${name} deve possuir corpo`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openBrace; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  assert.fail(`não foi possível delimitar o corpo de ${name}`);
}

function assertOrdered(source, tokens) {
  let cursor = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, cursor + 1);
    assert.ok(index >= 0, `etapa ausente em renderCurrent: ${token}`);
    assert.ok(index > cursor, `ordem inválida em renderCurrent: ${token}`);
    cursor = index;
  }
}

function occurrenceCount(source, token) {
  return source.split(token).length - 1;
}

test('renderCurrent é carregado como módulo antes do núcleo principal e permanece fora do IIFE', () => {
  const tag = '<script id="flightflow-render-current-controller" src="src/core/render-current-controller.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');

  assert.notEqual(tagIndex, -1, 'controller deve estar carregado no index.html');
  assert.notEqual(kernelIndex, -1, 'núcleo principal deve continuar presente');
  assert.ok(tagIndex < kernelIndex, 'controller deve carregar antes do núcleo principal');
  assert.equal(HTML.includes('  function renderCurrent(options = {})'), false, 'renderCurrent não deve voltar ao IIFE principal');
  assert.ok(HTML.includes('const RenderCurrentController = window.FlightFlowRenderCurrentController;'));
  assert.ok(HTML.includes("if (!RenderCurrentController) throw new Error('FlightFlowRenderCurrentController não foi carregado.');"));
  assert.ok(HTML.includes('const { renderCurrent } = RenderCurrentController.create({'));
});

test('renderCurrent mantém precondição e sincronização básica do evento atual', () => {
  const source = namedFunctionSource(MODULE, 'renderCurrent');

  assertOrdered(source, [
    'const event = currentEvent();',
    'if (!event) return;',
    'const snapshot = event.snapshot;',
    'const total = state.parsed.events.length;',
    "els.callsignTitle.textContent = snapshot.callsign || state.parsed.meta.callsign || 'ACFT';",
    "els.adepTitle.textContent = snapshot.adep || 'ADEP';",
    "els.adesTitle.textContent = snapshot.ades || 'ADES';",
    "els.planeLabel.textContent = snapshot.callsign || 'ACFT';",
    "els.statusBadge.textContent = snapshot.status || 'SEM ESTADO';",
    'els.stageBadge.textContent = event.stage.label;',
    'els.frameCounter.textContent = `${state.index + 1} / ${total}`;',
    'els.operationTitle.textContent = event.operation;',
    'els.changeCount.textContent = String(event.changes.length);',
    'els.scrubber.value = String(state.index);',
    "els.currentTimeLabel.textContent = event.time || '--:--:--';",
    'els.eventLabel.textContent = `Evento ${state.index + 1} de ${total}`;',
    'els.prevBtn.disabled = state.index <= 0;',
    'els.nextBtn.disabled = state.index >= total - 1;',
  ]);
});

test('renderCurrent preserva a ordem de orquestração visual e operacional', () => {
  const source = namedFunctionSource(MODULE, 'renderCurrent');
  const stages = [
    'renderFields(event);',
    'renderChanges(event);',
    'renderScene(event);',
    'renderRealMapEvent(event);',
    'renderRadarTag(event);',
    'renderCommunication(event);',
    'updateTimelineSelection();',
    'renderOriginalEvent(event);',
    'renderFpv(event);',
    'renderStrip(event);',
    'syncDetachedWindows();',
    'maybeAutoOpenFpv(event);',
    'maybeAutoOpenStrip(event);',
  ];

  assertOrdered(source, stages);
  for (const stage of stages) {
    assert.equal(occurrenceCount(source, stage), 1, `${stage} deve ocorrer exatamente uma vez em renderCurrent`);
  }
});

test('renderCurrent mantém som de transição como último efeito e respeita modo silencioso', () => {
  const source = namedFunctionSource(MODULE, 'renderCurrent');
  const autoStrip = source.indexOf('maybeAutoOpenStrip(event);');
  const sound = source.indexOf('if (!options.silent) playTransitionSound(event);');

  assert.ok(autoStrip >= 0, 'autoabertura do strip deve permanecer na orquestração');
  assert.ok(sound > autoStrip, 'som deve ocorrer somente após renderização e autoaberturas');
  assert.equal(occurrenceCount(source, 'playTransitionSound(event);'), 1, 'som de transição deve ser disparado no máximo uma vez por renderCurrent');
  assert.match(source.slice(sound), /^if \(!options\.silent\) playTransitionSound\(event\);\s*\}$/);
});

test('controller exige explicitamente todas as dependências de renderização', () => {
  const required = [
    'currentEvent', 'statusClass', 'renderFields', 'renderChanges', 'renderScene',
    'renderRealMapEvent', 'renderRadarTag', 'renderCommunication', 'updateTimelineSelection',
    'renderOriginalEvent', 'renderFpv', 'renderStrip', 'syncDetachedWindows',
    'maybeAutoOpenFpv', 'maybeAutoOpenStrip', 'playTransitionSound',
  ];

  for (const name of required) {
    assert.ok(MODULE.includes(`const ${name} = options.${name};`), `dependência ausente: ${name}`);
  }
  assert.ok(MODULE.includes('return Object.freeze({ renderCurrent });'));
  assert.ok(MODULE.includes('return Object.freeze({ create });'));
});


test('controller preserva efeitos, ordem e modo silencioso em execução', () => {
  const Controller = require(MODULE_PATH);
  const element = () => ({ textContent: '', className: '', value: '', disabled: false });
  const els = {
    callsignTitle: element(), adepTitle: element(), adesTitle: element(),
    departureCode: element(), arrivalCode: element(), planeLabel: element(),
    statusBadge: element(), stageBadge: element(), frameCounter: element(),
    operationTitle: element(), captionTitle: element(), captionText: element(),
    changeCount: element(), scrubber: element(), currentTimeLabel: element(),
    eventLabel: element(), prevBtn: element(), nextBtn: element(),
  };
  const event = {
    snapshot: { callsign: 'GLO1762', adep: 'SBBS', ades: 'SBPJ', status: 'ATIVO' },
    stage: { label: 'EM ROTA' },
    operation: 'EVENTO 79 — após MASVA',
    messageType: 'CPL',
    description: 'Descrição operacional',
    changes: [{ key: 'route' }],
    time: '01:37',
  };
  const state = {
    index: 1,
    parsed: { meta: { callsign: 'FALLBACK' }, events: [{}, event] },
  };
  const calls = [];
  const effect = name => (...args) => calls.push({ name, args });
  const controller = Controller.create({
    state,
    els,
    currentEvent: () => event,
    statusClass: () => 'status-active',
    renderFields: effect('renderFields'),
    renderChanges: effect('renderChanges'),
    renderScene: effect('renderScene'),
    renderRealMapEvent: effect('renderRealMapEvent'),
    renderRadarTag: effect('renderRadarTag'),
    renderCommunication: effect('renderCommunication'),
    updateTimelineSelection: effect('updateTimelineSelection'),
    renderOriginalEvent: effect('renderOriginalEvent'),
    renderFpv: effect('renderFpv'),
    renderStrip: effect('renderStrip'),
    syncDetachedWindows: effect('syncDetachedWindows'),
    maybeAutoOpenFpv: effect('maybeAutoOpenFpv'),
    maybeAutoOpenStrip: effect('maybeAutoOpenStrip'),
    playTransitionSound: effect('playTransitionSound'),
  });

  controller.renderCurrent();

  assert.equal(els.callsignTitle.textContent, 'GLO1762');
  assert.equal(els.adepTitle.textContent, 'SBBS');
  assert.equal(els.adesTitle.textContent, 'SBPJ');
  assert.equal(els.departureCode.textContent, 'SBBS');
  assert.equal(els.arrivalCode.textContent, 'SBPJ');
  assert.equal(els.planeLabel.textContent, 'GLO1762');
  assert.equal(els.statusBadge.textContent, 'ATIVO');
  assert.equal(els.statusBadge.className, 'status-badge status-active');
  assert.equal(els.stageBadge.textContent, 'EM ROTA');
  assert.equal(els.frameCounter.textContent, '2 / 2');
  assert.equal(els.operationTitle.textContent, 'EVENTO 79 — após MASVA');
  assert.equal(els.captionTitle.textContent, 'EM ROTA · CPL');
  assert.equal(els.captionText.textContent, 'Descrição operacional');
  assert.equal(els.changeCount.textContent, '1');
  assert.equal(els.scrubber.value, '1');
  assert.equal(els.currentTimeLabel.textContent, '01:37');
  assert.equal(els.eventLabel.textContent, 'Evento 2 de 2');
  assert.equal(els.prevBtn.disabled, false);
  assert.equal(els.nextBtn.disabled, true);

  assert.deepEqual(calls.map(call => call.name), [
    'renderFields', 'renderChanges', 'renderScene', 'renderRealMapEvent',
    'renderRadarTag', 'renderCommunication', 'updateTimelineSelection',
    'renderOriginalEvent', 'renderFpv', 'renderStrip', 'syncDetachedWindows',
    'maybeAutoOpenFpv', 'maybeAutoOpenStrip', 'playTransitionSound',
  ]);
  for (const call of calls.filter(call => !['updateTimelineSelection', 'syncDetachedWindows'].includes(call.name))) {
    assert.strictEqual(call.args[0], event, `${call.name} deve receber o mesmo evento corrente`);
  }

  calls.length = 0;
  controller.renderCurrent({ silent: true });
  assert.equal(calls.some(call => call.name === 'playTransitionSound'), false, 'modo silencioso deve suprimir somente o som');
  assert.deepEqual(calls.map(call => call.name), [
    'renderFields', 'renderChanges', 'renderScene', 'renderRealMapEvent',
    'renderRadarTag', 'renderCommunication', 'updateTimelineSelection',
    'renderOriginalEvent', 'renderFpv', 'renderStrip', 'syncDetachedWindows',
    'maybeAutoOpenFpv', 'maybeAutoOpenStrip',
  ]);
});

test('controller não produz efeitos quando não há evento corrente', () => {
  const Controller = require(MODULE_PATH);
  const calls = [];
  const noop = () => calls.push('effect');
  const controller = Controller.create({
    state: { index: 0, parsed: { meta: {}, events: [] } },
    els: {},
    currentEvent: () => null,
    statusClass: () => '',
    renderFields: noop,
    renderChanges: noop,
    renderScene: noop,
    renderRealMapEvent: noop,
    renderRadarTag: noop,
    renderCommunication: noop,
    updateTimelineSelection: noop,
    renderOriginalEvent: noop,
    renderFpv: noop,
    renderStrip: noop,
    syncDetachedWindows: noop,
    maybeAutoOpenFpv: noop,
    maybeAutoOpenStrip: noop,
    playTransitionSound: noop,
  });

  assert.equal(controller.renderCurrent(), undefined);
  assert.deepEqual(calls, []);
});
