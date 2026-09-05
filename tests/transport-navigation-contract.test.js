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

function transportBindingLines() {
  return [
    "els.restartBtn.addEventListener('click'",
    "els.prevBtn.addEventListener('click'",
    "els.nextBtn.addEventListener('click'",
    "els.playBtn.addEventListener('click'",
    "els.scrubber.addEventListener('input'",
  ].map(marker => {
    const lineStart = html.indexOf(marker);
    assert.notEqual(lineStart, -1, `binding ausente: ${marker}`);
    return html.slice(lineStart, html.indexOf('\n', lineStart));
  }).join('\n');
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

test('bindings de transporte permanecem desacoplados de rota processada, mapa e aeronave', () => {
  const source = transportBindingLines();
  for (const forbidden of ['FlightFlowRouteProcessedV7412', 'leaflet', 'aircraftMarker', 'routePositionProgress', 'transitionPlanForEvents']) {
    assert.equal(source.includes(forbidden), false, `acoplamento proibido na fronteira: ${forbidden}`);
  }
});
