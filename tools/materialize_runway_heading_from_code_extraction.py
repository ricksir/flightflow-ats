#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
COORD_TEST = ROOT / 'tests' / 'coordinate-utils-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'
TARGET_TEST = ROOT / 'tests' / 'runway-heading-from-code-contract.test.js'

NAME = 'runwayHeadingFromCode'
EXPECTED_BYTES = 360
EXPECTED_LINES = 7
EXPECTED_SHA256 = '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053'
EXPECTED_CONSUMERS = 1
EXPECTED_MODULE_BYTES = 1561
EXPECTED_MODULE_SHA256 = '06e572d6f76851bb8ff8a25e17e97add6f89a429581fe5b6b0c8b75fec75396d'
OLD_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;'
NEW_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode } = CoordinateUtils;'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.find(anchor)
    if pos < 0:
        raise SystemExit('ponte FIR não encontrada')
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.find('>', open_pos) + 1
    close_pos = html.find('</script>', pos)
    if open_pos < 0 or body_start <= open_pos or close_pos <= body_start:
        raise SystemExit('IIFE principal não delimitado')
    return html[body_start:close_pos]


def function_source(container: str, name: str) -> str:
    marker = f'  function {name}('
    start = container.find(marker)
    if start < 0:
        raise SystemExit(f'{name} não encontrada')
    brace = container.find('{', start)
    if brace < 0:
        raise SystemExit(f'abertura de {name} não encontrada')
    depth = 0
    mode = 'code'
    quote = ''
    escaped = False
    i = brace
    while i < len(container):
        c = container[i]
        nxt = container[i + 1] if i + 1 < len(container) else ''
        if mode == 'line':
            if c == '\n': mode = 'code'
            i += 1; continue
        if mode == 'block':
            if c == '*' and nxt == '/': mode = 'code'; i += 2; continue
            i += 1; continue
        if mode == 'string':
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: mode = 'code'
            i += 1; continue
        if mode == 'template':
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == '`': mode = 'code'
            i += 1; continue
        if c == '/' and nxt == '/': mode = 'line'; i += 2; continue
        if c == '/' and nxt == '*': mode = 'block'; i += 2; continue
        if c in "'\"": mode = 'string'; quote = c; i += 1; continue
        if c == '`': mode = 'template'; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return container[start:i + 1]
        i += 1
    raise SystemExit(f'fim de {name} não encontrado')


def identity(source: str):
    return (
        len(source.encode('utf-8')),
        source.count('\n') + 1,
        hashlib.sha256(source.encode('utf-8')).hexdigest(),
    )


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
source = function_source(kernel, NAME)
if identity(source) != (EXPECTED_BYTES, EXPECTED_LINES, EXPECTED_SHA256):
    raise SystemExit(f'identidade de {NAME} divergiu: {identity(source)}')

consumers = len(re.findall(r'(?<![\w$.])runwayHeadingFromCode\s*\(', kernel)) - 1
if consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'consumidores de {NAME} divergiram: {consumers}')
for token in ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','fetch(','goTo(','renderCurrent(','stopPlayback(']:
    if token in source:
        raise SystemExit(f'{NAME} ganhou acoplamento proibido: {token}')

module = MODULE.read_text(encoding='utf-8')
module_id = (len(module.encode('utf-8')), hashlib.sha256(module.encode('utf-8')).hexdigest())
if module_id != (EXPECTED_MODULE_BYTES, EXPECTED_MODULE_SHA256):
    raise SystemExit(f'coordinate-utils divergiu do baseline: {module_id}')
if NAME in module:
    raise SystemExit(f'{NAME} já existe no coordinate-utils antes do corte')

# Congela as sete funções existentes para provar que o corte não as reescreveu.
existing_names = [
    'normalizeCoordinateInput','validAerodromeCoordinate','formatGeoCoord','atsCoordinateLabel',
    'groundCentroid','runwayTokens','runwayHeading'
]
existing_sources = {name: function_source(module, name) for name in existing_names}

# Insere literalmente a função antes da API pública e amplia apenas o export.
api_anchor = '  window.FlightFlowCoordinateUtils = Object.freeze({'
module = replace_once(module, api_anchor, source + '\n\n' + api_anchor, 'inserção runwayHeadingFromCode')
module = replace_once(
    module,
    '    runwayHeading,\n  });',
    '    runwayHeading,\n    runwayHeadingFromCode,\n  });',
    'export runwayHeadingFromCode',
)
MODULE.write_text(module, encoding='utf-8')

# O IIFE recebe o novo utilitário pelo alias do módulo e perde somente a declaração inline.
html = replace_once(html, OLD_ALIAS, NEW_ALIAS, 'alias CoordinateUtils no index')
if html.count(source + '\n\n') == 1:
    html = html.replace(source + '\n\n', '', 1)
elif html.count(source + '\n') == 1:
    html = html.replace(source + '\n', '', 1)
else:
    raise SystemExit(f'declaração inline {NAME} não removível de modo inequívoco')
HTML.write_text(html, encoding='utf-8')

post_module = MODULE.read_text(encoding='utf-8')
for name, before in existing_sources.items():
    after = function_source(post_module, name)
    if after != before:
        raise SystemExit(f'{name} mudou durante o corte de {NAME}')
if function_source(post_module, NAME) != source:
    raise SystemExit(f'{NAME} não foi preservada byte a byte no módulo')

post_kernel = kernel_source(html)
if f'function {NAME}(' in post_kernel:
    raise SystemExit(f'{NAME} continua inline após a materialização')
if post_kernel.count(NEW_ALIAS) != 1:
    raise SystemExit('novo alias CoordinateUtils deve existir exatamente uma vez no kernel')
post_consumers = len(re.findall(r'(?<![\w$.])runwayHeadingFromCode\s*\(', post_kernel))
if post_consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'consumidores de {NAME} mudaram após o corte: {post_consumers}')

module_bytes = len(post_module.encode('utf-8'))
module_sha = hashlib.sha256(post_module.encode('utf-8')).hexdigest()

# Migra o contrato específico para validar a função na nova localização.
target_test = ''''use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = 360;
const EXPECTED_LINES = 7;
const EXPECTED_SHA256 = '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053';
const EXPECTED_CONSUMERS = 1;

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
  assert.ok(start >= 0, `${name} deve existir no módulo`);
  const brace = container.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
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

test('runwayHeadingFromCode foi movida preservando exatamente a identidade congelada', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeadingFromCode');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('runwayHeadingFromCode permanece pura e sem dependência de infraestrutura', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeadingFromCode');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'google.', 'L.', 'Parser', 'realMapState'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('IIFE usa runwayHeadingFromCode pelo CoordinateUtils preservando o único consumidor', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes('function runwayHeadingFromCode('), false);
  assert.ok(kernel.includes('const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode } = CoordinateUtils;'));
  const consumers = [...kernel.matchAll(/(?<![\\w$.])runwayHeadingFromCode\\s*\\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
});

test('runwayHeadingFromCode preserva semântica atual de cabeceiras e fallback', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeadingFromCode');
  const fn = Function(`${source}; return runwayHeadingFromCode;`)();
  assert.equal(fn('09', 270), 90);
  assert.equal(fn('09L', 270), 90);
  assert.equal(fn('18C', 270), 180);
  assert.equal(fn('36R', 270), 0);
  assert.equal(fn('', 270), 270);
  assert.equal(fn('XX', 450), 90);
});
'''
TARGET_TEST.write_text(target_test, encoding='utf-8')

# Amplia o contrato do módulo com o oitavo utilitário e o novo baseline estrutural.
coord = COORD_TEST.read_text(encoding='utf-8')
coord = re.sub(r'const MODULE_BYTES = \d+;', f'const MODULE_BYTES = {module_bytes};', coord, count=1)
coord = re.sub(r"const MODULE_SHA256 = '[0-9a-f]+';", f"const MODULE_SHA256 = '{module_sha}';", coord, count=1)
needle = "  runwayHeading: {\n    bytes: 243,\n    sha256: '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715',\n  },\n"
addition = needle + "  runwayHeadingFromCode: {\n    bytes: 360,\n    sha256: '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053',\n  },\n"
coord = replace_once(coord, needle, addition, 'EXPECTED runwayHeadingFromCode')
coord = replace_once(
    coord,
    "test('sete utilitários geográficos preservam identidade byte a byte após a extração', () => {",
    "test('oito utilitários geográficos preservam identidade byte a byte após a extração', () => {",
    'título coordinate-utils',
)
coord = replace_once(coord, OLD_ALIAS, NEW_ALIAS, 'alias coordinate-utils contract')
COORD_TEST.write_text(coord, encoding='utf-8')

# Atualiza contratos que congelam o mesmo alias explícito do CoordinateUtils.
alias_updated = []
for test_path in sorted((ROOT / 'tests').glob('*.test.js')):
    if test_path in {COORD_TEST, TARGET_TEST, KERNEL_TEST}:
        continue
    text = test_path.read_text(encoding='utf-8')
    if OLD_ALIAS in text:
        text = text.replace(OLD_ALIAS, NEW_ALIAS)
        test_path.write_text(text, encoding='utf-8')
        alias_updated.append(test_path.relative_to(ROOT).as_posix())

# Atualiza inventário e identidade estrutural do núcleo.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(
    kernel_test,
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid', 'runwayTokens', 'runwayHeading'\n];",
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid', 'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode'\n];",
    'lista coordinate-utils extraída',
)
kernel_test = replace_once(kernel_test, OLD_ALIAS, NEW_ALIAS, 'alias main-kernel')
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 343);', '  assert.equal(names.length, 342);', 'contagem funções')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 343);', '  assert.equal(counts.size, 342);', 'contagem nomes')
post_source = kernel_source(html).strip('\n') + '\n'
expected_bytes = len(post_source.encode('utf-8'))
expected_sha = hashlib.sha256(post_source.encode('utf-8')).hexdigest()
expected_lines = post_source.count('\n')
kernel_test = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', kernel_test, count=1)
kernel_test = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", kernel_test, count=1)
kernel_test = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', kernel_test, count=1)
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(
    f'materializado: {NAME} -> coordinate-utils; '
    f'módulo {module_bytes} bytes / {module_sha}; '
    f'núcleo {expected_bytes} bytes / {expected_lines} linhas / {expected_sha}; '
    f'consumidores preservados={post_consumers}; alias_tests={alias_updated}'
)
