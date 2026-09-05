'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function occurrences(needle) {
  return html.split(needle).length - 1;
}

function requireOnce(needle, message = needle) {
  assert.equal(occurrences(needle), 1, `${message}: esperado exatamente uma ocorrência`);
}

function orderWithin(block, needles) {
  let cursor = -1;
  for (const needle of needles) {
    const next = block.indexOf(needle);
    assert.notEqual(next, -1, `trecho ausente: ${needle}`);
    assert.ok(next > cursor, `ordem alterada perto de: ${needle}`);
    cursor = next;
  }
}

function sliceBetween(start, end) {
  const startIndex = html.indexOf(start);
  assert.notEqual(startIndex, -1, `início não encontrado: ${start}`);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `fim não encontrado: ${end}`);
  return html.slice(startIndex, endIndex + end.length);
}

test('bindings de transporte permanecem únicos e explícitos no init', () => {
  requireOnce("els.restartBtn.addEventListener('click', () => { stopPlayback(); snapMotionTo(0); goTo(0, { silent: true }); });", 'Restart');
  requireOnce("els.prevBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index - 1); });", 'Anterior');
  requireOnce("els.nextBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index + 1); });", 'Próximo');
  requireOnce("els.playBtn.addEventListener('click', togglePlayback);", 'Play/Pause');
  requireOnce("els.scrubber.addEventListener('input', () => { stopPlayback(); goTo(Number(els.scrubber.value)); });", 'Scrubber');
});

test('Restart para playback, zera movimento e só então navega silenciosamente ao evento zero', () => {
  const line = "els.restartBtn.addEventListener('click', () => { stopPlayback(); snapMotionTo(0); goTo(0, { silent: true }); });";
  orderWithin(line, ['stopPlayback();', 'snapMotionTo(0);', 'goTo(0, { silent: true });']);
});

test('Anterior, Próximo e scrubber sempre interrompem playback antes de chamar goTo', () => {
  const previous = "els.prevBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index - 1); });";
  const next = "els.nextBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index + 1); });";
  const scrubber = "els.scrubber.addEventListener('input', () => { stopPlayback(); goTo(Number(els.scrubber.value)); });";
  orderWithin(previous, ['stopPlayback();', 'goTo(state.index - 1);']);
  orderWithin(next, ['stopPlayback();', 'goTo(state.index + 1);']);
  orderWithin(scrubber, ['stopPlayback();', 'goTo(Number(els.scrubber.value));']);
});

test('Play/Pause continua delegado diretamente ao controlador de playback', () => {
  requireOnce("els.playBtn.addEventListener('click', togglePlayback);");
  assert.equal(occurrences("els.playBtn.addEventListener('click', () =>"), 0, 'Play não deve ganhar lógica paralela inline');
});

test('alvos editáveis de teclado preservam input, textarea, select, button e contenteditable', () => {
  const block = sliceBetween('function isKeyboardEditableTarget(target) {', '\n  }');
  assert.match(block, /\['input', 'textarea', 'select', 'button'\]\.includes\(tag\)/);
  assert.match(block, /target\.isContentEditable/);
  assert.match(block, /target\.closest\('\[contenteditable="true"\]'\)/);
});

test('handler global ignora eventos já tratados, alvos editáveis e modificadores não-Space', () => {
  const block = sliceBetween("document.addEventListener('keydown', event => {", '\n  });');
  orderWithin(block, [
    'if (event.defaultPrevented) return;',
    'if (isKeyboardEditableTarget(event.target)) return;',
    "if ((event.ctrlKey || event.metaKey || event.altKey) && event.code !== 'Space') return;",
  ]);
});

test('Space é tratado antes da exigência de histórico carregado e apenas alterna playback', () => {
  const block = sliceBetween("document.addEventListener('keydown', event => {", '\n  });');
  orderWithin(block, [
    "if (event.code === 'Space') {",
    'event.preventDefault();',
    'togglePlayback();',
    'return;',
    "if (!state.parsed?.events?.length) return;",
  ]);
});

test('setas, Home e End preservam destinos e interrompem playback antes de navegar', () => {
  const block = sliceBetween("document.addEventListener('keydown', event => {", '\n  });');
  requireOnce("if (event.key === 'ArrowLeft') { event.preventDefault(); stopPlayback(); goTo(state.index - 1); }");
  requireOnce("if (event.key === 'ArrowRight') { event.preventDefault(); stopPlayback(); goTo(state.index + 1); }");
  requireOnce("if (event.key === 'Home') { event.preventDefault(); stopPlayback(); goTo(0); }");
  requireOnce("if (event.key === 'End') { event.preventDefault(); stopPlayback(); goTo(state.parsed.events.length - 1); }");
  orderWithin(block, [
    "event.key === 'ArrowLeft'",
    "event.key === 'ArrowRight'",
    "event.key === 'Home'",
    "event.key === 'End'",
  ]);
});

test('fronteira de transporte não conhece diretamente rota processada, mapa ou aeronave', () => {
  const initBindings = [
    "els.restartBtn.addEventListener('click'",
    "els.prevBtn.addEventListener('click'",
    "els.nextBtn.addEventListener('click'",
    "els.playBtn.addEventListener('click'",
    "els.scrubber.addEventListener('input'",
  ].map(marker => {
    const lineStart = html.indexOf(marker);
    assert.notEqual(lineStart, -1, marker);
    return html.slice(lineStart, html.indexOf('\n', lineStart));
  }).join('\n');
  const keyboard = sliceBetween("document.addEventListener('keydown', event => {", '\n  });');
  const transportSource = `${initBindings}\n${keyboard}`;
  for (const forbidden of ['FlightFlowRouteProcessedV7412', 'leaflet', 'aircraftMarker', 'routePositionProgress', 'transitionPlanForEvents']) {
    assert.equal(transportSource.includes(forbidden), false, `acoplamento proibido na fronteira: ${forbidden}`);
  }
});
