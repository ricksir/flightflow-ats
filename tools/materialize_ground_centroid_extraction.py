#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
CENTROID_TEST = ROOT / 'tests' / 'ground-centroid-contract.test.js'
COORD_TEST = ROOT / 'tests' / 'coordinate-utils-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

EXPECTED_BYTES = 279
EXPECTED_LINES = 5
EXPECTED_SHA256 = '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559'
EXPECTED_CONSUMERS = 2
EXPECTED_MODULE_BYTES = 872
EXPECTED_MODULE_SHA256 = '426cfdffc6a803275e6432bea2ee28a2e2c71c6464f4e27998e668641fcd44ea'


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


def function_source(container: str, name: str) -> str:
    marker = f'  function {name}('
    start = container.find(marker)
    if start < 0:
        raise SystemExit(f'{name} não encontrada')
    brace = container.find('{', start)
    if brace < 0:
        raise SystemExit(f'abertura de {name} não encontrada')
    depth = 0
    quote = None
    escaped = False
    for index in range(brace, len(container)):
        char = container[index]
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"`":
            quote = char
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return container[start:index + 1]
    raise SystemExit(f'fim de {name} não encontrado')


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
source = function_source(kernel, 'groundCentroid')
identity = (
    len(source.encode('utf-8')),
    source.count('\n') + 1,
    hashlib.sha256(source.encode('utf-8')).hexdigest(),
)
if identity != (EXPECTED_BYTES, EXPECTED_LINES, EXPECTED_SHA256):
    raise SystemExit(f'identidade de groundCentroid divergiu: {identity}')
consumers = len(re.findall(r'(?<![\w$.])groundCentroid\s*\(', kernel)) - 1
if consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'consumidores de groundCentroid divergiram: {consumers}')
if 'function groundMidpoint(' not in kernel:
    raise SystemExit('groundMidpoint deve permanecer inline neste corte')

module = MODULE.read_text(encoding='utf-8')
module_identity = (len(module.encode('utf-8')), hashlib.sha256(module.encode('utf-8')).hexdigest())
if module_identity != (EXPECTED_MODULE_BYTES, EXPECTED_MODULE_SHA256):
    raise SystemExit(f'coordinate-utils divergiu do baseline: {module_identity}')
if 'groundCentroid' in module:
    raise SystemExit('groundCentroid já existe no módulo antes da materialização')

# Preserva literalmente a função e a insere antes da API pública do módulo.
api_anchor = '  window.FlightFlowCoordinateUtils = Object.freeze({'
module = replace_once(module, api_anchor, source + '\n\n' + api_anchor, 'inserção groundCentroid')
module = replace_once(
    module,
    '    atsCoordinateLabel,\n  });',
    '    atsCoordinateLabel,\n    groundCentroid,\n  });',
    'export groundCentroid',
)
MODULE.write_text(module, encoding='utf-8')

# O IIFE passa a receber groundCentroid pelo módulo existente.
old_alias = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel } = CoordinateUtils;'
new_alias = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid } = CoordinateUtils;'
html = replace_once(html, old_alias, new_alias, 'alias coordinate-utils')
if html.count(source + '\n\n') == 1:
    html = html.replace(source + '\n\n', '', 1)
elif html.count(source + '\n') == 1:
    html = html.replace(source + '\n', '', 1)
else:
    raise SystemExit('declaração inline groundCentroid não removível de modo inequívoco')
HTML.write_text(html, encoding='utf-8')

post_kernel = kernel_source(html)
if 'function groundCentroid(' in post_kernel:
    raise SystemExit('groundCentroid continua inline após materialização')
if post_kernel.count(new_alias) != 1:
    raise SystemExit('alias groundCentroid deve existir exatamente uma vez no IIFE')
post_consumers = len(re.findall(r'(?<![\w$.])groundCentroid\s*\(', post_kernel))
if post_consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'chamadas a groundCentroid mudaram após extração: {post_consumers}')

post_module = MODULE.read_text(encoding='utf-8')
source_in_module = function_source(post_module, 'groundCentroid')
if source_in_module != source:
    raise SystemExit('groundCentroid não foi preservada byte a byte no módulo')
module_bytes = len(post_module.encode('utf-8'))
module_sha = hashlib.sha256(post_module.encode('utf-8')).hexdigest()

# Migra o contrato específico para a nova localização sem relaxar identidade/pureza.
centroid_test = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = {EXPECTED_BYTES};
const EXPECTED_LINES = {EXPECTED_LINES};
const EXPECTED_SHA256 = '{EXPECTED_SHA256}';
const EXPECTED_CONSUMERS = {EXPECTED_CONSUMERS};
const CONTROL_WORDS = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super']);

function kernelSource() {{
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({{';
  const index = html.indexOf(anchor);
  assert.ok(index >= 0);
  const open = html.lastIndexOf('<script', index);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', index);
  return html.slice(bodyStart, close);
}}

function functionSource(container, name) {{
  const marker = `  function ${{name}}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${{name}} deve existir no módulo`);
  const brace = container.indexOf('{{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < container.length; index += 1) {{
    const char = container[index];
    if (quote) {{
      if (escaped) escaped = false;
      else if (char === '\\\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }}
    if (char === "'" || char === '"' || char === '`') {{ quote = char; continue; }}
    if (char === '{{') depth += 1;
    else if (char === '}}') {{
      depth -= 1;
      if (depth === 0) return container.slice(start, index + 1);
    }}
  }}
  throw new Error(`fim de ${{name}} não encontrado`);
}}

function bareCalls(source, ownName) {{
  return [...new Set([...source.matchAll(/(?<![\\w$.])([A-Za-z_$][\\w$]*)\\s*\\(/g)]
    .map(match => match[1])
    .filter(name => name !== ownName && !CONTROL_WORDS.has(name)))].sort();
}}

test('groundCentroid foi movida preservando exatamente a identidade congelada', () => {{
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'groundCentroid');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
}});

test('groundCentroid permanece função geográfica pura e folha', () => {{
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'groundCentroid');
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {{
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${{forbidden}}`);
  }}
  assert.deepEqual(bareCalls(source, 'groundCentroid'), []);
}});

test('IIFE usa groundCentroid pelo coordinate-utils sem alterar os dois consumidores', () => {{
  const kernel = kernelSource();
  assert.equal(kernel.includes('function groundCentroid('), false);
  assert.ok(kernel.includes('{ normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid } = CoordinateUtils;'));
  const consumers = [...kernel.matchAll(/(?<![\\w$.])groundCentroid\\s*\\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('function groundMidpoint('), 'groundMidpoint deve permanecer inline');
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.ok(module.includes('    groundCentroid,\n  });'));
}});
'''
CENTROID_TEST.write_text(centroid_test, encoding='utf-8')

# Amplia o contrato existente do coordinate-utils.
coord_test = COORD_TEST.read_text(encoding='utf-8')
coord_test = re.sub(r'const MODULE_BYTES = \d+;', f'const MODULE_BYTES = {module_bytes};', coord_test, count=1)
coord_test = re.sub(r"const MODULE_SHA256 = '[0-9a-f]+';", f"const MODULE_SHA256 = '{module_sha}';", coord_test, count=1)
needle = "  atsCoordinateLabel: {\n    bytes: 141,\n    sha256: '541c59f892839907c29cbfeac7ac7256251aca2272180d83c4f3b355ecc532b6',\n  },\n"
addition = needle + "  groundCentroid: {\n    bytes: 279,\n    sha256: '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559',\n  },\n"
coord_test = replace_once(coord_test, needle, addition, 'EXPECTED groundCentroid')
coord_test = replace_once(
    coord_test,
    "test('quatro utilitários de coordenadas preservam identidade byte a byte após a extração', () => {",
    "test('cinco utilitários geográficos preservam identidade byte a byte após a extração', () => {",
    'título coordinate-utils',
)
coord_test = replace_once(coord_test, old_alias, new_alias, 'alias no contrato coordinate-utils')
COORD_TEST.write_text(coord_test, encoding='utf-8')

# Atualiza identidade e inventário do núcleo principal.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(
    kernel_test,
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel'\n];",
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid'\n];",
    'lista coordinate-utils extraída',
)
kernel_test = replace_once(kernel_test, old_alias, new_alias, 'alias main-kernel')
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 346);', '  assert.equal(names.length, 345);', 'contagem funções')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 346);', '  assert.equal(counts.size, 345);', 'contagem nomes')
post_source = kernel_source(html).strip('\n') + '\n'
expected_bytes = len(post_source.encode('utf-8'))
expected_sha = hashlib.sha256(post_source.encode('utf-8')).hexdigest()
expected_lines = post_source.count('\n')
kernel_test = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', kernel_test, count=1)
kernel_test = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", kernel_test, count=1)
kernel_test = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', kernel_test, count=1)
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(
    f'materializado: groundCentroid -> coordinate-utils; '
    f'módulo {module_bytes} bytes / {module_sha}; '
    f'núcleo {expected_bytes} bytes / {expected_lines} linhas / {expected_sha}; '
    f'consumidores preservados={post_consumers}'
)
