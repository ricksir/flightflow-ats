#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'timeline' / 'timeline-builder-controller.js'
CONTRACT = ROOT / 'tests' / 'build-timeline-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

EXPECTED_INLINE_BYTES = 1681
EXPECTED_INLINE_LINES = 20
EXPECTED_INLINE_SHA256 = '5c152a66eee7d3a5294f868340725275a705d1432a3351b90733a29fa535c85a'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    index = html.find(anchor)
    if index < 0:
        raise SystemExit('ponte FIR não encontrada')
    script_open = html.rfind('<script', 0, index)
    body_start = html.find('>', script_open) + 1
    script_close = html.find('</script>', index)
    if script_open < 0 or body_start <= script_open or script_close <= body_start:
        raise SystemExit('IIFE principal não delimitado')
    return html[body_start:script_close]


def build_timeline_source(kernel: str) -> str:
    marker = '  function buildTimeline('
    start = kernel.find(marker)
    if start < 0:
        raise SystemExit('buildTimeline não encontrada no IIFE principal')
    end = kernel.find('\n  function ', start + len(marker))
    if end <= start:
        raise SystemExit('buildTimeline não delimitável pela função de topo seguinte')
    return kernel[start:end].rstrip()


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
source = build_timeline_source(kernel)
source_bytes = len(source.encode('utf-8'))
source_lines = source.count('\n') + 1
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()
if (source_bytes, source_lines, source_sha) != (EXPECTED_INLINE_BYTES, EXPECTED_INLINE_LINES, EXPECTED_INLINE_SHA256):
    raise SystemExit(
        'identidade de buildTimeline divergiu do contrato: '
        f'{source_bytes} bytes / {source_lines} linhas / {source_sha}'
    )

module = """(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowTimelineBuilderController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const els = options.els;
    const escapeHtml = options.escapeHtml;
    const getSourceClass = options.getSourceClass;
    const goTo = options.goTo;
    const stopPlayback = options.stopPlayback;

    if (!state) throw new Error('FlightFlowTimelineBuilderController requer state.');
    if (!els) throw new Error('FlightFlowTimelineBuilderController requer els.');
    if (typeof escapeHtml !== 'function') throw new Error('FlightFlowTimelineBuilderController requer escapeHtml().');
    if (typeof getSourceClass !== 'function') throw new Error('FlightFlowTimelineBuilderController requer getSourceClass().');
    if (typeof goTo !== 'function') throw new Error('FlightFlowTimelineBuilderController requer goTo().');
    if (typeof stopPlayback !== 'function') throw new Error('FlightFlowTimelineBuilderController requer stopPlayback().');

""" + source + """

    return Object.freeze({ buildTimeline });
  };

  return Object.freeze({ create });
});
"""
MODULE.parent.mkdir(parents=True, exist_ok=True)
MODULE.write_text(module, encoding='utf-8')
module_bytes = len(module.encode('utf-8'))
module_sha = hashlib.sha256(module.encode('utf-8')).hexdigest()

control_ref = '<script id="flightflow-control-state-controller" src="src/timeline/control-state-controller.js"></script>'
builder_ref = '<script id="flightflow-timeline-builder-controller" src="src/timeline/timeline-builder-controller.js"></script>'
html = replace_once(
    html,
    control_ref + '\n<script>',
    control_ref + '\n' + builder_ref + '\n<script>',
    'referência timeline-builder',
)

wiring = """  const TimelineBuilderController = window.FlightFlowTimelineBuilderController;
  if (!TimelineBuilderController) throw new Error('FlightFlowTimelineBuilderController não foi carregado.');
  const { buildTimeline } = TimelineBuilderController.create({
    state,
    els,
    escapeHtml: (...args) => escapeHtml(...args),
    getSourceClass: (...args) => getSourceClass(...args),
    goTo: (...args) => goTo(...args),
    stopPlayback: (...args) => stopPlayback(...args),
  });"""
html = replace_once(html, source, wiring, 'substituição buildTimeline por wiring')

post_kernel = kernel_source(html)
if 'function buildTimeline(' in post_kernel:
    raise SystemExit('buildTimeline inline ainda presente no IIFE após materialização')
if html.count(builder_ref) != 1:
    raise SystemExit('referência timeline-builder deve existir exatamente uma vez')
if html.count('TimelineBuilderController.create({') != 1:
    raise SystemExit('wiring TimelineBuilderController deve existir exatamente uma vez')
HTML.write_text(html, encoding='utf-8')

contract = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'timeline-builder-controller.js');
const REFERENCE = '<script id="flightflow-timeline-builder-controller" src="src/timeline/timeline-builder-controller.js"></script>';
const ORIGINAL_BYTES = {source_bytes};
const ORIGINAL_LINES = {source_lines};
const ORIGINAL_SHA256 = '{source_sha}';
const MODULE_BYTES = {module_bytes};
const MODULE_SHA256 = '{module_sha}';
const EXPECTED_STATE_REFS = Object.freeze(["parsed"]);
const EXPECTED_ELS_REFS = Object.freeze(["timelineHeading", "timelineList"]);
const EXPECTED_BARE_CALLS = Object.freeze(["Number", "String", "activate", "escapeHtml", "getSourceClass", "goTo", "stopPlayback"]);

function moduleSource() {{
  return fs.readFileSync(MODULE, 'utf8');
}}

function originalFunctionFromModule() {{
  const source = moduleSource();
  const marker = '  function buildTimeline(';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, 'módulo deve preservar o bloco original de buildTimeline');
  const end = source.indexOf('\\n\\n    return Object.freeze({{ buildTimeline }});', start);
  assert.ok(end > start, 'bloco buildTimeline deve continuar delimitável no módulo');
  return source.slice(start, end).replace(/\\s+$/, '');
}}

function kernelSource() {{
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({{';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar no IIFE principal');
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  return html.slice(bodyStart, close);
}}

function uniqMatches(source, regex) {{
  return [...new Set([...source.matchAll(regex)].map(match => match[1]))].sort();
}}

function bareCalls(source) {{
  const ignored = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super','buildTimeline']);
  return [...new Set([...source.matchAll(/(?<![\\w$.])([A-Za-z_$][\\w$]*)\\s*\\(/g)].map(match => match[1]).filter(name => !ignored.has(name)))].sort();
}}

test('módulo timeline-builder mantém identidade estrutural e API mínima', () => {{
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {{'));
  assert.ok(source.includes('root.FlightFlowTimelineBuilderController = api;'));
  const Controller = require(MODULE);
  assert.equal(Object.isFrozen(Controller), true);
  assert.deepEqual(Object.keys(Controller), ['create']);
}});

test('buildTimeline foi movida preservando exatamente os 1.681 bytes congelados', () => {{
  const source = originalFunctionFromModule();
  assert.equal(Buffer.byteLength(source, 'utf8'), ORIGINAL_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, ORIGINAL_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), ORIGINAL_SHA256);
}});

test('buildTimeline preserva a fronteira congelada de state, els e chamadas', () => {{
  const source = originalFunctionFromModule();
  assert.deepEqual(uniqMatches(source, /\\bstate\\.([A-Za-z_$][\\w$]*)/g), [...EXPECTED_STATE_REFS]);
  assert.deepEqual(uniqMatches(source, /\\bels\\.([A-Za-z_$][\\w$]*)/g), [...EXPECTED_ELS_REFS]);
  assert.deepEqual(bareCalls(source), [...EXPECTED_BARE_CALLS]);
  assert.equal(source.includes('document.'), false);
  assert.equal(source.includes('window.'), false);
}});

test('fábrica exige explicitamente todas as dependências externas', () => {{
  const Controller = require(MODULE);
  const noop = () => {{}};
  const base = {{ state: {{}}, els: {{}}, escapeHtml: noop, getSourceClass: noop, goTo: noop, stopPlayback: noop }};
  assert.throws(() => Controller.create(), /requer state/);
  assert.throws(() => Controller.create({{ state: {{}} }}), /requer els/);
  assert.throws(() => Controller.create({{ ...base, escapeHtml: null }}), /requer escapeHtml/);
  assert.throws(() => Controller.create({{ ...base, getSourceClass: null }}), /requer getSourceClass/);
  assert.throws(() => Controller.create({{ ...base, goTo: null }}), /requer goTo/);
  assert.throws(() => Controller.create({{ ...base, stopPlayback: null }}), /requer stopPlayback/);
  const api = Controller.create(base);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['buildTimeline']);
}});

test('index carrega timeline-builder antes do IIFE e delega buildTimeline ao módulo', () => {{
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1);
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({{');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart);
  for (const token of [
    'const TimelineBuilderController = window.FlightFlowTimelineBuilderController;',
    "if (!TimelineBuilderController) throw new Error('FlightFlowTimelineBuilderController não foi carregado.');",
    'const {{ buildTimeline }} = TimelineBuilderController.create({{',
    'escapeHtml: (...args) => escapeHtml(...args),',
    'getSourceClass: (...args) => getSourceClass(...args),',
    'goTo: (...args) => goTo(...args),',
    'stopPlayback: (...args) => stopPlayback(...args),',
  ]) assert.ok(html.includes(token), `integração ausente: ${{token}}`);
  assert.equal(kernelSource().includes('function buildTimeline('), false);
}});
'''
CONTRACT.write_text(contract, encoding='utf-8')

kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(
    kernel_test,
    "const EXTRACTED_CONTROL_STATE = ['enableControls'];",
    "const EXTRACTED_CONTROL_STATE = ['enableControls'];\nconst EXTRACTED_TIMELINE_BUILDER = ['buildTimeline'];",
    'lista extraída timeline-builder',
)
kernel_test = replace_once(
    kernel_test,
    "    'const { enableControls } = ControlStateController.create({',\n    \"name: 'FlightFlow ATS - TIOP Cindacta1'\",",
    "    'const { enableControls } = ControlStateController.create({',\n    'const TimelineBuilderController = window.FlightFlowTimelineBuilderController;',\n    \"if (!TimelineBuilderController) throw new Error('FlightFlowTimelineBuilderController não foi carregado.');\",\n    'const { buildTimeline } = TimelineBuilderController.create({',\n    \"name: 'FlightFlow ATS - TIOP Cindacta1'\",",
    'dependência externa timeline-builder',
)
kernel_test = replace_once(
    kernel_test,
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e cinco cortes de timeline', () => {",
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e seis cortes de timeline', () => {",
    'título inventário',
)
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 348);', '  assert.equal(names.length, 347);', 'contagem funções')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 348);', '  assert.equal(counts.size, 347);', 'contagem nomes')
kernel_test = replace_once(kernel_test, "  assert.equal(counts.get('buildTimeline'), 1);\n", '', 'assert buildTimeline genérico')
kernel_test = replace_once(
    kernel_test,
    '    ...EXTRACTED_CONTROL_STATE,\n  ]) {',
    '    ...EXTRACTED_CONTROL_STATE,\n    ...EXTRACTED_TIMELINE_BUILDER,\n  ]) {',
    'spread timeline-builder',
)
kernel_test = replace_once(
    kernel_test,
    "  assert.equal(counts.get('buildTimeline'), 1, 'buildTimeline deve permanecer inline neste corte');\n",
    '',
    'assert buildTimeline inline',
)

post_source = kernel_source(html).strip('\n') + '\n'
expected_bytes = len(post_source.encode('utf-8'))
expected_sha = hashlib.sha256(post_source.encode('utf-8')).hexdigest()
expected_lines = post_source.count('\n')
kernel_test = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', kernel_test, count=1)
kernel_test = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", kernel_test, count=1)
kernel_test = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', kernel_test, count=1)
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(
    f'materializado: buildTimeline -> timeline-builder-controller; '
    f'módulo {module_bytes} bytes / {module_sha}; núcleo {expected_bytes} bytes / {expected_lines} linhas / {expected_sha}'
)
