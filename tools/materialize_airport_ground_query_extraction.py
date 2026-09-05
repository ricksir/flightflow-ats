#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'airport-ground-query.js'
AIRPORT_TEST = ROOT / 'tests' / 'airport-ground-query-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

EXPECTED_BYTES = 450
EXPECTED_LINES = 9
EXPECTED_SHA = '48f4d99c30819746c8b78e69904766a0d43a4e3babd67f7e2802fa1d97637f54'
EXPECTED_CONSUMERS = 1
EXPECTED_KERNEL_BYTES = 1140678
EXPECTED_KERNEL_LINES = 5418
EXPECTED_KERNEL_SHA = 'fb104639e66fd3069833638de3b0ff9967882be9da8c81fc8a1df1f53a6703c7'
EXPECTED_KERNEL_FUNCTIONS = 341
EXPECTED_MODULE_BYTES = 576
EXPECTED_MODULE_SHA = '9678a2d84a056836ad3ba12db6a95de99d505e80187f9b1618110418f46e2306'

COORD_SCRIPT = '<script id="flightflow-coordinate-utils" src="src/geo/coordinate-utils.js"></script>'
GROUND_SCRIPT = '<script id="flightflow-airport-ground-query" src="src/geo/airport-ground-query.js"></script>'
COORD_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;'
GROUND_WIRING = """const AirportGroundQueryModule = window.FlightFlowAirportGroundQuery;
  if (!AirportGroundQueryModule) throw new Error('FlightFlowAirportGroundQuery não foi carregado.');
  const { airportGroundQuery } = AirportGroundQueryModule;"""


def sha(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.index(anchor)
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.index('>', open_pos) + 1
    close = html.index('</script>', pos)
    return html[body_start:close].replace('\r\n', '\n').strip('\n') + '\n'


def extract_function(source: str, name: str) -> str:
    matches = list(re.finditer(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\(', source))
    if len(matches) != 1:
        raise SystemExit(f'{name}: esperado 1 declaração, encontrado {len(matches)}')
    match = matches[0]
    start = match.start() + (1 if match.group(1) == '\n' else 0)
    paren = source.find('(', start)
    i = paren
    depth = 0
    mode = 'code'
    quote = ''
    escaped = False
    paren_end = None
    while i < len(source):
        c = source[i]
        n = source[i + 1] if i + 1 < len(source) else ''
        if mode == 'line':
            if c == '\n': mode = 'code'
            i += 1; continue
        if mode == 'block':
            if c == '*' and n == '/': mode = 'code'; i += 2; continue
            i += 1; continue
        if mode in ('string', 'template'):
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: mode = 'code'
            i += 1; continue
        if c == '/' and n == '/': mode = 'line'; i += 2; continue
        if c == '/' and n == '*': mode = 'block'; i += 2; continue
        if c in ("'", '"', '`'):
            mode = 'template' if c == '`' else 'string'; quote = c; i += 1; continue
        if c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                paren_end = i
                break
        i += 1
    if paren_end is None:
        raise SystemExit(f'{name}: parâmetros não terminados')
    brace = paren_end + 1
    while brace < len(source) and source[brace].isspace(): brace += 1
    if brace >= len(source) or source[brace] != '{':
        raise SystemExit(f'{name}: abertura não encontrada')
    i = brace
    depth = 0
    mode = 'code'
    quote = ''
    escaped = False
    while i < len(source):
        c = source[i]
        n = source[i + 1] if i + 1 < len(source) else ''
        if mode == 'line':
            if c == '\n': mode = 'code'
            i += 1; continue
        if mode == 'block':
            if c == '*' and n == '/': mode = 'code'; i += 2; continue
            i += 1; continue
        if mode in ('string', 'template'):
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: mode = 'code'
            i += 1; continue
        if c == '/' and n == '/': mode = 'line'; i += 2; continue
        if c == '/' and n == '*': mode = 'block'; i += 2; continue
        if c in ("'", '"', '`'):
            mode = 'template' if c == '`' else 'string'; quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return source[start:i + 1]
        i += 1
    raise SystemExit(f'{name}: corpo não terminado')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)

if len(kernel.encode('utf-8')) != EXPECTED_KERNEL_BYTES:
    raise SystemExit(f'kernel bytes divergiram: {len(kernel.encode("utf-8"))}')
if kernel.count('\n') != EXPECTED_KERNEL_LINES:
    raise SystemExit(f'kernel linhas divergiram: {kernel.count(chr(10))}')
if sha(kernel) != EXPECTED_KERNEL_SHA:
    raise SystemExit(f'kernel SHA divergiu: {sha(kernel)}')
named = re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', kernel)
if len(named) != EXPECTED_KERNEL_FUNCTIONS or len(set(named)) != EXPECTED_KERNEL_FUNCTIONS:
    raise SystemExit('inventário nomeado do kernel divergiu do baseline')
if MODULE.exists():
    raise SystemExit('módulo airport-ground-query já existe')

source = extract_function(kernel, 'airportGroundQuery')
if len(source.encode('utf-8')) != EXPECTED_BYTES:
    raise SystemExit('airportGroundQuery: tamanho divergiu')
if source.count('\n') + 1 != EXPECTED_LINES:
    raise SystemExit('airportGroundQuery: linhas divergiram')
if sha(source) != EXPECTED_SHA:
    raise SystemExit('airportGroundQuery: SHA divergiu')
consumers = len(re.findall(r'(?<![\w$.])airportGroundQuery\s*\(', kernel)) - 1
if consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'airportGroundQuery: consumidores esperados={EXPECTED_CONSUMERS}, encontrados={consumers}')
for token in ['state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser', 'realMapState']:
    if token in source:
        raise SystemExit(f'airportGroundQuery ganhou acoplamento proibido: {token}')

module = "(function () {\n  'use strict';\n\n" + source + "\n\n  window.FlightFlowAirportGroundQuery = Object.freeze({\n    airportGroundQuery,\n  });\n})();\n"
if len(module.encode('utf-8')) != EXPECTED_MODULE_BYTES or sha(module) != EXPECTED_MODULE_SHA:
    raise SystemExit(f'módulo materializado divergiu: bytes={len(module.encode("utf-8"))} sha={sha(module)}')
MODULE.write_text(module, encoding='utf-8')

# Carrega o módulo logo após coordinate-utils e antes do IIFE principal.
html = replace_once(html, COORD_SCRIPT, COORD_SCRIPT + '\n    ' + GROUND_SCRIPT, 'script airport-ground-query')
# Injeta alias explícito mantendo o consumidor pelo mesmo nome local.
html = replace_once(html, COORD_ALIAS, COORD_ALIAS + '\n\n  ' + GROUND_WIRING, 'wiring airport-ground-query')
# Remove somente a declaração inline congelada.
if source + '\n\n' in html:
    html = replace_once(html, source + '\n\n', '', 'declaração inline airportGroundQuery')
else:
    html = replace_once(html, source, '', 'declaração inline airportGroundQuery')
HTML.write_text(html, encoding='utf-8')

new_kernel = kernel_source(html)
if 'function airportGroundQuery(' in new_kernel:
    raise SystemExit('airportGroundQuery permaneceu declarada inline')
if len(re.findall(r'(?<![\w$.])airportGroundQuery\s*\(', new_kernel)) != EXPECTED_CONSUMERS:
    raise SystemExit('consumidor de airportGroundQuery mudou após o corte')
if 'function goTo(' not in new_kernel or 'function renderCurrent(' not in new_kernel:
    raise SystemExit('função protegida foi alterada/removida')
if new_kernel.count(GROUND_WIRING) != 1:
    raise SystemExit('wiring airport-ground-query deve existir exatamente uma vez')
if html.count(GROUND_SCRIPT) != 1:
    raise SystemExit('script airport-ground-query deve existir exatamente uma vez')

# Migra o contrato específico para a nova localização.
airport_test = r'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'airport-ground-query.js');
const REFERENCE = '<script id="flightflow-airport-ground-query" src="src/geo/airport-ground-query.js"></script>';
const EXPECTED_BYTES = 450;
const EXPECTED_LINES = 9;
const EXPECTED_SHA256 = '48f4d99c30819746c8b78e69904766a0d43a4e3babd67f7e2802fa1d97637f54';
const EXPECTED_CONSUMERS = 1;
const MODULE_BYTES = __MODULE_BYTES__;
const MODULE_SHA256 = '__MODULE_SHA__';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart);
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir exatamente no módulo`);
  const paren = container.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;
  while (i < container.length) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) break; }
    i += 1;
  }
  let brace = i + 1;
  while (/\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{');
  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('módulo airport-ground-query mantém identidade estrutural congelada', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith("(function () {\n  'use strict';"));
  assert.ok(source.includes('window.FlightFlowAirportGroundQuery = Object.freeze({'));
  assert.ok(source.includes('    airportGroundQuery,'));
  assert.ok(source.endsWith('})();\n'));
});

test('airportGroundQuery foi movida preservando exatamente a identidade congelada', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'airportGroundQuery');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('módulo carrega antes do IIFE e o núcleo usa alias explícito sem redeclarar a função', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência airport-ground-query deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'módulo deve carregar antes do IIFE principal');
  const kernel = kernelSource();
  assert.ok(kernel.includes('const AirportGroundQueryModule = window.FlightFlowAirportGroundQuery;'));
  assert.ok(kernel.includes("if (!AirportGroundQueryModule) throw new Error('FlightFlowAirportGroundQuery não foi carregado.');"));
  assert.ok(kernel.includes('const { airportGroundQuery } = AirportGroundQueryModule;'));
  assert.equal(kernel.includes('function airportGroundQuery('), false);
  const consumers = [...kernel.matchAll(/(?<![\w$.])airportGroundQuery\s*\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
});

test('airportGroundQuery permanece folha e desacoplada de infraestrutura', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'airportGroundQuery');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('airportGroundQuery preserva raio, precisão e filtros Overpass atuais', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'airportGroundQuery');
  const fn = Function(`${source}; return airportGroundQuery;`)();
  const query = fn({ lat: -15.8692, lon: -47.9208 });
  assert.ok(query.startsWith('[out:json][timeout:28];('));
  assert.ok(query.includes('way(around:7000,-15.8692000,-47.9208000)["aeroway"~"^(runway|taxiway|taxilane|parking_position|apron|terminal)$"];'));
  assert.ok(query.includes('node(around:7000,-15.8692000,-47.9208000)["aeroway"~"^(holding_position|parking_position|gate|terminal)$"];'));
  assert.ok(query.endsWith(');out body geom;'));
});

test('airportGroundQuery preserva coerção numérica de coordenadas textuais', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'airportGroundQuery');
  const fn = Function(`${source}; return airportGroundQuery;`)();
  const query = fn({ lat: '1.5', lon: '2.25' });
  assert.ok(query.includes('around:7000,1.5000000,2.2500000'));
});
'''
airport_test = airport_test.replace('\\\'use strict\\\';', "'use strict';")
airport_test = airport_test.replace('__MODULE_BYTES__', str(EXPECTED_MODULE_BYTES)).replace('__MODULE_SHA__', EXPECTED_MODULE_SHA)
AIRPORT_TEST.write_text(airport_test, encoding='utf-8')

# Atualiza o contrato estrutural do kernel mecanicamente.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(kernel_test, f'const EXPECTED_BYTES = {EXPECTED_KERNEL_BYTES};', f'const EXPECTED_BYTES = {len(new_kernel.encode("utf-8"))};', 'kernel bytes')
kernel_test = replace_once(kernel_test, f"const EXPECTED_SHA256 = '{EXPECTED_KERNEL_SHA}';", f"const EXPECTED_SHA256 = '{sha(new_kernel)}';", 'kernel sha')
kernel_test = replace_once(kernel_test, f'const EXPECTED_LINES = {EXPECTED_KERNEL_LINES};', f'const EXPECTED_LINES = {new_kernel.count(chr(10))};', 'kernel lines')
kernel_test = replace_once(kernel_test, "const EXTRACTED_PLAYBACK = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];", "const EXTRACTED_AIRPORT_GROUND_QUERY = ['airportGroundQuery'];\nconst EXTRACTED_PLAYBACK = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];", 'lista extraída airportGroundQuery')
coord_token = "    'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;',"
ground_tokens = coord_token + "\n    'const AirportGroundQueryModule = window.FlightFlowAirportGroundQuery;',\n    \"if (!AirportGroundQueryModule) throw new Error('FlightFlowAirportGroundQuery não foi carregado.');\",\n    'const { airportGroundQuery } = AirportGroundQueryModule;',"
kernel_test = replace_once(kernel_test, coord_token, ground_tokens, 'tokens de wiring airportGroundQuery')
kernel_test = replace_once(kernel_test, "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e sete cortes de timeline'", "test('inventário interno do núcleo mantém nomes únicos após sete extrações puras e sete cortes de timeline'", 'título inventário')
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 341);', '  assert.equal(names.length, 340);', 'contagem nomes')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 341);', '  assert.equal(counts.size, 340);', 'contagem únicos')
kernel_test = replace_once(kernel_test, '    ...EXTRACTED_COORDINATE_UTILS,\n    ...EXTRACTED_PLAYBACK,', '    ...EXTRACTED_COORDINATE_UTILS,\n    ...EXTRACTED_AIRPORT_GROUND_QUERY,\n    ...EXTRACTED_PLAYBACK,', 'inventário extraído')
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(f'airportGroundQuery: {EXPECTED_BYTES} bytes / {EXPECTED_LINES} linhas / {EXPECTED_SHA} / consumidores={EXPECTED_CONSUMERS}')
print(f'airport-ground-query module: {EXPECTED_MODULE_BYTES} bytes / sha={EXPECTED_MODULE_SHA}')
print(f'kernel: {len(new_kernel.encode("utf-8"))} bytes / linhas={new_kernel.count(chr(10))} / sha={sha(new_kernel)} / funções=340')
