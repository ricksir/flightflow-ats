#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
RUNWAY_TEST = ROOT / 'tests' / 'runway-geometry-contract.test.js'
COORD_TEST = ROOT / 'tests' / 'coordinate-utils-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

EXPECTED = {
    'runwayTokens': (104, 1, 'ea7c2d4dc62cfc56fa3bda6177625df9caff5213888cf700d5d5ad05d8eb7b2f', 4),
    'runwayHeading': (243, 5, '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715', 1),
}
EXPECTED_MODULE_BYTES = 1173
EXPECTED_MODULE_SHA = 'a1b8d67e5ad4361b0e9995fbc899c08dd1f69274fdf804caf9049ca570773051'
OLD_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid } = CoordinateUtils;'
NEW_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1, encontrado {count}')
    return text.replace(old, new, 1)


def kernel_source(html):
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.find(anchor)
    if pos < 0: raise SystemExit('ponte FIR não encontrada')
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.find('>', open_pos) + 1
    close_pos = html.find('</script>', pos)
    return html[body_start:close_pos]


def function_source(container, name):
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


html = HTML.read_text(encoding='utf-8')
kernel = kernel_source(html)
sources = {}
for name, (exp_bytes, exp_lines, exp_sha, exp_consumers) in EXPECTED.items():
    source = function_source(kernel, name)
    identity = (len(source.encode('utf-8')), source.count('\n') + 1, hashlib.sha256(source.encode('utf-8')).hexdigest())
    if identity != (exp_bytes, exp_lines, exp_sha):
        raise SystemExit(f'{name}: identidade divergiu {identity}')
    consumers = len(re.findall(rf'(?<![\w$.]){name}\s*\(', kernel)) - 1
    if consumers != exp_consumers:
        raise SystemExit(f'{name}: consumidores divergiram {consumers}')
    sources[name] = source

module = MODULE.read_text(encoding='utf-8')
module_identity = (len(module.encode('utf-8')), hashlib.sha256(module.encode('utf-8')).hexdigest())
if module_identity != (EXPECTED_MODULE_BYTES, EXPECTED_MODULE_SHA):
    raise SystemExit(f'coordinate-utils divergiu do baseline {module_identity}')
for name in EXPECTED:
    if name in module:
        raise SystemExit(f'{name} já existe no módulo')

# Move literalmente os dois blocos congelados para o módulo.
api_anchor = '  window.FlightFlowCoordinateUtils = Object.freeze({'
insert = sources['runwayTokens'] + '\n\n' + sources['runwayHeading'] + '\n\n' + api_anchor
module = replace_once(module, api_anchor, insert, 'inserção runway geometry')
module = replace_once(
    module,
    '    groundCentroid,\n  });',
    '    groundCentroid,\n    runwayTokens,\n    runwayHeading,\n  });',
    'exports runway geometry',
)
MODULE.write_text(module, encoding='utf-8')

# O IIFE passa a resolver ambos por aliases explícitos do módulo.
html = replace_once(html, OLD_ALIAS, NEW_ALIAS, 'alias coordinate-utils')
for name in ('runwayTokens', 'runwayHeading'):
    source = sources[name]
    removed = False
    for suffix in ('\n\n', '\n'):
        token = source + suffix
        if html.count(token) == 1:
            html = html.replace(token, '', 1)
            removed = True
            break
    if not removed:
        raise SystemExit(f'{name}: declaração inline não removível de modo inequívoco')
HTML.write_text(html, encoding='utf-8')

post_kernel = kernel_source(html)
for name, (_, _, _, exp_consumers) in EXPECTED.items():
    if f'function {name}(' in post_kernel:
        raise SystemExit(f'{name} continua inline')
    consumers = len(re.findall(rf'(?<![\w$.]){name}\s*\(', post_kernel))
    if consumers != exp_consumers:
        raise SystemExit(f'{name}: consumidores mudaram após extração: {consumers}')
if post_kernel.count(NEW_ALIAS) != 1:
    raise SystemExit('alias runway geometry ausente ou duplicado')
if 'function runwayHeadingFromCode(' not in post_kernel:
    raise SystemExit('runwayHeadingFromCode deve permanecer inline')
if 'function goTo(' not in post_kernel or 'function renderCurrent(' not in post_kernel:
    raise SystemExit('goTo/renderCurrent devem permanecer inline')

post_module = MODULE.read_text(encoding='utf-8')
for name, source in sources.items():
    if function_source(post_module, name) != source:
        raise SystemExit(f'{name}: bloco não foi preservado byte a byte no módulo')
module_bytes = len(post_module.encode('utf-8'))
module_sha = hashlib.sha256(post_module.encode('utf-8')).hexdigest()

# Migra o contrato específico do cluster para a nova localização.
runway_test = RUNWAY_TEST.read_text(encoding='utf-8')
runway_test = runway_test.replace("const HTML = path.join(ROOT, 'index.html');\nconst MODULE", "const HTML = path.join(ROOT, 'index.html');\nconst MODULE")
runway_test = replace_once(
    runway_test,
    "  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);",
    "  assert.ok(start >= 0, `${name} deve existir no módulo após a extração`);",
    'mensagem functionSource runway contract',
)
# Os dois primeiros testes passam a ler o módulo; consumidores continuam medidos no kernel.
runway_test = runway_test.replace("functionSource(kernelSource(), name)", "functionSource(fs.readFileSync(MODULE, 'utf8'), name)")
old_last = "test('cluster runway geometry ainda não está no coordinate-utils', () => {\n  const module = fs.readFileSync(MODULE, 'utf8');\n  assert.equal(module.includes('runwayTokens'), false);\n  assert.equal(module.includes('runwayHeading'), false);\n});"
new_last = "test('cluster runway geometry foi externalizado sem alterar consumidores', () => {\n  const kernel = kernelSource();\n  const module = fs.readFileSync(MODULE, 'utf8');\n  for (const [name, expected] of [['runwayTokens', RUNWAYTOKENS], ['runwayHeading', RUNWAYHEADING]]) {\n    assert.equal(kernel.includes(`function ${name}(`), false);\n    assert.ok(module.includes(`function ${name}(`));\n    assert.ok(module.includes(`    ${name},`));\n    const consumers = [...kernel.matchAll(new RegExp(`(?<![\\\\w$.])${name}\\\\s*\\\\(`, 'g'))].length;\n    assert.equal(consumers, expected.consumers);\n  }\n  assert.ok(kernel.includes('function runwayHeadingFromCode('));\n  assert.ok(kernel.includes('const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;'));\n});"
runway_test = replace_once(runway_test, old_last, new_last, 'teste final runway geometry')
RUNWAY_TEST.write_text(runway_test, encoding='utf-8')

# Amplia o contrato estrutural de coordinate-utils mantendo os cinco helpers prévios congelados.
coord = COORD_TEST.read_text(encoding='utf-8')
coord = re.sub(r'const MODULE_BYTES = \d+;', f'const MODULE_BYTES = {module_bytes};', coord, count=1)
coord = re.sub(r"const MODULE_SHA256 = '[0-9a-f]+';", f"const MODULE_SHA256 = '{module_sha}';", coord, count=1)
anchor = "  groundCentroid: {\n    bytes: 279,\n    sha256: '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559',\n  },\n"
addition = anchor + "  runwayTokens: {\n    bytes: 104,\n    sha256: 'ea7c2d4dc62cfc56fa3bda6177625df9caff5213888cf700d5d5ad05d8eb7b2f',\n  },\n  runwayHeading: {\n    bytes: 243,\n    sha256: '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715',\n  },\n"
coord = replace_once(coord, anchor, addition, 'EXPECTED runway geometry')
coord = replace_once(coord, "test('cinco utilitários geográficos preservam identidade byte a byte após a extração', () => {", "test('sete utilitários geográficos preservam identidade byte a byte após a extração', () => {", 'título coordinate-utils')
coord = replace_once(coord, OLD_ALIAS, NEW_ALIAS, 'alias coordinate contract')
COORD_TEST.write_text(coord, encoding='utf-8')

# Atualiza identidade e inventário do núcleo principal.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(
    kernel_test,
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid'\n];",
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid',\n  'runwayTokens', 'runwayHeading'\n];",
    'lista coordinate utils extraída',
)
kernel_test = replace_once(kernel_test, OLD_ALIAS, NEW_ALIAS, 'alias main kernel')
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 345);', '  assert.equal(names.length, 343);', 'contagem functions')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 345);', '  assert.equal(counts.size, 343);', 'contagem unique')
post_source = kernel_source(html).strip('\n') + '\n'
expected_bytes = len(post_source.encode('utf-8'))
expected_lines = post_source.count('\n')
expected_sha = hashlib.sha256(post_source.encode('utf-8')).hexdigest()
kernel_test = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', kernel_test, count=1)
kernel_test = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", kernel_test, count=1)
kernel_test = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', kernel_test, count=1)
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(f'runway geometry materializado; module={module_bytes} bytes sha={module_sha}; kernel={expected_bytes} bytes lines={expected_lines} sha={expected_sha}; functions=343')
