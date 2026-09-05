#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
COORD_TEST = ROOT / 'tests' / 'coordinate-utils-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'
POLYGON_TEST = ROOT / 'tests' / 'polygon-geo-centroid-contract.test.js'

EXPECTED_BYTES = 337
EXPECTED_LINES = 9
EXPECTED_SHA = 'af2ed9697962ac78039ec6c758b9de6e8f1e24367e5d362a8cf245b14572ba61'
EXPECTED_CONSUMERS = 1
EXPECTED_MODULE_BYTES = 1950
EXPECTED_MODULE_SHA = '9e946ea3e60193aaef3c1502699c92fa3bfe5d9d9cfee62afab8361ec9c360cd'
EXPECTED_KERNEL_BYTES = 1140997
EXPECTED_KERNEL_LINES = 5428
EXPECTED_KERNEL_SHA = '75f852a0d2190deaeeb1ecfc58f91b66c791e1c1100be869e5eaf4d4c50a3baa'
EXPECTED_KERNEL_FUNCTIONS = 342

OLD_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode } = CoordinateUtils;'
NEW_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;'

EXISTING = {
    'normalizeCoordinateInput': (196, '25eeb5945c7e4d2b8d6e3fcd17bce4fd78d3eb4c51e779c9f80360a26e75f528'),
    'validAerodromeCoordinate': (192, '3e113b6ba7a93eb851c5f70ad19a5aff715436c3b1804a36da4335fef87563c5'),
    'formatGeoCoord': (135, 'a7219e2ed5d6939754accd2b96248cecbfc826c43bc905718d082c52ee6f963e'),
    'atsCoordinateLabel': (141, '541c59f892839907c29cbfeac7ac7256251aca2272180d83c4f3b355ecc532b6'),
    'groundCentroid': (279, '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559'),
    'runwayTokens': (104, 'ea7c2d4dc62cfc56fa3bda6177625df9caff5213888cf700d5d5ad05d8eb7b2f'),
    'runwayHeading': (243, '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715'),
    'runwayHeadingFromCode': (360, '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053'),
}

def sha(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.index(anchor)
    open_pos = html.rfind('<script', 0, pos)
    body = html.index('>', open_pos) + 1
    close = html.index('</script>', pos)
    return html[body:close].strip('\n') + '\n'

def extract_function(source: str, name: str) -> str:
    match = re.search(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\(', source)
    if not match:
        raise SystemExit(f'{name}: declaração não encontrada')
    start = match.start() + (1 if match.group(1) == '\n' else 0)
    brace = source.find('{', source.find('(', start))
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        c = source[i]
        n = source[i + 1] if i + 1 < len(source) else ''
        if line_comment:
            if c == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if c == '*' and n == '/': block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: quote = None
            i += 1; continue
        if c == '/' and n == '/': line_comment = True; i += 2; continue
        if c == '/' and n == '*': block_comment = True; i += 2; continue
        if c in ("'", '"', '`'): quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return source[start:i + 1]
        i += 1
    raise SystemExit(f'{name}: fim não encontrado')

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)

html = HTML.read_text(encoding='utf-8')
module = MODULE.read_text(encoding='utf-8')
kernel = kernel_source(html)

if len(module.encode('utf-8')) != EXPECTED_MODULE_BYTES or sha(module) != EXPECTED_MODULE_SHA:
    raise SystemExit('coordinate-utils divergiu do baseline congelado')
if len(kernel.encode('utf-8')) != EXPECTED_KERNEL_BYTES or kernel.count('\n') != EXPECTED_KERNEL_LINES or sha(kernel) != EXPECTED_KERNEL_SHA:
    raise SystemExit('kernel divergiu do baseline congelado')
if 'polygonGeoCentroid' in module:
    raise SystemExit('polygonGeoCentroid já está no módulo')

source = extract_function(kernel, 'polygonGeoCentroid')
if len(source.encode('utf-8')) != EXPECTED_BYTES or source.count('\n') + 1 != EXPECTED_LINES or sha(source) != EXPECTED_SHA:
    raise SystemExit('polygonGeoCentroid divergiu da identidade congelada')
consumers = len(re.findall(r'(?<![\w$.])polygonGeoCentroid\s*\(', kernel)) - 1
if consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'consumidores polygonGeoCentroid: esperado {EXPECTED_CONSUMERS}, encontrado {consumers}')

for name, (size, digest) in EXISTING.items():
    body = extract_function(module, name)
    if len(body.encode('utf-8')) != size or sha(body) != digest:
        raise SystemExit(f'{name}: identidade anterior mudou antes do corte')

# Materializa no módulo preservando literalmente os 337 bytes congelados.
anchor = '  window.FlightFlowCoordinateUtils = Object.freeze({'
module = replace_once(module, anchor, source + '\n\n' + anchor, 'âncora de exportação')
module = replace_once(module, '    runwayHeadingFromCode,\n', '    runwayHeadingFromCode,\n    polygonGeoCentroid,\n', 'export polygonGeoCentroid')

# Remove somente a declaração inline e o espaçamento vazio imediatamente posterior.
if source + '\n\n' in html:
    html = replace_once(html, source + '\n\n', '', 'declaração inline polygonGeoCentroid')
else:
    html = replace_once(html, source, '', 'declaração inline polygonGeoCentroid')
html = replace_once(html, OLD_ALIAS, NEW_ALIAS, 'alias CoordinateUtils no index')

# Toda expectativa textual do alias acompanha mecanicamente a ampliação da API.
for path in sorted((ROOT / 'tests').glob('*.test.js')):
    text = path.read_text(encoding='utf-8')
    if OLD_ALIAS in text:
        path.write_text(text.replace(OLD_ALIAS, NEW_ALIAS), encoding='utf-8')

MODULE.write_text(module, encoding='utf-8')
HTML.write_text(html, encoding='utf-8')

# Contrato específico passa a validar a nova localização, mantendo identidade/semântica.
POLYGON_TEST.write_text("""'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = 337;
const EXPECTED_LINES = 9;
const EXPECTED_SHA256 = 'af2ed9697962ac78039ec6c758b9de6e8f1e24367e5d362a8cf245b14572ba61';
const EXPECTED_CONSUMERS = 1;
const EXPECTED_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0);
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no coordinate-utils`);
  const brace = container.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return container.slice(start, i + 1); }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('polygonGeoCentroid foi movida preservando exatamente a identidade congelada', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'polygonGeoCentroid');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('polygonGeoCentroid permanece puro e desacoplado de infraestrutura', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'polygonGeoCentroid');
  for (const token of ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','fetch(','goTo(','renderCurrent(','stopPlayback(','setTimeout(','setInterval(','requestAnimationFrame(','google.','L.','Parser','realMapState']) {
    assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  }
});

test('IIFE usa polygonGeoCentroid pelo coordinate-utils sem alterar o único consumidor', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes('function polygonGeoCentroid('), false);
  assert.ok(kernel.includes(EXPECTED_ALIAS));
  const consumers = [...kernel.matchAll(/(?<![\\w$.])polygonGeoCentroid\\s*\\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.ok(module.includes('    polygonGeoCentroid,'));
});

test('polygonGeoCentroid preserva média, coerção numérica e descarte de pontos inválidos', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'polygonGeoCentroid');
  const fn = Function(`${source}; return polygonGeoCentroid;`)();
  assert.equal(fn(null), null);
  assert.equal(fn([]), null);
  assert.deepEqual(fn([[0, 0], [2, 4]]), { lon: 1, lat: 2 });
  assert.deepEqual(fn([[-48, -16], [-47, -15]]), { lon: -47.5, lat: -15.5 });
  assert.deepEqual(fn([['3', '4'], [1, 2], [NaN, 5]]), { lon: 2, lat: 3 });
});
""", encoding='utf-8')

# Atualiza contrato do módulo com a nona função e novo hash/tamanho.
coord = COORD_TEST.read_text(encoding='utf-8')
coord = replace_once(coord, "const MODULE_BYTES = 1950;", f"const MODULE_BYTES = {len(module.encode('utf-8'))};", 'MODULE_BYTES')
coord = replace_once(coord, "const MODULE_SHA256 = '9e946ea3e60193aaef3c1502699c92fa3bfe5d9d9cfee62afab8361ec9c360cd';", f"const MODULE_SHA256 = '{sha(module)}';", 'MODULE_SHA256')
entry_anchor = "  runwayHeadingFromCode: {\n    bytes: 360,\n    sha256: '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053',\n  },\n"
entry_new = entry_anchor + "  polygonGeoCentroid: {\n    bytes: 337,\n    sha256: 'af2ed9697962ac78039ec6c758b9de6e8f1e24367e5d362a8cf245b14572ba61',\n  },\n"
coord = replace_once(coord, entry_anchor, entry_new, 'EXPECTED polygonGeoCentroid')
coord = replace_once(coord, "test('oito utilitários geográficos preservam identidade byte a byte após a extração'", "test('nove utilitários geográficos preservam identidade byte a byte após a extração'", 'título coordinate-utils')
COORD_TEST.write_text(coord, encoding='utf-8')

# Atualiza contrato estrutural do kernel a partir do resultado materializado.
new_kernel = kernel_source(html)
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(kernel_test, f'const EXPECTED_BYTES = {EXPECTED_KERNEL_BYTES};', f'const EXPECTED_BYTES = {len(new_kernel.encode("utf-8"))};', 'kernel bytes')
kernel_test = replace_once(kernel_test, f"const EXPECTED_SHA256 = '{EXPECTED_KERNEL_SHA}';", f"const EXPECTED_SHA256 = '{sha(new_kernel)}';", 'kernel sha')
kernel_test = replace_once(kernel_test, f'const EXPECTED_LINES = {EXPECTED_KERNEL_LINES};', f'const EXPECTED_LINES = {new_kernel.count(chr(10))};', 'kernel lines')
kernel_test = replace_once(kernel_test, "  'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode'\n];", "  'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode', 'polygonGeoCentroid'\n];", 'EXTRACTED_COORDINATE_UTILS')
kernel_test = kernel_test.replace('assert.equal(names.length, 342);', 'assert.equal(names.length, 341);')
kernel_test = kernel_test.replace('assert.equal(counts.size, 342);', 'assert.equal(counts.size, 341);')
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

# Revalida identidades e fronteira pós-corte.
for name, (size, digest) in EXISTING.items():
    body = extract_function(module, name)
    if len(body.encode('utf-8')) != size or sha(body) != digest:
        raise SystemExit(f'{name}: identidade mudou durante o corte')
body = extract_function(module, 'polygonGeoCentroid')
if len(body.encode('utf-8')) != EXPECTED_BYTES or sha(body) != EXPECTED_SHA:
    raise SystemExit('polygonGeoCentroid não foi preservida literalmente no módulo')
if 'function polygonGeoCentroid(' in new_kernel:
    raise SystemExit('declaração inline de polygonGeoCentroid permaneceu no kernel')
if len(re.findall(r'(?<![\w$.])polygonGeoCentroid\s*\(', new_kernel)) != EXPECTED_CONSUMERS:
    raise SystemExit('consumidor de polygonGeoCentroid mudou após o corte')

print(f'polygonGeoCentroid: {EXPECTED_BYTES} bytes / {EXPECTED_LINES} linhas / {EXPECTED_SHA} / consumidores={EXPECTED_CONSUMERS}')
print(f'coordinate-utils: {len(module.encode("utf-8"))} bytes / sha={sha(module)}')
print(f'kernel: {len(new_kernel.encode("utf-8"))} bytes / linhas={new_kernel.count(chr(10))} / sha={sha(new_kernel)}')
