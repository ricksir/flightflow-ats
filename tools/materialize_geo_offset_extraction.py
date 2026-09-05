#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'geo' / 'coordinate-utils.js'
COORD_TEST = ROOT / 'tests' / 'coordinate-utils-contract.test.js'
GEO_TEST = ROOT / 'tests' / 'geo-offset-contract.test.js'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'
TESTS = ROOT / 'tests'

TARGET = 'geoOffset'
TARGET_BYTES = 662
TARGET_LINES = 12
TARGET_SHA = '760638ed416440af6ef5dec963fbfa044edb0d54a65b4807fceae796f7b33432'
TARGET_CONSUMERS = 1
MODULE_BYTES = 2313
MODULE_SHA = 'c8a2c7f78cd11811606792becc515139abd76ef7f0856aa66428829658f8eac5'
POST_MODULE_BYTES = 2992
POST_MODULE_SHA = 'b0edfdd042a3ada92847433ee8c781ae613cc29647f13d8050484b104fc234c7'
KERNEL_BYTES = 1140460
KERNEL_LINES = 5412
KERNEL_SHA = '7240af8daf7d03baff9d5b2517265e9ec0ea48ccc988f0920c2bcd7bedfe6722'
KERNEL_FUNCTIONS = 340

OLD_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;'
NEW_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid, geoOffset } = CoordinateUtils;'

EXISTING = {
    'normalizeCoordinateInput': (196, '25eeb5945c7e4d2b8d6e3fcd17bce4fd78d3eb4c51e779c9f80360a26e75f528'),
    'validAerodromeCoordinate': (192, '3e113b6ba7a93eb851c5f70ad19a5aff715436c3b1804a36da4335fef87563c5'),
    'formatGeoCoord': (135, 'a7219e2ed5d6939754accd2b96248cecbfc826c43bc905718d082c52ee6f963e'),
    'atsCoordinateLabel': (141, '541c59f892839907c29cbfeac7ac7256251aca2272180d83c4f3b355ecc532b6'),
    'groundCentroid': (279, '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559'),
    'runwayTokens': (104, 'ea7c2d4dc62cfc56fa3bda6177625df9caff5213888cf700d5d5ad05d8eb7b2f'),
    'runwayHeading': (243, '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715'),
    'runwayHeadingFromCode': (360, '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053'),
    'polygonGeoCentroid': (337, 'af2ed9697962ac78039ec6c758b9de6e8f1e24367e5d362a8cf245b14572ba61'),
}

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
    matches = list(re.finditer(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\(', source))
    if len(matches) != 1:
        raise SystemExit(f'{name}: esperado 1 declaração, encontrado {len(matches)}')
    match = matches[0]
    start = match.start() + (1 if match.group(1) == '\n' else 0)
    paren = source.find('(', start)
    i, depth, mode, quote, escape = paren, 0, 'code', '', False
    paren_end = None
    while i < len(source):
        c = source[i]
        n = source[i + 1] if i + 1 < len(source) else ''
        if mode == 'line':
            if c == '\n': mode = 'code'
            i += 1; continue
        if mode == 'block':
            if c == '*' and n == '/': mode = 'code'; i += 2; continue
            i += 1; continue
        if mode in ('string', 'template'):
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: mode = 'code'
            i += 1; continue
        if c == '/' and n == '/': mode = 'line'; i += 2; continue
        if c == '/' and n == '*': mode = 'block'; i += 2; continue
        if c in ("'", '"', '`'): mode = 'template' if c == '`' else 'string'; quote = c; i += 1; continue
        if c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: paren_end = i; break
        i += 1
    if paren_end is None:
        raise SystemExit(f'{name}: parâmetros não terminados')
    brace = paren_end + 1
    while brace < len(source) and source[brace].isspace(): brace += 1
    if brace >= len(source) or source[brace] != '{':
        raise SystemExit(f'{name}: abertura não encontrada')
    i, depth, mode, quote, escape = brace, 0, 'code', '', False
    while i < len(source):
        c = source[i]
        n = source[i + 1] if i + 1 < len(source) else ''
        if mode == 'line':
            if c == '\n': mode = 'code'
            i += 1; continue
        if mode == 'block':
            if c == '*' and n == '/': mode = 'code'; i += 2; continue
            i += 1; continue
        if mode in ('string', 'template'):
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: mode = 'code'
            i += 1; continue
        if c == '/' and n == '/': mode = 'line'; i += 2; continue
        if c == '/' and n == '*': mode = 'block'; i += 2; continue
        if c in ("'", '"', '`'): mode = 'template' if c == '`' else 'string'; quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return source[start:i + 1]
        i += 1
    raise SystemExit(f'{name}: corpo não terminado')


html = HTML.read_text(encoding='utf-8')
module = MODULE.read_text(encoding='utf-8')
pre_kernel = contract_kernel(html)
if len(pre_kernel.encode('utf-8')) != KERNEL_BYTES or pre_kernel.count('\n') != KERNEL_LINES or sha(pre_kernel) != KERNEL_SHA:
    raise SystemExit(f'kernel baseline divergiu: bytes={len(pre_kernel.encode())} linhas={pre_kernel.count(chr(10))} sha={sha(pre_kernel)}')
if len(module.encode('utf-8')) != MODULE_BYTES or sha(module) != MODULE_SHA:
    raise SystemExit(f'coordinate-utils baseline divergiu: bytes={len(module.encode())} sha={sha(module)}')

frozen = {}
for name, (expected_bytes, expected_sha) in EXISTING.items():
    body = extract_function(module, name)
    if len(body.encode('utf-8')) != expected_bytes or sha(body) != expected_sha:
        raise SystemExit(f'{name}: identidade existente divergiu')
    frozen[name] = body

target = extract_function(raw_kernel(html), TARGET)
if len(target.encode('utf-8')) != TARGET_BYTES or target.count('\n') + 1 != TARGET_LINES or sha(target) != TARGET_SHA:
    raise SystemExit(f'{TARGET}: identidade divergiu: bytes={len(target.encode())} linhas={target.count(chr(10))+1} sha={sha(target)}')
pre_consumers = len(re.findall(r'(?<![\w$.])geoOffset\s*\(', raw_kernel(html))) - 1
if pre_consumers != TARGET_CONSUMERS:
    raise SystemExit(f'{TARGET}: consumidores esperados={TARGET_CONSUMERS}, encontrados={pre_consumers}')
for token in FORBIDDEN:
    if token in target:
        raise SystemExit(f'{TARGET}: acoplamento proibido {token}')

# Insere a função literal no módulo e amplia somente a API pública.
export_anchor = '  window.FlightFlowCoordinateUtils = Object.freeze({'
module = replace_once(module, export_anchor, target + '\n\n' + export_anchor, 'âncora export coordinate-utils')
module = replace_once(module, '    polygonGeoCentroid,\n', '    polygonGeoCentroid,\n    geoOffset,\n', 'export geoOffset')
if len(module.encode('utf-8')) != POST_MODULE_BYTES or sha(module) != POST_MODULE_SHA:
    raise SystemExit(f'coordinate-utils pós-corte inesperado: bytes={len(module.encode())} sha={sha(module)}')
for name, original in frozen.items():
    if extract_function(module, name) != original:
        raise SystemExit(f'{name}: foi alterada durante o corte')
if extract_function(module, TARGET) != target:
    raise SystemExit('geoOffset não preservou identidade literal no módulo')
MODULE.write_text(module, encoding='utf-8')

# Amplia o alias e remove somente a declaração inline.
html = replace_once(html, OLD_ALIAS, NEW_ALIAS, 'alias CoordinateUtils no index')
if target + '\n\n' in html:
    html = replace_once(html, target + '\n\n', '', 'declaração inline geoOffset')
else:
    html = replace_once(html, target, '', 'declaração inline geoOffset')
HTML.write_text(html, encoding='utf-8')

post_raw = raw_kernel(html)
post_kernel = contract_kernel(html)
if 'function geoOffset(' in post_raw:
    raise SystemExit('geoOffset permaneceu inline')
if len(re.findall(r'(?<![\w$.])geoOffset\s*\(', post_raw)) != TARGET_CONSUMERS:
    raise SystemExit('consumidor de geoOffset mudou após o corte')
if post_raw.count(NEW_ALIAS) != 1:
    raise SystemExit('novo alias CoordinateUtils deve existir uma vez no kernel')
if 'function goTo(' not in post_raw or 'function renderCurrent(' not in post_raw:
    raise SystemExit('função protegida foi removida')

# Atualiza mecanicamente aliases congelados em outros contratos.
alias_tests = []
for path in sorted(TESTS.glob('*.test.js')):
    text = path.read_text(encoding='utf-8')
    if OLD_ALIAS in text:
        text = text.replace(OLD_ALIAS, NEW_ALIAS)
        path.write_text(text, encoding='utf-8')
        alias_tests.append(path.name)

# Migra o contrato específico para a nova localização mantendo semântica congelada.
geo_test = GEO_TEST.read_text(encoding='utf-8')
geo_test = replace_once(geo_test, "const HTML = path.join(ROOT, 'index.html');\n", "const HTML = path.join(ROOT, 'index.html');\nconst MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');\n", 'MODULE no contrato geoOffset')
geo_test = geo_test.replace('`${name} deve permanecer inline antes da extração`', '`${name} deve existir no coordinate-utils após a extração`')
geo_test = geo_test.replace("functionSource(kernelSource(), 'geoOffset')", "functionSource(fs.readFileSync(MODULE, 'utf8'), 'geoOffset')")
old_consumer = "  const consumers = [...kernel.matchAll(/(?<![\\w$.])geoOffset\\s*\\(/g)].length - 1;\n  assert.equal(consumers, EXPECTED_CONSUMERS);"
new_consumer = "  assert.equal(kernel.includes('function geoOffset('), false, 'geoOffset não deve permanecer inline');\n  const consumers = [...kernel.matchAll(/(?<![\\w$.])geoOffset\\s*\\(/g)].length;\n  assert.equal(consumers, EXPECTED_CONSUMERS);\n  assert.ok(kernel.includes('const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid, geoOffset } = CoordinateUtils;'));"
geo_test = replace_once(geo_test, old_consumer, new_consumer, 'consumidor geoOffset pós-corte')
GEO_TEST.write_text(geo_test, encoding='utf-8')

# Atualiza o contrato estrutural de coordinate-utils.
coord_test = COORD_TEST.read_text(encoding='utf-8')
coord_test = replace_once(coord_test, 'const MODULE_BYTES = 2313;', f'const MODULE_BYTES = {POST_MODULE_BYTES};', 'coordinate-utils bytes')
coord_test = replace_once(coord_test, "const MODULE_SHA256 = 'c8a2c7f78cd11811606792becc515139abd76ef7f0856aa66428829658f8eac5';", f"const MODULE_SHA256 = '{POST_MODULE_SHA}';", 'coordinate-utils sha')
polygon_block = "  polygonGeoCentroid: {\n    bytes: 337,\n    sha256: 'af2ed9697962ac78039ec6c758b9de6e8f1e24367e5d362a8cf245b14572ba61',\n  },\n"
geo_block = polygon_block + "  geoOffset: {\n    bytes: 662,\n    sha256: '760638ed416440af6ef5dec963fbfa044edb0d54a65b4807fceae796f7b33432',\n  },\n"
coord_test = replace_once(coord_test, polygon_block, geo_block, 'EXPECTED geoOffset')
coord_test = replace_once(coord_test, "test('nove utilitários geográficos preservam identidade byte a byte após a extração'", "test('dez utilitários geográficos preservam identidade byte a byte após a extração'", 'título dez utilitários')
if OLD_ALIAS in coord_test:
    coord_test = coord_test.replace(OLD_ALIAS, NEW_ALIAS)
COORD_TEST.write_text(coord_test, encoding='utf-8')

# Atualiza o contrato estrutural do kernel com baseline calculado do resultado.
kernel_test = KERNEL_TEST.read_text(encoding='utf-8')
kernel_test = replace_once(kernel_test, f'const EXPECTED_BYTES = {KERNEL_BYTES};', f'const EXPECTED_BYTES = {len(post_kernel.encode("utf-8"))};', 'kernel bytes')
kernel_test = replace_once(kernel_test, f"const EXPECTED_SHA256 = '{KERNEL_SHA}';", f"const EXPECTED_SHA256 = '{sha(post_kernel)}';", 'kernel sha')
kernel_test = replace_once(kernel_test, f'const EXPECTED_LINES = {KERNEL_LINES};', f'const EXPECTED_LINES = {post_kernel.count(chr(10))};', 'kernel lines')
kernel_test = replace_once(kernel_test, "  'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode', 'polygonGeoCentroid'\n];", "  'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode', 'polygonGeoCentroid', 'geoOffset'\n];", 'lista coordinate-utils extraída')
if OLD_ALIAS in kernel_test:
    kernel_test = kernel_test.replace(OLD_ALIAS, NEW_ALIAS)
kernel_test = replace_once(kernel_test, "test('inventário interno do núcleo mantém nomes únicos após sete extrações puras e sete cortes de timeline'", "test('inventário interno do núcleo mantém nomes únicos após oito extrações puras e sete cortes de timeline'", 'título inventário')
kernel_test = replace_once(kernel_test, '  assert.equal(names.length, 340);', '  assert.equal(names.length, 339);', 'contagem nomes kernel')
kernel_test = replace_once(kernel_test, '  assert.equal(counts.size, 340);', '  assert.equal(counts.size, 339);', 'contagem nomes únicos kernel')
KERNEL_TEST.write_text(kernel_test, encoding='utf-8')

print(f'geoOffset: {TARGET_BYTES} bytes / {TARGET_LINES} linhas / {TARGET_SHA} / consumidores={TARGET_CONSUMERS}')
print(f'coordinate-utils: {POST_MODULE_BYTES} bytes / sha={POST_MODULE_SHA} / funções=10')
print(f'kernel: {len(post_kernel.encode("utf-8"))} bytes / linhas={post_kernel.count(chr(10))} / sha={sha(post_kernel)} / funções=339')
print('alias tests atualizados:', ', '.join(alias_tests) if alias_tests else '(nenhum adicional)')
