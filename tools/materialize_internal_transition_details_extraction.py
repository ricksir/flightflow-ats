#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'timeline' / 'communication-context-utils.js'
TARGET_TEST = ROOT / 'tests' / 'internal-transition-details-contract.test.js'
MODULE_TEST = ROOT / 'tests' / 'communication-context-utils-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

TARGET = 'internalTransitionDetails'
TARGET_BYTES = 628
TARGET_LINES = 10
TARGET_SHA = 'f844273330a6cec8df2f8137c209159434d7e76a1076b39e256f79cd5f4fc71a'
TARGET_CONSUMERS = 1
KERNEL_BYTES = 1139807
KERNEL_LINES = 5399
KERNEL_SHA = 'b25c4210c738ecff9de9420d35bc64b505bff8efca572b38ce75442bd23637ad'
KERNEL_FUNCTIONS = 339

MODULE_TAG = '<script id="flightflow-communication-context-utils" src="src/timeline/communication-context-utils.js"></script>'
PLAYBACK_TAG = '<script id="flightflow-playback-controller" src="src/timeline/playback-controller.js"></script>'
ALIAS_BLOCK = "  const CommunicationContextUtils = window.FlightFlowCommunicationContextUtils;\n  if (!CommunicationContextUtils) throw new Error('FlightFlowCommunicationContextUtils não foi carregado.');\n  const { internalTransitionDetails } = CommunicationContextUtils;\n"
AIRPORT_ALIAS = '  const { airportGroundQuery } = AirportGroundQueryModule;\n'

FORBIDDEN = [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(', 'setInterval(',
    'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser', 'realMapState',
    'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
]


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def raw_kernel(html):
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.index(anchor)
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.index('>', open_pos) + 1
    close = html.index('</script>', pos)
    if open_pos < 0 or close <= body_start:
        raise SystemExit('IIFE principal não delimitado')
    return html[body_start:close]


def contract_kernel(html):
    return raw_kernel(html).strip('\n') + '\n'


def extract_function(source, name):
    marker = f'  function {name}('
    start = source.find(marker)
    if start < 0:
        raise SystemExit(f'{name}: declaração não encontrada')
    paren = source.find('(', start)
    i = paren
    depth = 0
    quote = None
    escaped = False
    while i < len(source):
        c = source[i]
        if quote:
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                quote = None
            i += 1
            continue
        if c in "'\"`":
            quote = c
            i += 1
            continue
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                break
        i += 1
    brace = i + 1
    while brace < len(source) and source[brace].isspace():
        brace += 1
    if brace >= len(source) or source[brace] != '{':
        raise SystemExit(f'{name}: chave inicial não encontrada')
    depth = 0
    quote = None
    escaped = False
    for i in range(brace, len(source)):
        c = source[i]
        if quote:
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                quote = None
            continue
        if c in "'\"`":
            quote = c
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return source[start:i + 1]
    raise SystemExit(f'{name}: fim não encontrado')


html = HTML.read_text(encoding='utf-8')
pre_kernel = contract_kernel(html)
if len(pre_kernel.encode('utf-8')) != KERNEL_BYTES or pre_kernel.count('\n') != KERNEL_LINES or sha(pre_kernel) != KERNEL_SHA:
    raise SystemExit('baseline do kernel divergiu do contrato verde')
if MODULE.exists() or MODULE_TAG in html or 'FlightFlowCommunicationContextUtils' in html:
    raise SystemExit('módulo communication-context-utils já existe ou já está ligado')

target = extract_function(raw_kernel(html), TARGET)
if len(target.encode('utf-8')) != TARGET_BYTES:
    raise SystemExit(f'{TARGET}: bytes divergiram')
if target.count('\n') + 1 != TARGET_LINES:
    raise SystemExit(f'{TARGET}: linhas divergiram')
if sha(target) != TARGET_SHA:
    raise SystemExit(f'{TARGET}: SHA divergiu')
for token in FORBIDDEN:
    if token in target:
        raise SystemExit(f'{TARGET}: acoplamento inesperado {token}')
pre_calls = len(re.findall(r'(?<![\w$.])internalTransitionDetails\s*\(', raw_kernel(html))) - 1
if pre_calls != TARGET_CONSUMERS:
    raise SystemExit(f'{TARGET}: esperado {TARGET_CONSUMERS} consumidor, encontrado {pre_calls}')
for protected in ['goTo', 'renderCurrent', 'groundMidpoint']:
    if f'function {protected}(' not in raw_kernel(html):
        raise SystemExit(f'{protected}: proteção estrutural ausente antes do corte')

module_source = "(function () {\n  'use strict';\n\n" + target + "\n\n  window.FlightFlowCommunicationContextUtils = Object.freeze({\n    internalTransitionDetails,\n  });\n})();\n"
MODULE.parent.mkdir(parents=True, exist_ok=True)
MODULE.write_text(module_source, encoding='utf-8')
module_bytes = len(module_source.encode('utf-8'))
module_sha = sha(module_source)

html = replace_once(html, PLAYBACK_TAG, MODULE_TAG + '\n' + PLAYBACK_TAG, 'tag communication-context-utils')
html = replace_once(html, AIRPORT_ALIAS, AIRPORT_ALIAS + '\n' + ALIAS_BLOCK, 'alias communication-context-utils')
if target + '\n\n' in html:
    html = replace_once(html, target + '\n\n', '', 'declaração inline internalTransitionDetails')
else:
    html = replace_once(html, target, '', 'declaração inline internalTransitionDetails')
HTML.write_text(html, encoding='utf-8')

post_raw = raw_kernel(html)
post_kernel = contract_kernel(html)
if f'function {TARGET}(' in post_raw:
    raise SystemExit(f'{TARGET} permaneceu inline')
post_calls = len(re.findall(r'(?<![\w$.])internalTransitionDetails\s*\(', post_raw))
if post_calls != TARGET_CONSUMERS:
    raise SystemExit(f'consumidor de {TARGET} mudou após o corte: {post_calls}')
if post_raw.count(ALIAS_BLOCK.strip()) != 1:
    raise SystemExit('alias communication-context-utils não ficou único')
for protected in ['goTo', 'renderCurrent', 'groundMidpoint']:
    if f'function {protected}(' not in post_raw:
        raise SystemExit(f'{protected}: proteção estrutural violada')

# Migra o contrato do alvo para o módulo externo sem relaxar identidade ou semântica.
target_test = TARGET_TEST.read_text(encoding='utf-8')
target_test = replace_once(target_test, "const HTML = path.join(ROOT, 'index.html');\n", "const HTML = path.join(ROOT, 'index.html');\nconst MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');\n", 'MODULE no contrato do alvo')
target_test = target_test.replace('`${name} deve permanecer inline antes da extração`', '`${name} deve existir no módulo após a extração`')
target_test = target_test.replace("functionSource(kernelSource(), 'internalTransitionDetails')", "functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails')")
old_consumer = "  const consumers = [...kernel.matchAll(/(?<![\\w$.])internalTransitionDetails\\s*\\(/g)].length - 1;\n  assert.equal(consumers, EXPECTED_CONSUMERS);"
new_consumer = "  assert.equal(kernel.includes('function internalTransitionDetails('), false, 'internalTransitionDetails não deve permanecer inline');\n  const consumers = [...kernel.matchAll(/(?<![\\w$.])internalTransitionDetails\\s*\\(/g)].length;\n  assert.equal(consumers, EXPECTED_CONSUMERS);\n  assert.ok(kernel.includes('const { internalTransitionDetails } = CommunicationContextUtils;'));"
target_test = replace_once(target_test, old_consumer, new_consumer, 'consumidor pós-corte')
TARGET_TEST.write_text(target_test, encoding='utf-8')

# Contrato estrutural do novo módulo.
module_test = f"""'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const MODULE_BYTES = {module_bytes};
const MODULE_SHA256 = '{module_sha}';
const TARGET_BYTES = {TARGET_BYTES};
const TARGET_SHA256 = '{TARGET_SHA}';

function functionSource(container, name) {{
  const marker = `  function ${{name}}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${{name}} deve existir no módulo`);
  const paren = container.indexOf('(', start);
  let i = paren, depth = 0, quote = null, escaped = false;
  while (i < container.length) {{
    const c = container[i];
    if (quote) {{
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1; continue;
    }}
    if (c === "'" || c === '"' || c === '`') {{ quote = c; i += 1; continue; }}
    if (c === '(') depth += 1;
    else if (c === ')') {{ depth -= 1; if (depth === 0) break; }}
    i += 1;
  }}
  let brace = i + 1;
  while (/\\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{{');
  depth = 0; quote = null; escaped = false;
  for (i = brace; i < container.length; i += 1) {{
    const c = container[i];
    if (quote) {{
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }}
    if (c === "'" || c === '"' || c === '`') {{ quote = c; continue; }}
    if (c === '{{') depth += 1;
    else if (c === '}}') {{
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }}
  }}
  throw new Error(`fim de ${{name}} não encontrado`);
}}

test('módulo communication-context-utils mantém identidade estrutural congelada', () => {{
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.match(source, /^\\(function \\(\\) \\{{\\n  'use strict';/);
  assert.match(source, /\\}}\\)\\(\\);\\n$/);
}});

test('internalTransitionDetails preserva exatamente os bytes congelados dentro do módulo', () => {{
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails');
  assert.equal(Buffer.byteLength(source, 'utf8'), TARGET_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), TARGET_SHA256);
}});

test('API pública é congelada e expõe somente internalTransitionDetails', () => {{
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = {{ window: {{}} }};
  vm.runInNewContext(source, context);
  const api = context.window.FlightFlowCommunicationContextUtils;
  assert.ok(api);
  assert.deepEqual(Object.keys(api), ['internalTransitionDetails']);
  assert.equal(Object.isFrozen(api), true);
  assert.equal(typeof api.internalTransitionDetails, 'function');
}});

test('index carrega módulo antes do IIFE e núcleo usa alias explícito', () => {{
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-communication-context-utils" src="src/timeline/communication-context-utils.js"></script>';
  assert.equal(html.split(tag).length - 1, 1);
  const iife = html.indexOf('<script>\\n\\n(function () {{');
  assert.ok(iife > 0 && html.indexOf(tag) < iife);
  assert.ok(html.includes('const CommunicationContextUtils = window.FlightFlowCommunicationContextUtils;'));
  assert.ok(html.includes("if (!CommunicationContextUtils) throw new Error('FlightFlowCommunicationContextUtils não foi carregado.');"));
  assert.ok(html.includes('const {{ internalTransitionDetails }} = CommunicationContextUtils;'));
}});

test('módulo permanece desacoplado de estado, DOM, rede, storage e mapa', () => {{
  const target = functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails');
  for (const token of ['state.', 'els.', 'document.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'google.', 'L.', 'Parser', 'realMapState']) {{
    assert.equal(target.includes(token), false, `acoplamento inesperado: ${{token}}`);
  }}
}});
"""
MODULE_TEST.write_text(module_test, encoding='utf-8')

# Atualiza baseline e inventário do kernel.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(kernel_test, f'const EXPECTED_BYTES = {KERNEL_BYTES};', f'const EXPECTED_BYTES = {len(post_kernel.encode("utf-8"))};', 'kernel bytes')
kernel_test = replace_once(kernel_test, f"const EXPECTED_SHA256 = '{KERNEL_SHA}';", f"const EXPECTED_SHA256 = '{sha(post_kernel)}';", 'kernel sha')
kernel_test = replace_once(kernel_test, f'const EXPECTED_LINES = {KERNEL_LINES};', f'const EXPECTED_LINES = {post_kernel.count(chr(10))};', 'kernel lines')
kernel_test = replace_once(kernel_test, "const EXTRACTED_AIRPORT_GROUND_QUERY = ['airportGroundQuery'];\n", "const EXTRACTED_AIRPORT_GROUND_QUERY = ['airportGroundQuery'];\nconst EXTRACTED_COMMUNICATION_CONTEXT_UTILS = ['internalTransitionDetails'];\n", 'lista communication-context')
airport_tokens = "    'const { airportGroundQuery } = AirportGroundQueryModule;',\n"
communication_tokens = airport_tokens + "    'const CommunicationContextUtils = window.FlightFlowCommunicationContextUtils;',\n    \"if (!CommunicationContextUtils) throw new Error('FlightFlowCommunicationContextUtils não foi carregado.');\",\n    'const { internalTransitionDetails } = CommunicationContextUtils;',\n"
kernel_test = replace_once(kernel_test, airport_tokens, communication_tokens, 'tokens communication-context')
kernel_test = replace_once(kernel_test, "test('inventário interno do núcleo mantém nomes únicos após oito extrações puras e sete cortes de timeline'", "test('inventário interno do núcleo mantém nomes únicos após nove extrações puras e sete cortes de timeline'", 'título inventário')
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 339);', '  assert.equal(names.length, 338);', 'contagem nomes kernel')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 339);', '  assert.equal(counts.size, 338);', 'contagem nomes únicos kernel')
kernel_test = replace_once(kernel_test, '    ...EXTRACTED_AIRPORT_GROUND_QUERY,\n', '    ...EXTRACTED_AIRPORT_GROUND_QUERY,\n    ...EXTRACTED_COMMUNICATION_CONTEXT_UTILS,\n', 'spread communication-context')
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(f'{TARGET}: {TARGET_BYTES} bytes / {TARGET_LINES} linhas / {TARGET_SHA} / consumidores={TARGET_CONSUMERS}')
print(f'communication-context-utils: {module_bytes} bytes / sha={module_sha} / funções=1')
print(f'kernel: {len(post_kernel.encode("utf-8"))} bytes / linhas={post_kernel.count(chr(10))} / sha={sha(post_kernel)} / funções=338')
print('arquivos permanentes previstos: index.html, src/timeline/communication-context-utils.js, tests/communication-context-utils-contract.test.js, tests/internal-transition-details-contract.test.js, tests/main-kernel-contract.test.js')
