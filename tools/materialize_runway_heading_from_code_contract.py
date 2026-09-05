#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
TEST = ROOT / 'tests' / 'runway-heading-from-code-contract.test.js'

NAME = 'runwayHeadingFromCode'
EXPECTED_BYTES = 360
EXPECTED_LINES = 7
EXPECTED_SHA256 = '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053'
EXPECTED_CONSUMERS = 1
FORBIDDEN = [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'google.', 'L.', 'Parser', 'realMapState',
]


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
            if depth == 0:
                return container[start:i + 1]
        i += 1
    raise SystemExit(f'fim de {name} não encontrado')


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
source = function_source(kernel, NAME)
identity = (
    len(source.encode('utf-8')),
    source.count('\n') + 1,
    hashlib.sha256(source.encode('utf-8')).hexdigest(),
)
if identity != (EXPECTED_BYTES, EXPECTED_LINES, EXPECTED_SHA256):
    raise SystemExit(f'identidade de {NAME} divergiu: {identity}')
for token in FORBIDDEN:
    if token in source:
        raise SystemExit(f'{NAME} ganhou acoplamento proibido: {token}')

all_names = set(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', kernel))
raw_calls = set(m.group(1) for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', source))
kernel_deps = sorted((raw_calls & all_names) - {NAME})
if kernel_deps:
    raise SystemExit(f'{NAME} depende de funções nomeadas do kernel: {kernel_deps}')
consumers = len(re.findall(r'(?<![\w$.])runwayHeadingFromCode\s*\(', kernel)) - 1
if consumers != EXPECTED_CONSUMERS:
    raise SystemExit(f'consumidores de {NAME} divergiram: {consumers}')
if NAME in MODULE.read_text(encoding='utf-8'):
    raise SystemExit(f'{NAME} já existe no coordinate-utils')

contract = r'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = __BYTES__;
const EXPECTED_LINES = __LINES__;
const EXPECTED_SHA256 = '__SHA__';
const EXPECTED_CONSUMERS = __CONSUMERS__;

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
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
  const brace = container.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return container.slice(start, i + 1); }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('runwayHeadingFromCode mantém identidade exata antes da extração', () => {
  const source = functionSource(kernelSource(), 'runwayHeadingFromCode');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('runwayHeadingFromCode permanece pura e sem dependência de infraestrutura', () => {
  const source = functionSource(kernelSource(), 'runwayHeadingFromCode');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'google.', 'L.', 'Parser', 'realMapState'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('runwayHeadingFromCode mantém exatamente um consumidor e ainda não está no módulo', () => {
  const kernel = kernelSource();
  const consumers = [...kernel.matchAll(/(?<![\w$.])runwayHeadingFromCode\s*\(/g)].length - 1;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  assert.equal(fs.readFileSync(MODULE, 'utf8').includes('runwayHeadingFromCode'), false);
});

test('runwayHeadingFromCode preserva semântica atual de cabeceiras e fallback', () => {
  const source = functionSource(kernelSource(), 'runwayHeadingFromCode');
  const fn = Function(`${source}; return runwayHeadingFromCode;`)();
  assert.equal(fn('09', 270), 90);
  assert.equal(fn('09L', 270), 90);
  assert.equal(fn('18C', 270), 180);
  assert.equal(fn('36R', 270), 0);
  assert.equal(fn('', 270), 270);
  assert.equal(fn('XX', 450), 90);
});
'''
contract = (contract
    .replace('__BYTES__', str(EXPECTED_BYTES))
    .replace('__LINES__', str(EXPECTED_LINES))
    .replace('__SHA__', EXPECTED_SHA256)
    .replace('__CONSUMERS__', str(EXPECTED_CONSUMERS)))
TEST.write_text(contract, encoding='utf-8')
print(f'{NAME}: {EXPECTED_BYTES} bytes / {EXPECTED_LINES} linhas / {EXPECTED_SHA256} / consumidores={consumers}')
