#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'timeline' / 'timeline-builder-controller.js'
SOURCE_TEST = ROOT / 'tests' / 'source-class-contract.test.js'
BUILDER_TEST = ROOT / 'tests' / 'build-timeline-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

EXPECTED_BYTES = 289
EXPECTED_LINES = 8
EXPECTED_SHA256 = '218601658b8d5f0826ff053c155579ae404ffec1cb8612a9192fd9be504c5df9'
BUILD_TIMELINE_BYTES = 1681
BUILD_TIMELINE_SHA256 = '5c152a66eee7d3a5294f868340725275a705d1432a3351b90733a29fa535c85a'


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
source = function_source(kernel, 'getSourceClass')
identity = (
    len(source.encode('utf-8')),
    source.count('\n') + 1,
    hashlib.sha256(source.encode('utf-8')).hexdigest(),
)
if identity != (EXPECTED_BYTES, EXPECTED_LINES, EXPECTED_SHA256):
    raise SystemExit(f'identidade de getSourceClass divergiu: {identity}')

# Confirma que o único consumidor atual é o callback do timeline builder.
consumer_token = '    getSourceClass: (...args) => getSourceClass(...args),\n'
if html.count(consumer_token) != 1:
    raise SystemExit('callback getSourceClass do timeline builder não é único')
if len(re.findall(r'(?<![\w$.])getSourceClass\s*\(', kernel)) != 2:
    raise SystemExit('getSourceClass deve ter exatamente declaração + 1 consumo no IIFE')

module = MODULE.read_text(encoding='utf-8')
build_source = function_source(module, 'buildTimeline')
if len(build_source.encode('utf-8')) != BUILD_TIMELINE_BYTES or hashlib.sha256(build_source.encode('utf-8')).hexdigest() != BUILD_TIMELINE_SHA256:
    raise SystemExit('buildTimeline divergiu do contrato antes do corte')

# Move literalmente getSourceClass para o escopo do módulo.
module = replace_once(
    module,
    "  'use strict';\n\n  const create = (options = {}) => {",
    "  'use strict';\n\n" + source + "\n\n  const create = (options = {}) => {",
    'inserção getSourceClass no módulo',
)
module = replace_once(module, '    const getSourceClass = options.getSourceClass;\n', '', 'remoção opção getSourceClass')
module = replace_once(
    module,
    "    if (typeof getSourceClass !== 'function') throw new Error('FlightFlowTimelineBuilderController requer getSourceClass().');\n",
    '',
    'remoção validação getSourceClass',
)
MODULE.write_text(module, encoding='utf-8')

# Remove a função e o callback do IIFE.
html = replace_once(html, source + '\n\n', '', 'remoção getSourceClass inline')
html = replace_once(html, consumer_token, '', 'remoção callback getSourceClass')
post_kernel = kernel_source(html)
if 'function getSourceClass(' in post_kernel:
    raise SystemExit('getSourceClass ainda está inline após materialização')
if 'getSourceClass: (...args) => getSourceClass(...args),' in post_kernel:
    raise SystemExit('callback getSourceClass ainda está no wiring')
HTML.write_text(html, encoding='utf-8')

# Confirma preservação literal após a mudança.
post_module = MODULE.read_text(encoding='utf-8')
source_in_module = function_source(post_module, 'getSourceClass')
if source_in_module != source:
    raise SystemExit('getSourceClass não foi preservada byte a byte no módulo')
post_build = function_source(post_module, 'buildTimeline')
if post_build != build_source:
    raise SystemExit('buildTimeline foi alterada durante o corte')
module_bytes = len(post_module.encode('utf-8'))
module_sha = hashlib.sha256(post_module.encode('utf-8')).hexdigest()

source_test = f'''\'use strict\';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'timeline-builder-controller.js');
const EXPECTED_BYTES = {EXPECTED_BYTES};
const EXPECTED_LINES = {EXPECTED_LINES};
const EXPECTED_SHA256 = '{EXPECTED_SHA256}';

function functionSource(container, name) {{
  const marker = `  function ${{name}}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${{name}} deve existir`);
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

function kernelSource() {{
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({{';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0);
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  return html.slice(bodyStart, close);
}}

test('getSourceClass foi movida preservando exatamente a identidade congelada', () => {{
  const module = fs.readFileSync(MODULE, 'utf8');
  const source = functionSource(module, 'getSourceClass');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\\r?\\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
}});

test('getSourceClass permanece pura dentro do timeline builder', () => {{
  const module = fs.readFileSync(MODULE, 'utf8');
  const source = functionSource(module, 'getSourceClass');
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {{
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${{forbidden}}`);
  }}
}});

test('getSourceClass deixa de ser dependência do IIFE e permanece interna ao módulo', () => {{
  const kernel = kernelSource();
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.equal(kernel.includes('function getSourceClass('), false);
  assert.equal(kernel.includes('getSourceClass: (...args) => getSourceClass(...args),'), false);
  assert.ok(module.includes('function getSourceClass('));
  assert.equal(module.includes('const getSourceClass = options.getSourceClass;'), false);
  assert.equal(module.includes('requer getSourceClass()'), false);
  const Controller = require(MODULE);
  assert.deepEqual(Object.keys(Controller), ['create']);
}});
'''
SOURCE_TEST.write_text(source_test, encoding='utf-8')

# Atualiza o contrato estrutural do timeline builder sem relaxar o hash de buildTimeline.
builder_test = BUILDER_TEST.read_text(encoding='utf-8')
builder_test = re.sub(r'const MODULE_BYTES = \d+;', f'const MODULE_BYTES = {module_bytes};', builder_test, count=1)
builder_test = re.sub(r"const MODULE_SHA256 = '[0-9a-f]+';", f"const MODULE_SHA256 = '{module_sha}';", builder_test, count=1)
builder_test = replace_once(
    builder_test,
    '  const base = { state: {}, els: {}, escapeHtml: noop, getSourceClass: noop, goTo: noop, stopPlayback: noop };',
    '  const base = { state: {}, els: {}, escapeHtml: noop, goTo: noop, stopPlayback: noop };',
    'base do timeline builder',
)
builder_test = replace_once(
    builder_test,
    "  assert.throws(() => Controller.create({ ...base, getSourceClass: null }), /requer getSourceClass/);\n",
    '',
    'assert getSourceClass externo',
)
builder_test = replace_once(
    builder_test,
    "    'getSourceClass: (...args) => getSourceClass(...args),',\n",
    '',
    'token wiring getSourceClass',
)
BUILDER_TEST.write_text(builder_test, encoding='utf-8')

# Atualiza identidade/inventário do IIFE principal.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(
    kernel_test,
    "const EXTRACTED_TIMELINE_BUILDER = ['buildTimeline'];",
    "const EXTRACTED_TIMELINE_BUILDER = ['buildTimeline'];\nconst EXTRACTED_SOURCE_CLASS = ['getSourceClass'];",
    'lista extraída source class',
)
kernel_test = replace_once(
    kernel_test,
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e seis cortes de timeline', () => {",
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e sete cortes de timeline', () => {",
    'título inventário',
)
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 347);', '  assert.equal(names.length, 346);', 'contagem funções')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 347);', '  assert.equal(counts.size, 346);', 'contagem nomes')
kernel_test = replace_once(kernel_test, "  assert.equal(counts.get('getSourceClass'), 1);\n", '', 'assert getSourceClass inline')
kernel_test = replace_once(
    kernel_test,
    '    ...EXTRACTED_TIMELINE_BUILDER,\n  ]) {',
    '    ...EXTRACTED_TIMELINE_BUILDER,\n    ...EXTRACTED_SOURCE_CLASS,\n  ]) {',
    'spread source class',
)
post_source = kernel_source(html).strip('\n') + '\n'
expected_bytes = len(post_source.encode('utf-8'))
expected_sha = hashlib.sha256(post_source.encode('utf-8')).hexdigest()
expected_lines = post_source.count('\n')
kernel_test = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', kernel_test, count=1)
kernel_test = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", kernel_test, count=1)
kernel_test = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', kernel_test, count=1)
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(
    f'materializado: getSourceClass -> timeline-builder-controller; '
    f'função {EXPECTED_BYTES} bytes / {EXPECTED_SHA256}; '
    f'módulo {module_bytes} bytes / {module_sha}; '
    f'núcleo {expected_bytes} bytes / {expected_lines} linhas / {expected_sha}'
)
