#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
REPORT = ROOT / 'docs' / 'refactor' / 'build-timeline-dependency-map.md'
TEST = ROOT / 'tests' / 'build-timeline-contract.test.js'

html = HTML.read_text(encoding='utf-8')
anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
anchor_index = html.find(anchor)
if anchor_index < 0:
    raise SystemExit('ponte FIR não encontrada')
script_open = html.rfind('<script', 0, anchor_index)
body_start = html.find('>', script_open) + 1
script_close = html.find('</script>', anchor_index)
kernel = html[body_start:script_close]

marker = '  function buildTimeline('
start = kernel.find(marker)
if start < 0:
    raise SystemExit('buildTimeline não encontrada no IIFE principal')
next_function = kernel.find('\n  function ', start + len(marker))
if next_function < 0:
    raise SystemExit('não foi possível delimitar o final de buildTimeline')
source = kernel[start:next_function].rstrip()

if source.count('function buildTimeline(') != 1:
    raise SystemExit('delimitação de buildTimeline não é única')

source_bytes = len(source.encode('utf-8'))
source_lines = source.count('\n') + 1
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()


def uniq(pattern, text=source, flags=0, group=1):
    return sorted(set(m.group(group) for m in re.finditer(pattern, text, flags)))

state_refs = uniq(r'\bstate\.([A-Za-z_$][\w$]*)')
els_refs = uniq(r'\bels\.([A-Za-z_$][\w$]*)')
document_calls = uniq(r'\bdocument\.([A-Za-z_$][\w$]*)\s*\(')
window_refs = uniq(r'\bwindow\.([A-Za-z_$][\w$]*)')

bare_calls = []
for match in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', source):
    name = match.group(1)
    if name in {
        'if', 'for', 'while', 'switch', 'catch', 'function', 'with', 'typeof',
        'return', 'new', 'delete', 'void', 'await', 'yield', 'class', 'super'
    }:
        continue
    bare_calls.append(name)
bare_calls = sorted(set(bare_calls) - {'buildTimeline'})

mutation_tokens = [
    token for token in [
        '.innerHTML =', '.textContent =', '.value =', '.disabled =', '.checked =',
        '.className =', '.classList.', '.dataset.', '.style.', '.appendChild(',
        '.append(', '.replaceChildren(', '.addEventListener(', '.removeEventListener(',
        '.scrollIntoView(', '.setAttribute(', '.removeAttribute(',
    ] if token in source
]

risk_tokens = [
    token for token in [
        'goTo(', 'renderCurrent(', 'enableControls(', 'updateTimelineSelection(',
        'realMapState', 'document.', 'window.', 'innerHTML', 'addEventListener(',
        'setTimeout(', 'requestAnimationFrame(', 'localStorage', 'indexedDB',
    ] if token in source
]

facts = {
    'bytes': source_bytes,
    'lines': source_lines,
    'sha256': source_sha,
    'state_refs': state_refs,
    'els_refs': els_refs,
    'document_calls': document_calls,
    'window_refs': window_refs,
    'bare_calls': bare_calls,
    'mutation_tokens': mutation_tokens,
    'risk_tokens': risk_tokens,
}

REPORT.parent.mkdir(parents=True, exist_ok=True)
report = f'''# buildTimeline — mapa de dependências congelado

> Gerado mecanicamente a partir do `index.html`. Este documento registra o estado atual antes de qualquer tentativa de extração de `buildTimeline`.

## Identidade estrutural

- Tamanho: **{source_bytes:,} bytes**
- Linhas: **{source_lines}**
- SHA-256: `{source_sha}`
- Localização: IIFE principal do `index.html`

## Dependências observadas

### Propriedades de `state`

{', '.join(f'`state.{x}`' for x in state_refs) if state_refs else '_Nenhuma._'}

### Elementos de `els`

{', '.join(f'`els.{x}`' for x in els_refs) if els_refs else '_Nenhum._'}

### Chamadas diretas em `document`

{', '.join(f'`document.{x}()`' for x in document_calls) if document_calls else '_Nenhuma._'}

### Referências em `window`

{', '.join(f'`window.{x}`' for x in window_refs) if window_refs else '_Nenhuma._'}

### Chamadas de função sem receptor explícito

{', '.join(f'`{x}()`' for x in bare_calls) if bare_calls else '_Nenhuma._'}

## Efeitos de UI/DOM detectados

{', '.join(f'`{x}`' for x in mutation_tokens) if mutation_tokens else '_Nenhum token de mutação conhecido._'}

## Sinais de risco para extração

{', '.join(f'`{x}`' for x in risk_tokens) if risk_tokens else '_Nenhum dos sinais monitorados foi encontrado._'}

## Decisão para o próximo corte

`buildTimeline` **não deve ser movida integralmente ainda**. O contrato abaixo congela a função e permite separar, em PRs menores, renderização de item, classificação/labels e ligação de eventos antes de deslocar a orquestração completa para um módulo.
'''
REPORT.write_text(report, encoding='utf-8')

js = f'''\'use strict\';

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
const EXPECTED_STATE_REFS = Object.freeze({json.dumps(state_refs, ensure_ascii=False)});
const EXPECTED_ELS_REFS = Object.freeze({json.dumps(els_refs, ensure_ascii=False)});
const EXPECTED_DOCUMENT_CALLS = Object.freeze({json.dumps(document_calls, ensure_ascii=False)});
const EXPECTED_WINDOW_REFS = Object.freeze({json.dumps(window_refs, ensure_ascii=False)});
const EXPECTED_BARE_CALLS = Object.freeze({json.dumps(bare_calls, ensure_ascii=False)});
const EXPECTED_MUTATION_TOKENS = Object.freeze({json.dumps(mutation_tokens, ensure_ascii=False)});
const EXPECTED_RISK_TOKENS = Object.freeze({json.dumps(risk_tokens, ensure_ascii=False)});

function kernelSource() {{
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({{';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar no IIFE principal');
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart);
  return html.slice(bodyStart, close);
}}

function buildTimelineSource() {{
  const kernel = kernelSource();
  const marker = '  function buildTimeline(';
  const start = kernel.indexOf(marker);
  assert.ok(start >= 0, 'buildTimeline deve permanecer inline neste contrato');
  const end = kernel.indexOf('\\n  function ', start + marker.length);
  assert.ok(end > start, 'buildTimeline deve continuar delimitável por função de topo seguinte');
  return kernel.slice(start, end).replace(/\\s+$/, '');
}}

function uniqMatches(source, regex) {{
  return [...new Set([...source.matchAll(regex)].map(match => match[1]))].sort();
}}

function bareCalls(source) {{
  const ignored = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super','buildTimeline']);
  return [...new Set([...source.matchAll(/(?<![\\w$.])([A-Za-z_$][\\w$]*)\\s*\\(/g)].map(match => match[1]).filter(name => !ignored.has(name)))].sort();
}}

test('buildTimeline mantém identidade exata antes da refatoração', () => {{
  const source = buildTimelineSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
}});

test('buildTimeline mantém fronteira atual de state, els, document e window', () => {{
  const source = buildTimelineSource();
  assert.deepEqual(uniqMatches(source, /\\bstate\\.([A-Za-z_$][\\w$]*)/g), [...EXPECTED_STATE_REFS]);
  assert.deepEqual(uniqMatches(source, /\\bels\\.([A-Za-z_$][\\w$]*)/g), [...EXPECTED_ELS_REFS]);
  assert.deepEqual(uniqMatches(source, /\\bdocument\\.([A-Za-z_$][\\w$]*)\\s*\\(/g), [...EXPECTED_DOCUMENT_CALLS]);
  assert.deepEqual(uniqMatches(source, /\\bwindow\\.([A-Za-z_$][\\w$]*)/g), [...EXPECTED_WINDOW_REFS]);
}});

test('buildTimeline mantém conjunto atual de chamadas sem receptor explícito', () => {{
  assert.deepEqual(bareCalls(buildTimelineSource()), [...EXPECTED_BARE_CALLS]);
}});

test('buildTimeline mantém efeitos de UI e sinais de risco explicitamente congelados', () => {{
  const source = buildTimelineSource();
  const mutations = EXPECTED_MUTATION_TOKENS.filter(token => source.includes(token));
  const risks = EXPECTED_RISK_TOKENS.filter(token => source.includes(token));
  assert.deepEqual(mutations, [...EXPECTED_MUTATION_TOKENS]);
  assert.deepEqual(risks, [...EXPECTED_RISK_TOKENS]);
}});

test('buildTimeline continua separada das responsabilidades já extraídas', () => {{
  const source = buildTimelineSource();
  for (const forbidden of [
    'function enableControls(',
    'function updateTimelineSelection(',
    'function restartTransport(',
    'function previousTransport(',
    'function nextTransport(',
    'function scrubTransport(',
    'function startPlayback(',
    'function stopPlayback(',
  ]) assert.equal(source.includes(forbidden), false, `responsabilidade reintroduzida: ${{forbidden}}`);
}});
'''
TEST.write_text(js, encoding='utf-8')

print(json.dumps(facts, ensure_ascii=False, indent=2))
