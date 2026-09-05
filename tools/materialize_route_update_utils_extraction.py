#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src/route/route-update-utils.js'
CONTRACT = ROOT / 'tests/route-update-utils-contract.test.js'
KERNEL_CONTRACT = ROOT / 'tests/main-kernel-contract.test.js'

BASE_KERNEL_BYTES = 1139435
BASE_KERNEL_LINES = 5392
BASE_KERNEL_SHA = '91fe6caa396eba960df8899e72517b7da7e30fd7dd5ebe7a336b8dd8600dfb86'
BASE_KERNEL_FUNCTIONS = 338

KEY_SOURCE = "  const ROUTE_UPDATE_KEYS = new Set(['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);"
KEY_BYTES = 120
KEY_SHA = 'cffa5c6145b62b630d7775d75120f9f33ebcf9f1deefbee0cbe7210eba968281'

TARGETS = {
    'isMeaningfulRouteChange': (460, 9, '107a888c42632b1198ee29b8c47285e8533ce648c861217b20c73ebc20022fbe'),
    'isRouteUpdateEvent': (456, 7, 'bf51357fa087053af5a77946db8ca958c435efa95d198a36986f018cea5baee3'),
}

SCRIPT_ANCHOR = '    <script id="flightflow-airport-ground-query" src="src/geo/airport-ground-query.js"></script>\n'
SCRIPT_TAG = '<script id="flightflow-route-update-utils" src="src/route/route-update-utils.js"></script>\n'
ALIAS_ANCHOR = (
    '  const AirportGroundQueryModule = window.FlightFlowAirportGroundQuery;\n'
    "  if (!AirportGroundQueryModule) throw new Error('FlightFlowAirportGroundQuery não foi carregado.');\n"
    '  const { airportGroundQuery } = AirportGroundQueryModule;\n\n'
)
ALIAS_BLOCK = (
    '  const RouteUpdateUtils = window.FlightFlowRouteUpdateUtils;\n'
    "  if (!RouteUpdateUtils) throw new Error('FlightFlowRouteUpdateUtils não foi carregado.');\n"
    '  const { isRouteUpdateEvent } = RouteUpdateUtils;\n\n'
)


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def kernel_source(html):
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.index(anchor)
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.index('>', open_pos) + 1
    close = html.index('</script>', pos)
    return html[body_start:close].replace('\r\n', '\n')


def kernel_identity(kernel):
    normalized = kernel.strip('\n') + '\n'
    return (
        len(normalized.encode('utf-8')),
        normalized.count('\n'),
        sha(normalized),
        len(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', normalized)),
    )


def function_source(container, name):
    marker = f'  function {name}('
    start = container.index(marker)
    paren = container.index('(', start)
    i = paren
    depth = 0
    quote = None
    escaped = False
    while i < len(container):
        c = container[i]
        if quote:
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                quote = None
            i += 1
            continue
        if c in "'\"`":
            quote = c
            i += 1
            continue
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                break
        i += 1
    brace = i + 1
    while brace < len(container) and container[brace].isspace():
        brace += 1
    if container[brace] != '{':
        raise RuntimeError(f'brace de {name} não encontrado')
    depth = 0
    quote = None
    escaped = False
    for i in range(brace, len(container)):
        c = container[i]
        if quote:
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                quote = None
            continue
        if c in "'\"`":
            quote = c
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return container[start:i + 1]
    raise RuntimeError(f'fim de {name} não encontrado')


def count_call(container, name):
    return len(re.findall(r'(?<![\w$.])' + re.escape(name) + r'\s*\(', container))


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: esperado 1, encontrado {count}')
    return text.replace(old, new, 1)


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
base_identity = kernel_identity(kernel)
expected_base = (BASE_KERNEL_BYTES, BASE_KERNEL_LINES, BASE_KERNEL_SHA, BASE_KERNEL_FUNCTIONS)
if base_identity != expected_base:
    raise RuntimeError(f'baseline do kernel divergiu: {base_identity} != {expected_base}')

if len(KEY_SOURCE.encode('utf-8')) != KEY_BYTES or sha(KEY_SOURCE) != KEY_SHA:
    raise RuntimeError('identidade local de ROUTE_UPDATE_KEYS inválida')
if kernel.count(KEY_SOURCE) != 1:
    raise RuntimeError('ROUTE_UPDATE_KEYS deve existir exatamente uma vez no kernel')

sources = {}
for name, (expected_bytes, expected_lines, expected_sha) in TARGETS.items():
    source = function_source(kernel, name)
    actual = (len(source.encode('utf-8')), source.count('\n') + 1, sha(source))
    expected = (expected_bytes, expected_lines, expected_sha)
    if actual != expected:
        raise RuntimeError(f'identidade de {name} divergiu: {actual} != {expected}')
    sources[name] = source

if count_call(kernel, 'isMeaningfulRouteChange') - 1 != 1:
    raise RuntimeError('isMeaningfulRouteChange deve ter exatamente um consumidor')
if count_call(kernel, 'isRouteUpdateEvent') - 1 != 1:
    raise RuntimeError('isRouteUpdateEvent deve ter exatamente um consumidor externo')

protected_before = {name: function_source(kernel, name) for name in ('goTo', 'renderCurrent', 'groundMidpoint')}

module_source = (
    "(function () {\n"
    "  'use strict';\n\n"
    f"{KEY_SOURCE}\n\n"
    f"{sources['isMeaningfulRouteChange']}\n\n"
    f"{sources['isRouteUpdateEvent']}\n\n"
    "  window.FlightFlowRouteUpdateUtils = Object.freeze({\n"
    "    isRouteUpdateEvent,\n"
    "  });\n"
    "})();\n"
)
MODULE.parent.mkdir(parents=True, exist_ok=True)
MODULE.write_text(module_source, encoding='utf-8')
module_bytes = len(module_source.encode('utf-8'))
module_sha = sha(module_source)
module_functions = len(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', module_source))
if module_functions != 2:
    raise RuntimeError(f'módulo deve conter 2 funções nomeadas, encontrou {module_functions}')

if SCRIPT_TAG in html:
    raise RuntimeError('script route-update-utils já existe antes do corte')
html = replace_once(html, SCRIPT_ANCHOR, SCRIPT_ANCHOR + SCRIPT_TAG, 'âncora de script')
if ALIAS_BLOCK in html:
    raise RuntimeError('alias RouteUpdateUtils já existe antes do corte')
html = replace_once(html, ALIAS_ANCHOR, ALIAS_ANCHOR + ALIAS_BLOCK, 'âncora de alias')

html = replace_once(html, KEY_SOURCE + '\n', '', 'remoção ROUTE_UPDATE_KEYS')
for name in ('isMeaningfulRouteChange', 'isRouteUpdateEvent'):
    source = sources[name]
    if source + '\n\n' in html:
        html = replace_once(html, source + '\n\n', '', f'remoção {name}')
    elif source + '\n' in html:
        html = replace_once(html, source + '\n', '', f'remoção {name}')
    else:
        raise RuntimeError(f'não foi possível remover {name} com quebra conhecida')

HTML.write_text(html, encoding='utf-8')
post_kernel = kernel_source(html)
post_bytes, post_lines, post_sha, post_functions = kernel_identity(post_kernel)
if post_functions != 336:
    raise RuntimeError(f'kernel deveria ficar com 336 funções, ficou com {post_functions}')
if 'ROUTE_UPDATE_KEYS' in post_kernel or 'function isMeaningfulRouteChange(' in post_kernel or 'function isRouteUpdateEvent(' in post_kernel:
    raise RuntimeError('cluster ainda está declarado no kernel')
if count_call(post_kernel, 'isRouteUpdateEvent') != 1:
    raise RuntimeError('consumidor externo de isRouteUpdateEvent não foi preservado')
if 'destinationChanged||isRouteUpdateEvent(e)' not in post_kernel:
    raise RuntimeError('consumidor sintético esperado foi alterado')
for name, before in protected_before.items():
    after = function_source(post_kernel, name)
    if after != before:
        raise RuntimeError(f'função protegida {name} foi alterada')

contract = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src/route/route-update-utils.js');
const EXPECTED_MODULE_BYTES = {module_bytes};
const EXPECTED_MODULE_SHA256 = '{module_sha}';
const EXPECTED_KEYS_BYTES = {KEY_BYTES};
const EXPECTED_KEYS_SHA256 = '{KEY_SHA}';
const EXPECTED_MEANINGFUL_BYTES = 460;
const EXPECTED_MEANINGFUL_LINES = 9;
const EXPECTED_MEANINGFUL_SHA256 = '107a888c42632b1198ee29b8c47285e8533ce648c861217b20c73ebc20022fbe';
const EXPECTED_EVENT_BYTES = 456;
const EXPECTED_EVENT_LINES = 7;
const EXPECTED_EVENT_SHA256 = 'bf51357fa087053af5a77946db8ca958c435efa95d198a36986f018cea5baee3';

function kernelSource() {{
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({{';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0);
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  return html.slice(bodyStart, close);
}}

function functionSource(container, name) {{
  const marker = `  function ${{name}}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${{name}} deve existir no módulo`);
  const paren = container.indexOf('(', start);
  let i = paren, depth = 0, quote = null, escaped = false;
  while (i < container.length) {{
    const c = container[i];
    if (quote) {{
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1; continue;
    }}
    if (c === "'" || c === '"' || c === '`') {{ quote = c; i += 1; continue; }}
    if (c === '(') depth += 1;
    else if (c === ')') {{ depth -= 1; if (depth === 0) break; }}
    i += 1;
  }}
  let brace = i + 1;
  while (/\\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{{');
  depth = 0; quote = null; escaped = false;
  for (i = brace; i < container.length; i += 1) {{
    const c = container[i];
    if (quote) {{
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }}
    if (c === "'" || c === '"' || c === '`') {{ quote = c; continue; }}
    if (c === '{{') depth += 1;
    else if (c === '}}') {{
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }}
  }}
  throw new Error(`fim de ${{name}} não encontrado`);
}}

function keysSource(source) {{
  const key = "  const ROUTE_UPDATE_KEYS = new Set(['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);";
  assert.equal(source.includes(key), true);
  return key;
}}

function loadInternalCluster() {{
  const source = fs.readFileSync(MODULE, 'utf8');
  const keys = keysSource(source);
  const meaningful = functionSource(source, 'isMeaningfulRouteChange');
  const event = functionSource(source, 'isRouteUpdateEvent');
  return Function(`${{keys}}\\n${{meaningful}}\\n${{event}}\\nreturn {{ ROUTE_UPDATE_KEYS, isMeaningfulRouteChange, isRouteUpdateEvent }};`)();
}}

test('módulo route-update-utils mantém identidade estrutural congelada', () => {{
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_MODULE_SHA256);
  assert.match(source, /^\\(function \\(\\) \\{{\\n\\s*'use strict';/);
  assert.match(source, /window\\.FlightFlowRouteUpdateUtils = Object\\.freeze\\(\\{{/);
  assert.match(source, /\\}}\\)\\(\\);\\n$/);
}});

test('constante e duas funções preservam exatamente as identidades congeladas', () => {{
  const source = fs.readFileSync(MODULE, 'utf8');
  const keys = keysSource(source);
  const meaningful = functionSource(source, 'isMeaningfulRouteChange');
  const event = functionSource(source, 'isRouteUpdateEvent');
  assert.equal(Buffer.byteLength(keys, 'utf8'), EXPECTED_KEYS_BYTES);
  assert.equal(crypto.createHash('sha256').update(keys).digest('hex'), EXPECTED_KEYS_SHA256);
  assert.equal(Buffer.byteLength(meaningful, 'utf8'), EXPECTED_MEANINGFUL_BYTES);
  assert.equal(meaningful.split(/\\r?\\n/).length, EXPECTED_MEANINGFUL_LINES);
  assert.equal(crypto.createHash('sha256').update(meaningful).digest('hex'), EXPECTED_MEANINGFUL_SHA256);
  assert.equal(Buffer.byteLength(event, 'utf8'), EXPECTED_EVENT_BYTES);
  assert.equal(event.split(/\\r?\\n/).length, EXPECTED_EVENT_LINES);
  assert.equal(crypto.createHash('sha256').update(event).digest('hex'), EXPECTED_EVENT_SHA256);
}});

test('API pública é congelada e expõe somente isRouteUpdateEvent', () => {{
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = {{ window: {{}} }};
  vm.runInNewContext(source, context);
  const api = context.window.FlightFlowRouteUpdateUtils;
  assert.ok(Object.isFrozen(api));
  assert.deepEqual(Array.from(Object.keys(api)), ['isRouteUpdateEvent']);
  assert.equal(typeof api.isRouteUpdateEvent, 'function');
}});

test('index carrega módulo antes do IIFE e kernel usa alias explícito sem redeclarar cluster', () => {{
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-route-update-utils" src="src/route/route-update-utils.js"></script>';
  assert.equal(html.split(tag).length - 1, 1);
  assert.ok(html.indexOf(tag) < html.indexOf('(function () {{'));
  const kernel = kernelSource();
  assert.ok(kernel.includes('const RouteUpdateUtils = window.FlightFlowRouteUpdateUtils;'));
  assert.ok(kernel.includes("if (!RouteUpdateUtils) throw new Error('FlightFlowRouteUpdateUtils não foi carregado.');"));
  assert.ok(kernel.includes('const {{ isRouteUpdateEvent }} = RouteUpdateUtils;'));
  assert.equal(kernel.includes('ROUTE_UPDATE_KEYS'), false);
  assert.equal(kernel.includes('function isMeaningfulRouteChange('), false);
  assert.equal(kernel.includes('function isRouteUpdateEvent('), false);
  assert.equal([...kernel.matchAll(/(?<![\\w$.])isRouteUpdateEvent\\s*\\(/g)].length, 1);
  assert.ok(kernel.includes('destinationChanged||isRouteUpdateEvent(e)'));
}});

test('cluster permanece desacoplado de estado, DOM, rede, storage e mapa', () => {{
  const source = fs.readFileSync(MODULE, 'utf8');
  for (const token of [
    'state.', 'els.', 'document.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(',
    'goTo(', 'renderCurrent(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(',
    'navigator.', 'google.', 'L.', 'Parser', 'realMapState', 'CustomEvent', 'dispatchEvent',
    'addEventListener', 'querySelector', 'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${{token}}`);
}});

test('ROUTE_UPDATE_KEYS preserva exatamente as nove chaves conhecidas', () => {{
  const {{ ROUTE_UPDATE_KEYS }} = loadInternalCluster();
  assert.deepEqual([...ROUTE_UPDATE_KEYS], ['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);
}});

test('isMeaningfulRouteChange preserva normalização e semântica atual', () => {{
  const {{ isMeaningfulRouteChange }} = loadInternalCluster();
  assert.equal(isMeaningfulRouteChange(null), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'unknown', before: 'A', after: 'B' }}), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'route', before: ' UL304   NAXOP ', after: 'ul304 naxop' }}), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'route', before: 'DCT', after: '   ' }}), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'route', before: 'DCT', after: '—' }}), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'route', before: 'DCT', after: 'n/a' }}), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'route', before: '', after: 'DCT' }}), false);
  assert.equal(isMeaningfulRouteChange({{ key: 'route', before: 'DCT', after: 'UL304' }}), true);
  assert.equal(isMeaningfulRouteChange({{ key: 'cfl', before: 'F100', after: 'F120' }}), true);
  assert.equal(isMeaningfulRouteChange({{ key: 'sid', before: '', after: 'ANPU1A' }}), true);
  assert.equal(isMeaningfulRouteChange({{ key: 'star', before: '', after: 'KOGRA1A' }}), true);
  assert.equal(isMeaningfulRouteChange({{ key: 'runwayDeparture', before: '', after: '11R' }}), true);
  assert.equal(isMeaningfulRouteChange({{ key: 'runwayArrival', before: '', after: '29L' }}), true);
}});

test('isRouteUpdateEvent preserva contextos de mensagem e operação', () => {{
  const {{ isRouteUpdateEvent }} = loadInternalCluster();
  const routeChange = {{ key: 'route', before: 'DCT', after: 'UL304' }};
  assert.equal(isRouteUpdateEvent({{ messageType: 'FPL', changes: [routeChange] }}), false);
  assert.equal(isRouteUpdateEvent({{ messageType: 'CHG', changes: [] }}), false);
  for (const messageType of ['CHG','crq','CRP','DLA','INFARC'])
    assert.equal(isRouteUpdateEvent({{ messageType, changes: [routeChange] }}), true, messageType);
  const sidChange = {{ key: 'sid', before: '', after: 'ANPU1A' }};
  for (const operation of ['Modificação de plano','Atualização de rota','Recepção de Mensagem CHG','Recepção de Mensagem DLA','Envio de Mensagem CRP','Processamento INFARC'])
    assert.equal(isRouteUpdateEvent({{ operation, changes: [sidChange] }}), true, operation);
}});
'''
CONTRACT.write_text(contract, encoding='utf-8')

main_contract = KERNEL_CONTRACT.read_text(encoding='utf-8')
main_contract = replace_once(main_contract, 'const EXPECTED_BYTES = 1139435;', f'const EXPECTED_BYTES = {post_bytes};', 'kernel bytes contract')
main_contract = replace_once(main_contract, "const EXPECTED_SHA256 = '91fe6caa396eba960df8899e72517b7da7e30fd7dd5ebe7a336b8dd8600dfb86';", f"const EXPECTED_SHA256 = '{post_sha}';", 'kernel sha contract')
main_contract = replace_once(main_contract, 'const EXPECTED_LINES = 5392;', f'const EXPECTED_LINES = {post_lines};', 'kernel lines contract')
main_contract = replace_once(
    main_contract,
    "const EXTRACTED_AIRPORT_GROUND_QUERY = ['airportGroundQuery'];\n",
    "const EXTRACTED_AIRPORT_GROUND_QUERY = ['airportGroundQuery'];\nconst EXTRACTED_ROUTE_UPDATE_UTILS = ['isMeaningfulRouteChange', 'isRouteUpdateEvent'];\n",
    'lista route update contract'
)
main_contract = replace_once(
    main_contract,
    "    'const { airportGroundQuery } = AirportGroundQueryModule;',\n",
    "    'const { airportGroundQuery } = AirportGroundQueryModule;',\n    'const RouteUpdateUtils = window.FlightFlowRouteUpdateUtils;',\n    \"if (!RouteUpdateUtils) throw new Error('FlightFlowRouteUpdateUtils não foi carregado.');\",\n    'const { isRouteUpdateEvent } = RouteUpdateUtils;',\n",
    'dependência route update contract'
)
main_contract = replace_once(main_contract, 'após nove extrações puras e sete cortes de timeline', 'após dez extrações puras e sete cortes de timeline', 'título inventário')
main_contract = replace_once(main_contract, 'assert.equal(names.length, 338);', 'assert.equal(names.length, 336);', 'contagem names')
main_contract = replace_once(main_contract, 'assert.equal(counts.size, 338);', 'assert.equal(counts.size, 336);', 'contagem counts')
main_contract = replace_once(
    main_contract,
    '    ...EXTRACTED_AIRPORT_GROUND_QUERY,\n',
    '    ...EXTRACTED_AIRPORT_GROUND_QUERY,\n    ...EXTRACTED_ROUTE_UPDATE_UTILS,\n',
    'spread route update contract'
)
KERNEL_CONTRACT.write_text(main_contract, encoding='utf-8')

print(f'ROUTE_UPDATE_KEYS: {KEY_BYTES} bytes / sha={KEY_SHA}')
for name, source in sources.items():
    print(f'{name}: {len(source.encode("utf-8"))} bytes / {source.count(chr(10))+1} linhas / sha={sha(source)}')
print(f'route-update-utils: {module_bytes} bytes / sha={module_sha} / funções={module_functions}')
print(f'kernel: {post_bytes} bytes / linhas={post_lines} / sha={post_sha} / funções={post_functions}')
print('arquivos permanentes previstos: index.html, src/route/route-update-utils.js, tests/route-update-utils-contract.test.js, tests/main-kernel-contract.test.js')
