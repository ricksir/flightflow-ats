#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
TEST = ROOT / 'tests' / 'source-class-contract.test.js'

html = HTML.read_text(encoding='utf-8')
anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
anchor_index = html.find(anchor)
if anchor_index < 0:
    raise SystemExit('ponte FIR não encontrada')
script_open = html.rfind('<script', 0, anchor_index)
body_start = html.find('>', script_open) + 1
script_close = html.find('</script>', anchor_index)
kernel = html[body_start:script_close]

marker = '  function getSourceClass('
start = kernel.find(marker)
if start < 0:
    raise SystemExit('getSourceClass não encontrada no IIFE principal')
brace = kernel.find('{', start)
depth = 0
quote = None
escaped = False
line_comment = False
block_comment = False
end = None
i = brace
while i < len(kernel):
    c = kernel[i]
    n = kernel[i + 1] if i + 1 < len(kernel) else ''
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
    if c in "'\"`": quote = c; i += 1; continue
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
    i += 1
if end is None:
    raise SystemExit('fim de getSourceClass não encontrado')
source = kernel[start:end]

source_bytes = len(source.encode('utf-8'))
source_lines = source.count('\n') + 1
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()
if source_bytes != 289 or source_lines != 8:
    raise SystemExit(f'identidade inesperada de getSourceClass: {source_bytes} bytes / {source_lines} linhas')

state_refs = sorted(set(re.findall(r'\bstate\.([A-Za-z_$][\w$]*)', source)))
els_refs = sorted(set(re.findall(r'\bels\.([A-Za-z_$][\w$]*)', source)))
if state_refs or els_refs or 'document.' in source or 'window.' in source:
    raise SystemExit('getSourceClass deixou de ser função pura para este contrato')

call_sites = max(0, len(re.findall(r'(?<![\w$.])getSourceClass\s*\(', kernel)) - 1)
if call_sites != 1:
    raise SystemExit(f'getSourceClass deveria ter 1 consumidor no IIFE, encontrado {call_sites}')

TEST.write_text(f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = {source_bytes};
const EXPECTED_LINES = {source_lines};
const EXPECTED_SHA256 = '{source_sha}';

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

function sourceClassSource() {{
  const kernel = kernelSource();
  const marker = '  function getSourceClass(';
  const start = kernel.indexOf(marker);
  assert.ok(start >= 0, 'getSourceClass deve permanecer inline antes da extração');
  const brace = kernel.indexOf('{{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < kernel.length; index += 1) {{
    const char = kernel[index];
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
      if (depth === 0) return kernel.slice(start, index + 1);
    }}
  }}
  throw new Error('fim de getSourceClass não encontrado');
}}

test('getSourceClass mantém identidade exata antes da extração', () => {{
  const source = sourceClassSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
}});

test('getSourceClass permanece pura e sem dependência do estado ou DOM', () => {{
  const source = sourceClassSource();
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {{
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${{forbidden}}`);
  }}
}});

test('getSourceClass mantém somente um consumidor no IIFE, o wiring da timeline', () => {{
  const kernel = kernelSource();
  const calls = [...kernel.matchAll(/(?<![\\w$.])getSourceClass\\s*\\(/g)].length - 1;
  assert.equal(calls, 1);
  assert.ok(kernel.includes('getSourceClass: (...args) => getSourceClass(...args),'));
}});
''', encoding='utf-8')

print(f'getSourceClass congelada: {source_bytes} bytes / {source_lines} linhas / {source_sha}')
