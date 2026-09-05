#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
TEST = ROOT / 'tests' / 'runway-geometry-contract.test.js'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
NAMES = ('runwayTokens', 'runwayHeading')
CONTROL_WORDS = {'if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super'}


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.find(anchor)
    if pos < 0: raise SystemExit('ponte FIR não encontrada')
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.find('>', open_pos) + 1
    close_pos = html.find('</script>', pos)
    return html[body_start:close_pos]


def function_source(container: str, name: str) -> str:
    marker = f'  function {name}('
    start = container.find(marker)
    if start < 0: raise SystemExit(f'{name} não encontrada')
    brace = container.find('{', start)
    depth = 0
    quote = None
    escaped = False
    for i in range(brace, len(container)):
        c = container[i]
        if quote:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: quote = None
            continue
        if c in "'\"`": quote = c; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return container[start:i + 1]
    raise SystemExit(f'fim de {name} não encontrado')


kernel = kernel_source(HTML.read_text(encoding='utf-8'))
module = MODULE.read_text(encoding='utf-8')
meta = {}
for name in NAMES:
    source = function_source(kernel, name)
    forbidden = [token for token in ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','goTo(','renderCurrent(','stopPlayback(','fetch('] if token in source]
    if forbidden: raise SystemExit(f'{name} possui acoplamento proibido: {forbidden}')
    raw_calls = [m.group(1) for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', source)]
    calls = sorted(set(x for x in raw_calls if x != name and x not in CONTROL_WORDS))
    consumers = len(re.findall(rf'(?<![\w$.]){name}\s*\(', kernel)) - 1
    if consumers < 1: raise SystemExit(f'{name} não possui consumidores reais')
    if name in module: raise SystemExit(f'{name} já existe no coordinate-utils')
    meta[name] = {
        'bytes': len(source.encode('utf-8')),
        'lines': source.count('\n') + 1,
        'sha': hashlib.sha256(source.encode('utf-8')).hexdigest(),
        'calls': calls,
        'consumers': consumers,
    }

if meta['runwayTokens']['calls'] != ['String']:
    raise SystemExit(f"runwayTokens mudou dependências: {meta['runwayTokens']['calls']}")
if meta['runwayHeading']['calls'] != ['Number', 'runwayTokens']:
    raise SystemExit(f"runwayHeading mudou dependências: {meta['runwayHeading']['calls']}")

js_meta = '\n'.join(
    f"const {name.upper()} = Object.freeze({{ bytes: {m['bytes']}, lines: {m['lines']}, sha: '{m['sha']}', consumers: {m['consumers']}, calls: {repr(m['calls']).replace(chr(39), chr(34))} }});"
    for name, m in meta.items()
)

test = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
{js_meta}
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

for (const [name, expected] of [['runwayTokens', RUNWAYTOKENS], ['runwayHeading', RUNWAYHEADING]]) {{
  test(`${{name}} mantém identidade exata antes da extração`, () => {{
    const source = functionSource(kernelSource(), name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes);
    assert.equal(source.split(/\\r?\\n/).length, expected.lines);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), expected.sha);
  }});

  test(`${{name}} mantém dependências puras congeladas`, () => {{
    const source = functionSource(kernelSource(), name);
    for (const forbidden of ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','goTo(','renderCurrent(','stopPlayback(','fetch(']) {{
      assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${{forbidden}}`);
    }}
    assert.deepEqual(bareCalls(source, name), [...expected.calls]);
  }});

  test(`${{name}} mantém consumidores reais conhecidos`, () => {{
    const kernel = kernelSource();
    const consumers = [...kernel.matchAll(new RegExp(`(?<![\\\\w$.])${{name}}\\\\s*\\\\(`, 'g'))].length - 1;
    assert.equal(consumers, expected.consumers);
    assert.ok(consumers >= 1);
  }});
}}

test('cluster runway geometry ainda não está no coordinate-utils', () => {{
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.equal(module.includes('runwayTokens'), false);
  assert.equal(module.includes('runwayHeading'), false);
}});
'''
TEST.write_text(test, encoding='utf-8')
for name, m in meta.items():
    print(f"{name}: {m['bytes']} bytes / {m['lines']} linhas / {m['sha']} / calls={m['calls']} / consumidores={m['consumers']}")
