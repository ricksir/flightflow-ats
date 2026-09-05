const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 1141336;
const EXPECTED_SHA256 = '53acbbb70b53c4d96e5a3720fd91192cca809f579041df328e86798754f1cf53';
const EXPECTED_LINES = 5436;
const EXPECTED_DUPLICATES = [];
const EXTRACTED_CORE_UTILS = [
  'shortMessageType', 'displayValue', 'cleanDisplay', 'humanize', 'clone', 'formatBytes',
  'angleDifference', 'hashString', 'seeded', 'getPath', 'setPath'
];
const EXTRACTED_TYPOGRAPHY_UTILS = ['normalizeFontScale', 'fontLayoutForScale', 'fontLayoutDescription'];
const EXTRACTED_OPERATIONAL_STATE_UTILS = ['themeSwatch', 'stripTheme', 'statusClass'];
const EXTRACTED_COORDINATE_UTILS = [
  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid',
  'runwayTokens', 'runwayHeading'
];
const EXTRACTED_PLAYBACK = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];
const EXTRACTED_TRANSPORT = ['restartTransport', 'previousTransport', 'nextTransport', 'scrubTransport'];
const EXTRACTED_KEYBOARD = ['handleKeyboard'];
const EXTRACTED_TIMELINE_SELECTION = ['updateTimelineSelection'];
const EXTRACTED_CONTROL_STATE = ['enableControls'];
const EXTRACTED_TIMELINE_BUILDER = ['buildTimeline'];
const EXTRACTED_SOURCE_CLASS = ['getSourceClass'];

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const index = html.indexOf(anchor);
  assert.ok(index >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', index);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', index);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart, 'IIFE principal deve continuar delimitado');
  return html.slice(bodyStart, close).replace(/^\n+|\n+$/g, '') + '\n';
}

test('núcleo principal mantém identidade estrutural de baseline', () => {
  const source = kernelSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length - 1, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
  assert.match(source, /^\(function \(\) \{\n\s*'use strict';/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('núcleo mantém dependências explícitas de módulos externos e identidade da aplicação', () => {
  const source = kernelSource();
  for (const token of [
    'const Parser = window.FlightParser;',
    "if (!Parser) throw new Error('FlightParser não foi carregado.');",
    'const CoreUtils = window.FlightFlowCoreUtils;',
    "if (!CoreUtils) throw new Error('FlightFlowCoreUtils não foi carregado.');",
    'const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes, angleDifference, hashString, seeded, getPath, setPath } = CoreUtils;',
    'const TypographyUtils = window.FlightFlowTypographyUtils;',
    "if (!TypographyUtils) throw new Error('FlightFlowTypographyUtils não foi carregado.');",
    'const { normalizeFontScale, fontLayoutForScale, fontLayoutDescription } = TypographyUtils;',
    'const OperationalStateUtils = window.FlightFlowOperationalStateUtils;',
    "if (!OperationalStateUtils) throw new Error('FlightFlowOperationalStateUtils não foi carregado.');",
    'const { themeSwatch, stripTheme, statusClass } = OperationalStateUtils;',
    'const CoordinateUtils = window.FlightFlowCoordinateUtils;',
    "if (!CoordinateUtils) throw new Error('FlightFlowCoordinateUtils não foi carregado.');",
    'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;',
    'const PlaybackController = window.FlightFlowPlaybackController;',
    "if (!PlaybackController) throw new Error('FlightFlowPlaybackController não foi carregado.');",
    'const { startPlayback, stopPlayback, togglePlayback, scheduleNext } = PlaybackController.create({',
    'const TransportNavigationController = window.FlightFlowTransportNavigationController;',
    "if (!TransportNavigationController) throw new Error('FlightFlowTransportNavigationController não foi carregado.');",
    'const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({',
    'const KeyboardNavigationController = window.FlightFlowKeyboardNavigationController;',
    "if (!KeyboardNavigationController) throw new Error('FlightFlowKeyboardNavigationController não foi carregado.');",
    'const { handleKeyboard } = KeyboardNavigationController.create({',
    'const TimelineSelectionController = window.FlightFlowTimelineSelectionController;',
    "if (!TimelineSelectionController) throw new Error('FlightFlowTimelineSelectionController não foi carregado.');",
    'const { updateTimelineSelection } = TimelineSelectionController.create({',
    'const ControlStateController = window.FlightFlowControlStateController;',
    "if (!ControlStateController) throw new Error('FlightFlowControlStateController não foi carregado.');",
    'const { enableControls } = ControlStateController.create({',
    'const TimelineBuilderController = window.FlightFlowTimelineBuilderController;',
    "if (!TimelineBuilderController) throw new Error('FlightFlowTimelineBuilderController não foi carregado.');",
    'const { buildTimeline } = TimelineBuilderController.create({',
    "name: 'FlightFlow ATS - TIOP Cindacta1'",
    "subtitle: 'Histórico animado de Plano de Voo'",
    "version: '7.3.2'"
  ]) assert.ok(source.includes(token), `contrato ausente: ${token}`);
});

test('storage central mantém as quatro chaves conhecidas', () => {
  const source = kernelSource();
  for (const token of [
    "const LOCALITY_STORAGE_KEY = 'flightflow-localities-v1';",
    "const AERODROME_STORAGE_KEY = 'flightflow-custom-aerodromes-v1';",
    "const CONFIG_STORAGE_KEY = 'flightflow-config-v2';",
    "const GEO_STORAGE_KEY = 'flightflow-geo-coordinate-v4';"
  ]) assert.ok(source.includes(token), `chave ausente: ${token}`);
});

test('núcleo publica contratos externos de conhecimento, geografia e FIR', () => {
  const source = kernelSource();
  assert.ok(source.includes('window.__flightflowKnowledgeEntries = function()'));
  assert.ok(source.includes('window.__flightflowGeoResolver=Object.freeze({'));
  assert.ok(source.includes("version:'1.0.0'"));
  for (const name of ['register','get','has','request','list','currentRouteEndpoints']) {
    assert.match(source, new RegExp(`\\b${name}\\s*:`), `${name} deve continuar no GeoResolver`);
  }

  const fir = source.match(/window\.__FlightFlowFirBridge\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(fir, 'ponte FIR deve continuar publicada');
  const members = fir[1].split(',').map(x => x.trim()).filter(Boolean);
  assert.deepEqual(members, [
    'state','realMapState','normalizeLocalityCode','closeLeafletRing',
    'sanitizeLeafletAreaPoints','projectGeo','polygonCentroid','escapeHtml','toast'
  ]);
});

test('eventos de integração do núcleo permanecem publicados', () => {
  const source = kernelSource();
  assert.ok(source.includes("new CustomEvent('flightflow:history-session-reset'"));
  assert.ok(source.includes("new CustomEvent('flightflow:route-fix-crossed'"));
  assert.ok(source.includes('window.gm_authFailure='));
});

test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e sete cortes de timeline', () => {
  const source = kernelSource();
  const names = [...source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name).sort();

  assert.equal(names.length, 343);
  assert.equal(counts.size, 343);
  assert.deepEqual(duplicates, EXPECTED_DUPLICATES);
  for (const name of [
    ...EXTRACTED_CORE_UTILS,
    ...EXTRACTED_TYPOGRAPHY_UTILS,
    ...EXTRACTED_OPERATIONAL_STATE_UTILS,
    ...EXTRACTED_COORDINATE_UTILS,
    ...EXTRACTED_PLAYBACK,
    ...EXTRACTED_TRANSPORT,
    ...EXTRACTED_KEYBOARD,
    ...EXTRACTED_TIMELINE_SELECTION,
    ...EXTRACTED_CONTROL_STATE,
    ...EXTRACTED_TIMELINE_BUILDER,
    ...EXTRACTED_SOURCE_CLASS,
  ]) {
    assert.equal(counts.has(name), false, `${name} deve permanecer fora do IIFE principal`);
  }
  assert.equal(counts.get('goTo'), 1, 'goTo deve permanecer inline neste corte');
  assert.equal(counts.get('renderCurrent'), 1, 'renderCurrent deve permanecer inline neste corte');
  assert.equal(counts.get('clamp'), 1, 'clamp deve permanecer inline neste corte');
  assert.equal(counts.get('clamp01'), 1, 'clamp01 deve permanecer inline neste corte');
  assert.equal(counts.get('repairTypographyLayout'), 1, 'repairTypographyLayout deve permanecer no IIFE');
});
