const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 1114709;
const EXPECTED_SHA256 = 'eae54fca21828ce37968ed072a07dab69b6d4182afe58c7f3cb575a02c5f46dd';
const EXPECTED_LINES = 5007;
const EXPECTED_DUPLICATES = [];
const EXTRACTED_CURRENT_EVENT = ['currentEvent'];
const EXTRACTED_EVENT_NAVIGATION = ['goTo'];
const EXTRACTED_RENDER_CURRENT = ['renderCurrent'];
const EXTRACTED_CORE_UTILS = [
  'shortMessageType', 'displayValue', 'cleanDisplay', 'humanize', 'clone', 'formatBytes',
  'angleDifference', 'hashString', 'seeded', 'getPath', 'setPath', 'normalizeSearchText'
];
const EXTRACTED_TYPOGRAPHY_UTILS = ['normalizeFontScale', 'fontLayoutForScale', 'fontLayoutDescription'];
const EXTRACTED_OPERATIONAL_STATE_UTILS = ['themeSwatch', 'stripTheme', 'statusClass'];
const EXTRACTED_STRIP_COLOR_MEANING = ['stripColorMeaning'];
const EXTRACTED_STRIP_CELL_RENDERER = ['stripCell'];
const EXTRACTED_SEARCH_EXCERPT = ['makeSearchExcerpt', 'highlightSearchExcerpt'];
const EXTRACTED_SOURCE_MANAGER = ['initSourceManager'];
const EXTRACTED_FIELD_LAYOUT_UTILS = ['normalizeFieldLayout'];
const EXTRACTED_FIELD_CARD_RENDERER = ['fieldCardMarkup'];
const EXTRACTED_FPV_WINDOW_CONTROLLER = ['minimizeFpv'];
const EXTRACTED_STRIP_WINDOW_CONTROLLER = ['minimizeStrip'];
const EXTRACTED_KNOWLEDGE_ENTRIES = ['knowledgeEntries'];
const EXTRACTED_KNOWLEDGE_FIELD_LABEL_RENDERER = ['renderKnowledgeFieldLabel'];
const EXTRACTED_KNOWLEDGE_POPOVER_CONTROLLER = ['hideKnowledgePopover'];
const EXTRACTED_COORDINATE_UTILS = [
  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid', 'groundMidpoint',
  'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode', 'polygonGeoCentroid', 'geoOffset'
];
const EXTRACTED_LOCALITY_UTILS = ['isLocationCode'];
const EXTRACTED_AIRPORT_GROUND_QUERY = ['airportGroundQuery'];
const EXTRACTED_STAND_HINT_UTILS = ['extractStandHint'];
const EXTRACTED_AIRPORT_SURFACE_UTILS = ['airportSurfacePreset'];
const EXTRACTED_ROUTE_UPDATE_UTILS = ['isMeaningfulRouteChange', 'isRouteUpdateEvent'];
const EXTRACTED_ROUTE_REVISION_REASON = ['routeRevisionReason'];
const EXTRACTED_COMMUNICATION_CONTEXT_UTILS = ['internalTransitionDetails', 'parseAddresses', 'inferCommunicationContext', 'knowledgeEntryDocumentKey', 'normalizeKnowledgeText', 'canonicalKnowledgeCode', 'entryMatchesToken', 'resolveKnowledgeEntry', 'findKnowledgeEntryByKey', 'findKnowledgeEntriesByCode', 'relatedKnowledgeButtons', 'knowledgeDetailMarkup', 'knowledgeEntryDocumentLabel', 'knowledgeCategoryLabel', 'knowledgeContextSummary', 'formatAddressCode', 'formatAddressDisplay', 'formatFieldDisplay'];
const EXTRACTED_PLAYBACK = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];
const EXTRACTED_TRANSPORT = ['restartTransport', 'previousTransport', 'nextTransport', 'scrubTransport'];
const EXTRACTED_KEYBOARD = ['handleKeyboard'];
const EXTRACTED_TIMELINE_SELECTION = ['updateTimelineSelection'];
const EXTRACTED_CONTROL_STATE = ['enableControls'];
const EXTRACTED_TIMELINE_BUILDER = ['buildTimeline'];
const EXTRACTED_SOURCE_CLASS = ['getSourceClass'];
const EXTRACTED_CONFIG_VALIDATION = ['validateConfig'];
const EXTRACTED_CONFIG_MERGER = ['mergeConfig'];
const EXTRACTED_AIRCRAFT_VISUAL_UTILS = ['aircraftPixelSizeForZoom', 'planeIconHtml'];
const EXTRACTED_AIRCRAFT_MARKER_CONTROLLER = ['updateLeafletAircraftMarker', 'googlePlaneSymbol', 'updateGoogleAircraftMarker'];
const EXTRACTED_AIRCRAFT_MOTION_CONTROLLER = ['resetMotionController', 'motionRoute', 'applyMotionFrame', 'snapMotionTo', 'startMotionLoop'];
const EXTRACTED_MOTION_TRANSITION_PLANNER = ['planMotionTransition'];
const EXTRACTED_RADAR_TAG_CONTROLLER = ['updateRadarTagPosition'];
const EXTRACTED_AIRCRAFT_FOLLOW_CONTROLLER = ['maybeFollowAircraft'];
const EXTRACTED_REAL_MAP_AIRCRAFT_CONTROLLER = ['updateRealMapAircraft'];

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
    'const ConfigValidation = window.FlightFlowConfigValidation;',
    "if (!ConfigValidation) throw new Error('FlightFlowConfigValidation não foi carregado.');",
    'const { validateConfig } = ConfigValidation;',
    'const ConfigMerger = window.FlightFlowConfigMerger;',
    "if (!ConfigMerger) throw new Error('FlightFlowConfigMerger não foi carregado.');",
    'const { mergeConfig } = ConfigMerger.create({',
    'defaultConfig: DEFAULT_CONFIG,',
    'const AircraftVisualUtils = window.FlightFlowAircraftVisualUtils;',
    "if (!AircraftVisualUtils) throw new Error('FlightFlowAircraftVisualUtils não foi carregado.');",
    'const { aircraftPixelSizeForZoom, planeIconHtml } = AircraftVisualUtils.create({ clamp, escapeHtml });',
    'const AircraftMarkerController = window.FlightFlowAircraftMarkerController;',
    "if (!AircraftMarkerController) throw new Error('FlightFlowAircraftMarkerController não foi carregado.');",
    'const { updateLeafletAircraftMarker, googlePlaneSymbol, updateGoogleAircraftMarker } = AircraftMarkerController.create({',
    'const RealMapAircraftController = window.FlightFlowRealMapAircraftController;',
    "if (!RealMapAircraftController) throw new Error('FlightFlowRealMapAircraftController não foi carregado.');",
    'const { updateRealMapAircraft } = RealMapAircraftController.create({',
    'const RadarTagController = window.FlightFlowRadarTagController;',
    "if (!RadarTagController) throw new Error('FlightFlowRadarTagController não foi carregado.');",
    'const { updateRadarTagPosition } = RadarTagController.create({ els });',
    'const AircraftFollowController = window.FlightFlowAircraftFollowController;',
    "if (!AircraftFollowController) throw new Error('FlightFlowAircraftFollowController não foi carregado.');",
    'const { maybeFollowAircraft } = AircraftFollowController.create({ state, setMapViewBox });',
    'const AircraftMotionController = window.FlightFlowAircraftMotionController;',
    "if (!AircraftMotionController) throw new Error('FlightFlowAircraftMotionController não foi carregado.');",
    'const { resetMotionController, motionRoute, applyMotionFrame, snapMotionTo, startMotionLoop } = AircraftMotionController.create({',
    'const MotionTransitionPlanner = window.FlightFlowMotionTransitionPlanner;',
    "if (!MotionTransitionPlanner) throw new Error('FlightFlowMotionTransitionPlanner não foi carregado.');",
    'const { planMotionTransition } = MotionTransitionPlanner.create({',
    'const CoreUtils = window.FlightFlowCoreUtils;',
    "if (!CoreUtils) throw new Error('FlightFlowCoreUtils não foi carregado.');",
    'const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes, angleDifference, hashString, seeded, getPath, setPath, normalizeSearchText } = CoreUtils;',
    'const TypographyUtils = window.FlightFlowTypographyUtils;',
    "if (!TypographyUtils) throw new Error('FlightFlowTypographyUtils não foi carregado.');",
    'const { normalizeFontScale, fontLayoutForScale, fontLayoutDescription } = TypographyUtils;',
    'const OperationalStateUtils = window.FlightFlowOperationalStateUtils;',
    "if (!OperationalStateUtils) throw new Error('FlightFlowOperationalStateUtils não foi carregado.');",
    'const { themeSwatch, stripTheme, statusClass } = OperationalStateUtils;',
    'const StripColorMeaning = window.FlightFlowStripColorMeaning;',
    "if (!StripColorMeaning) throw new Error('FlightFlowStripColorMeaning não foi carregado.');",
    'const { stripColorMeaning } = StripColorMeaning.create({ colorMeanings: STRIP_COLOR_MEANINGS });',
    'const StripCellRenderer = window.FlightFlowStripCellRenderer;',
    "if (!StripCellRenderer) throw new Error('FlightFlowStripCellRenderer não foi carregado.');",
    'const { stripCell } = StripCellRenderer.create({',
    'stripFieldDefs: STRIP_FIELD_DEFS,',
    'const SearchExcerpt = window.FlightFlowSearchExcerpt;',
    "if (!SearchExcerpt) throw new Error('FlightFlowSearchExcerpt não foi carregado.');",
    'const { makeSearchExcerpt, highlightSearchExcerpt } = SearchExcerpt.create({ normalizeSearchText, escapeHtml });',
    'const SourceManagerController = window.FlightFlowSourceManagerController;',
    "if (!SourceManagerController) throw new Error('FlightFlowSourceManagerController não foi carregado.');",
    'const { initSourceManager } = SourceManagerController.create({ renderSourceManager });',
    'const FieldLayoutUtils = window.FlightFlowFieldLayoutUtils;',
    "if (!FieldLayoutUtils) throw new Error('FlightFlowFieldLayoutUtils não foi carregado.');",
    'const { normalizeFieldLayout } = FieldLayoutUtils.create({ fieldDefs: FIELD_DEFS });',
    'const FieldCardRenderer = window.FlightFlowFieldCardRenderer;',
    'const FpvWindowController = window.FlightFlowFpvWindowController;',
    "if (!FpvWindowController) throw new Error('FlightFlowFpvWindowController não foi carregado.');",
    'const { minimizeFpv } = FpvWindowController.create({ state, setFpvVisible });',
    'const StripWindowController = window.FlightFlowStripWindowController;',
    "if (!StripWindowController) throw new Error('FlightFlowStripWindowController não foi carregado.');",
    'const { minimizeStrip } = StripWindowController.create({ state, setStripVisible });',
    "if (!FieldCardRenderer) throw new Error('FlightFlowFieldCardRenderer não foi carregado.');",
    'const { fieldCardMarkup } = FieldCardRenderer.create({',
    'const KnowledgeEntries = window.FlightFlowKnowledgeEntries;',
    "if (!KnowledgeEntries) throw new Error('FlightFlowKnowledgeEntries não foi carregado.');",
    'const { knowledgeEntries } = KnowledgeEntries.create({',
    'const KnowledgeFieldLabelRenderer = window.FlightFlowKnowledgeFieldLabelRenderer;',
    "if (!KnowledgeFieldLabelRenderer) throw new Error('FlightFlowKnowledgeFieldLabelRenderer não foi carregado.');",
    'const { renderKnowledgeFieldLabel } = KnowledgeFieldLabelRenderer.create({',
    'const KnowledgePopoverController = window.FlightFlowKnowledgePopoverController;',
    "if (!KnowledgePopoverController) throw new Error('FlightFlowKnowledgePopoverController não foi carregado.');",
    'const { hideKnowledgePopover } = KnowledgePopoverController.create({ els, state });',
    'const CoordinateUtils = window.FlightFlowCoordinateUtils;',
    "if (!CoordinateUtils) throw new Error('FlightFlowCoordinateUtils não foi carregado.');",
    'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, groundMidpoint, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid, geoOffset } = CoordinateUtils;',
    'const LocalityUtils = window.FlightFlowLocalityUtils;',
    "if (!LocalityUtils) throw new Error('FlightFlowLocalityUtils não foi carregado.');",
    'const { isLocationCode } = LocalityUtils.create({ normalizeLocalityCode });',
    'const AirportGroundQueryModule = window.FlightFlowAirportGroundQuery;',
    "if (!AirportGroundQueryModule) throw new Error('FlightFlowAirportGroundQuery não foi carregado.');",
    'const { airportGroundQuery } = AirportGroundQueryModule;',
    'const StandHintUtils = window.FlightFlowStandHintUtils;',
    "if (!StandHintUtils) throw new Error('FlightFlowStandHintUtils não foi carregado.');",
    'const { extractStandHint } = StandHintUtils;',
    'const AirportSurfaceUtils = window.FlightFlowAirportSurfaceUtils;',
    "if (!AirportSurfaceUtils) throw new Error('FlightFlowAirportSurfaceUtils não foi carregado.');",
    'const { airportSurfacePreset } = AirportSurfaceUtils.create({ normalizeLocalityCode });',
    'const RouteUpdateUtils = window.FlightFlowRouteUpdateUtils;',
    "if (!RouteUpdateUtils) throw new Error('FlightFlowRouteUpdateUtils não foi carregado.');",
    'const { isRouteUpdateEvent } = RouteUpdateUtils;',
    'const RouteRevisionReason = window.FlightFlowRouteRevisionReason;',
    "if (!RouteRevisionReason) throw new Error('FlightFlowRouteRevisionReason não foi carregado.');",
    'const { routeRevisionReason } = RouteRevisionReason.create({ shortMessageType });',
    'const CommunicationContextUtils = window.FlightFlowCommunicationContextUtils;',
    "if (!CommunicationContextUtils) throw new Error('FlightFlowCommunicationContextUtils não foi carregado.');",
    'const { internalTransitionDetails } = CommunicationContextUtils;',
    'const { parseAddresses } = CommunicationContextUtils;',
    'const { inferCommunicationContext } = CommunicationContextUtils.createCommunicationContextInferer({',
    'const { knowledgeEntryDocumentKey } = CommunicationContextUtils;',
    'const { normalizeKnowledgeText } = CommunicationContextUtils;',
    'const { canonicalKnowledgeCode } = CommunicationContextUtils.createCanonicalKnowledgeCode({ normalizeKnowledgeText });',
    'const { entryMatchesToken } = CommunicationContextUtils.createEntryMatchesToken({',
    'const { resolveKnowledgeEntry } = CommunicationContextUtils.createResolveKnowledgeEntry({',
    'normalizeKnowledgeText,',
    'knowledgeEntries,',
    'canonicalKnowledgeCode,',
    'entryMatchesToken,',
    'const { findKnowledgeEntryByKey } = CommunicationContextUtils.createKnowledgeEntryFinder({',
    'const { findKnowledgeEntriesByCode } = CommunicationContextUtils.createKnowledgeEntriesByCodeFinder({',
    'const { relatedKnowledgeButtons } = CommunicationContextUtils.createRelatedKnowledgeButtons({',
    'findKnowledgeEntriesByCode,',
    'escapeHtml,',
    'const { knowledgeDetailMarkup } = CommunicationContextUtils.createKnowledgeDetailMarkup({',
    'knowledgeEntryDocumentLabel,',
    'knowledgeCategoryLabel,',
    'relatedKnowledgeButtons,',
    'knowledgeDisclaimer: KNOWLEDGE_DISCLAIMER,',
    'const { knowledgeEntryDocumentLabel } = CommunicationContextUtils.createKnowledgeDocumentLabeler({',
    'const { knowledgeCategoryLabel } = CommunicationContextUtils.createKnowledgeCategoryLabeler({',
    'const CurrentEventSelector = window.FlightFlowCurrentEventSelector;',
    "if (!CurrentEventSelector) throw new Error('FlightFlowCurrentEventSelector não foi carregado.');",
    'const { currentEvent } = CurrentEventSelector.create({ state });',
    'const RenderCurrentController = window.FlightFlowRenderCurrentController;',
    "if (!RenderCurrentController) throw new Error('FlightFlowRenderCurrentController não foi carregado.');",
    'const { renderCurrent } = RenderCurrentController.create({',
    'const EventNavigationController = window.FlightFlowEventNavigationController;',
    "if (!EventNavigationController) throw new Error('FlightFlowEventNavigationController não foi carregado.');",
    'const { goTo } = EventNavigationController.create({',
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
  const motionSource = fs.readFileSync(path.join(ROOT, 'src', 'map', 'aircraft-motion-controller.js'), 'utf8');
  assert.ok(motionSource.includes("new CustomEvent('flightflow:route-fix-crossed'"));
  assert.ok(source.includes('window.gm_authFailure='));
});

test('inventário interno do núcleo mantém nomes únicos após extrações por domínio', () => {
  const source = kernelSource();
  const names = [...source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name).sort();

  assert.equal(names.length, 283);
  assert.equal(counts.size, 283);
  assert.deepEqual(duplicates, EXPECTED_DUPLICATES);
  for (const name of [
    ...EXTRACTED_CURRENT_EVENT,
    ...EXTRACTED_EVENT_NAVIGATION,
    ...EXTRACTED_RENDER_CURRENT,
    ...EXTRACTED_CORE_UTILS,
    ...EXTRACTED_TYPOGRAPHY_UTILS,
    ...EXTRACTED_OPERATIONAL_STATE_UTILS,
    ...EXTRACTED_STRIP_COLOR_MEANING,
    ...EXTRACTED_STRIP_CELL_RENDERER,
    ...EXTRACTED_SEARCH_EXCERPT,
    ...EXTRACTED_SOURCE_MANAGER,
    ...EXTRACTED_FIELD_LAYOUT_UTILS,
    ...EXTRACTED_FIELD_CARD_RENDERER,
    ...EXTRACTED_FPV_WINDOW_CONTROLLER,
    ...EXTRACTED_STRIP_WINDOW_CONTROLLER,
    ...EXTRACTED_KNOWLEDGE_ENTRIES,
    ...EXTRACTED_KNOWLEDGE_FIELD_LABEL_RENDERER,
    ...EXTRACTED_KNOWLEDGE_POPOVER_CONTROLLER,
    ...EXTRACTED_COORDINATE_UTILS,
    ...EXTRACTED_LOCALITY_UTILS,
    ...EXTRACTED_AIRPORT_GROUND_QUERY,
    ...EXTRACTED_STAND_HINT_UTILS,
    ...EXTRACTED_AIRPORT_SURFACE_UTILS,
    ...EXTRACTED_ROUTE_UPDATE_UTILS,
    ...EXTRACTED_ROUTE_REVISION_REASON,
    ...EXTRACTED_COMMUNICATION_CONTEXT_UTILS,
    ...EXTRACTED_PLAYBACK,
    ...EXTRACTED_TRANSPORT,
    ...EXTRACTED_KEYBOARD,
    ...EXTRACTED_TIMELINE_SELECTION,
    ...EXTRACTED_CONTROL_STATE,
    ...EXTRACTED_TIMELINE_BUILDER,
    ...EXTRACTED_SOURCE_CLASS,
    ...EXTRACTED_CONFIG_VALIDATION,
    ...EXTRACTED_CONFIG_MERGER,
    ...EXTRACTED_AIRCRAFT_VISUAL_UTILS,
    ...EXTRACTED_AIRCRAFT_MARKER_CONTROLLER,
    ...EXTRACTED_RADAR_TAG_CONTROLLER,
    ...EXTRACTED_AIRCRAFT_FOLLOW_CONTROLLER,
    ...EXTRACTED_REAL_MAP_AIRCRAFT_CONTROLLER,
    ...EXTRACTED_AIRCRAFT_MOTION_CONTROLLER,
    ...EXTRACTED_MOTION_TRANSITION_PLANNER,
  ]) {
    assert.equal(counts.has(name), false, `${name} deve permanecer fora do IIFE principal`);
  }
  assert.equal(counts.has('goTo'), false, 'goTo deve permanecer fora do IIFE neste corte');
  assert.equal(counts.has('currentEvent'), false, 'currentEvent deve permanecer fora do IIFE neste corte');
  assert.equal(counts.has('renderCurrent'), false, 'renderCurrent deve permanecer fora do IIFE neste corte');
  assert.equal(counts.get('clamp'), 1, 'clamp deve permanecer inline neste corte');
  assert.equal(counts.get('clamp01'), 1, 'clamp01 deve permanecer inline neste corte');
  assert.equal(counts.get('repairTypographyLayout'), 1, 'repairTypographyLayout deve permanecer no IIFE');
  assert.equal(counts.get('renderSourceManager'), 1, 'renderSourceManager deve permanecer no IIFE neste corte');
});
