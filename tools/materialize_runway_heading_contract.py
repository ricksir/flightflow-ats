#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
TEST = ROOT / 'tests' / 'runway-heading-contract.test.js'
GEO_MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
NAME = 'runwayHeading'
CONTROL_WORDS = {'if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super'}
BUILTIN_CALLS = {'Number','String','Array','Object','parseFloat','parseInt','Boolean','isFinite'}


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
            if depth == 0: return container[start:i + 1]
        i += 1
    raise SystemExit(f'fim de {name} não encontrado')


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
source = function_source(kernel, NAME)
source_bytes = len(source.encode('utf-8'))
source_lines = source.count('\n') + 1
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()

for forbidden in ['state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'fetch(']:
    if forbidden in source:
        raise SystemExit(f'{NAME} possui acoplamento proibido: {forbidden}')

raw_calls = [m.group(1) for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', source)]
calls = sorted(set(x for x in raw_calls if x != NAME and x not in CONTROL_WORDS))
external_calls = sorted(set(calls) - BUILTIN_CALLS)
if external_calls:
    raise SystemExit(f'{NAME} puxa dependências externas: {external_calls}; calls={calls}')

consumers = len(re.findall(r'(?<![\w$.])runwayHeading\s*\(', kernel)) - 1
if consumers < 1:
    raise SystemExit(f'{NAME} não possui consumidores reais: {consumers}')

geo = GEO_MODULE.read_text(encoding='utf-8')
if NAME in geo:
    raise SystemExit(f'{NAME} já existe no coordinate-utils')

calls_json = '[' + ', '.join(repr(x) for x in calls) + ']'
test = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = {source_bytes};
const EXPECTED_LINES = {source_lines};
const EXPECTED_SHA256 = '{source_sha}';
const EXPECTED_CONSUMERS = {consumers};
const EXPECTED_CALLS = Object.freeze({calls_json});
const CONTROL_WORDS = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super']);

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
  assert.ok(start >= 0, `${{name}} deve permanecer inline antes da extração`);
  const brace = container.indexOf('{{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < container.length; i += 1) {{
    const c = container[i];
    if (quote) {{
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }}
    if (c === "'" || c === '"' || c === '`') {{ quote = c; continue; }}
    if (c === '{{') depth += 1;
    else if (c === '}}') {{ depth -= 1; if (depth === 0) return container.slice(start, i + 1); }}
  }}
  throw new Error(`fim de ${{name}} não encontrado`);
}}

function bareCalls(source, ownName) {{
  return [...new Set([...source.matchAll(/(?<![\\w$.])([A-Za-z_$][\\w$]*)\\s*\\(/g)]
    .map(m => m[1])
    .filter(name => name !== ownName && !CONTROL_WORDS.has(name)))].sort();
}}

test('runwayHeading mantém identidade exata antes da extração', () => {{
  const source = functionSource(kernelSource(), 'runwayHeading');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
}});

test('runwayHeading permanece função geográfica pura e sem helper externo', () => {{
  const source = functionSource(kernelSource(), 'runwayHeading');
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'fetch(']) {{
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${{forbidden}}`);
  }}
  assert.deepEqual(bareCalls(source, 'runwayHeading'), [...EXPECTED_CALLS]);
}});

test('runwayHeading mantém consumidores reais e ainda não está no coordinate-utils', () => {{
  const kernel = kernelSource();
  const consumers = [...kernel.matchAll(/(?<![\\w$.])runwayHeading\\s*\\(/g)].length - 1;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  assert.ok(consumers >= 1);
  assert.equal(fs.readFileSync(MODULE, 'utf8').includes('runwayHeading'), false);
}});
'''
TEST.write_text(test, encoding='utf-8')
print(f'{NAME}: {source_bytes} bytes / {source_lines} linhas / {source_sha} / calls={calls} / consumidores={consumers}')
