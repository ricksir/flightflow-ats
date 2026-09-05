#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
TEST = ROOT / 'tests' / 'ground-centroid-contract.test.js'
GEO_MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
CONTROL_WORDS = {'if', 'for', 'while', 'switch', 'catch', 'function', 'with', 'typeof', 'return', 'new', 'delete', 'void', 'await', 'yield', 'class', 'super'}
BUILTIN_CALLS = {'Number', 'String', 'Array', 'Object', 'parseFloat', 'parseInt', 'Boolean'}


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
source_bytes = len(source.encode('utf-8'))
source_lines = source.count('\n') + 1
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()

for forbidden in ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']:
    if forbidden in source:
        raise SystemExit(f'groundCentroid deixou de ser puro: {forbidden}')

raw_calls = [m.group(1) for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', source)]
calls = sorted(set(name for name in raw_calls if name != 'groundCentroid' and name not in CONTROL_WORDS))
external = sorted(set(calls) - BUILTIN_CALLS)
if external:
    raise SystemExit(f'groundCentroid puxa dependências externas: {external}')

consumers = len(re.findall(r'(?<![\w$.])groundCentroid\s*\(', kernel)) - 1
if consumers < 1:
    raise SystemExit('groundCentroid deve ter ao menos um consumidor antes da extração')

geo = GEO_MODULE.read_text(encoding='utf-8')
if 'groundCentroid' in geo:
    raise SystemExit('groundCentroid já existe no coordinate-utils antes do contrato')

js_calls = '[' + ', '.join(repr(name) for name in calls) + ']'
test = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const GEO_MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = {source_bytes};
const EXPECTED_LINES = {source_lines};
const EXPECTED_SHA256 = '{source_sha}';
const EXPECTED_CONSUMERS = {consumers};
const EXPECTED_CALLS = Object.freeze({js_calls});
const CONTROL_WORDS = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super']);

function kernelSource() {{
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({{';
  const index = html.indexOf(anchor);
  assert.ok(index >= 0, 'ponte FIR deve continuar no IIFE principal');
  const open = html.lastIndexOf('<script', index);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', index);
  return html.slice(bodyStart, close);
}}

function functionSource(container, name) {{
  const marker = `  function ${{name}}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${{name}} deve permanecer inline antes da extração`);
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

test('groundCentroid mantém identidade exata antes da extração', () => {{
  const source = functionSource(kernelSource(), 'groundCentroid');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
}});

test('groundCentroid permanece função geográfica pura e folha', () => {{
  const source = functionSource(kernelSource(), 'groundCentroid');
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {{
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${{forbidden}}`);
  }}
  assert.deepEqual(bareCalls(source, 'groundCentroid'), [...EXPECTED_CALLS]);
}});

test('groundCentroid mantém consumidores reais e ainda não está no coordinate-utils', () => {{
  const kernel = kernelSource();
  const consumers = [...kernel.matchAll(/(?<![\\w$.])groundCentroid\\s*\\(/g)].length - 1;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  assert.ok(consumers >= 1);
  const geo = fs.readFileSync(GEO_MODULE, 'utf8');
  assert.equal(geo.includes('groundCentroid'), false);
}});
'''
TEST.write_text(test, encoding='utf-8')
print(f'groundCentroid: {source_bytes} bytes / {source_lines} linha(s) / {source_sha} / calls={calls} / consumidores={consumers}')
