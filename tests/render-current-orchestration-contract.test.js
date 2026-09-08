const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const index = html.indexOf(anchor);
  assert.ok(index >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', index);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', index);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart, 'IIFE principal deve continuar delimitado');
  return html.slice(bodyStart, close);
}

function namedFunctionSource(source, name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${name} deve permanecer no núcleo principal`);

  const openBrace = source.indexOf('{', start + signature.length);
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

test('renderCurrent mantém precondição e sincronização básica do evento atual', () => {
  const source = namedFunctionSource(kernelSource(), 'renderCurrent');

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
  const source = namedFunctionSource(kernelSource(), 'renderCurrent');
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
  const source = namedFunctionSource(kernelSource(), 'renderCurrent');
  const autoStrip = source.indexOf('maybeAutoOpenStrip(event);');
  const sound = source.indexOf('if (!options.silent) playTransitionSound(event);');

  assert.ok(autoStrip >= 0, 'autoabertura do strip deve permanecer na orquestração');
  assert.ok(sound > autoStrip, 'som deve ocorrer somente após renderização e autoaberturas');
  assert.equal(occurrenceCount(source, 'playTransitionSound(event);'), 1, 'som de transição deve ser disparado no máximo uma vez por renderCurrent');
  assert.match(source.slice(sound), /^if \(!options\.silent\) playTransitionSound\(event\);\s*\}$/);
});
