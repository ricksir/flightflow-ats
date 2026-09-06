from pathlib import Path
import hashlib
import re
import subprocess

# One-shot materializer. Remove after the generated production commit is validated.
ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
MODULE = ROOT / 'src' / 'config' / 'config-validation.js'
MAIN_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'
CONFIG_TEST = ROOT / 'tests' / 'validate-config-contract.test.js'

EXPECTED_BYTES = 1259
EXPECTED_SHA = '296244487d56d1852f29fca12881857b6c84f8615c22c7f8893d56e37441162e'
REFERENCE = '<script id="flightflow-config-validation" src="src/config/config-validation.js"></script>'
ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({'
PARSER_BLOCK = "  const Parser = window.FlightParser;\n  if (!Parser) throw new Error('FlightParser não foi carregado.');"


def function_source(container: str, name: str):
    marker = f'  function {name}('
    start = container.find(marker)
    if start < 0:
        raise SystemExit(f'{name} não encontrado')
    paren = container.find('(', start)
    i, depth, quote, escaped = paren, 0, None, False
    while i < len(container):
        c = container[i]
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
    while brace < len(container) and container[brace].isspace():
        brace += 1
    if container[brace] != '{':
        raise SystemExit('abertura do corpo não encontrada')
    depth, quote, escaped = 0, None, False
    for i in range(brace, len(container)):
        c = container[i]
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
                return start, i + 1, container[start:i+1]
    raise SystemExit(f'fim de {name} não encontrado')


def sha(text: str):
    return hashlib.sha256(text.encode()).hexdigest()

html = HTML.read_text()
anchor_index = html.find(ANCHOR)
if anchor_index < 0:
    raise SystemExit('âncora FIR ausente')
script_start = html.rfind('<script', 0, anchor_index)
body_start = html.find('>', script_start) + 1
script_end = html.find('</script>', anchor_index)
if min(script_start, body_start, script_end) < 0:
    raise SystemExit('IIFE principal não delimitado')
kernel = html[body_start:script_end]
start, end, fn = function_source(kernel, 'validateConfig')
if len(fn.encode()) != EXPECTED_BYTES or sha(fn) != EXPECTED_SHA:
    raise SystemExit(f'identidade divergente: bytes={len(fn.encode())} sha={sha(fn)}')

module = """(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowConfigValidation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

""" + fn + """

  return Object.freeze({ validateConfig });
});
"""
MODULE.parent.mkdir(parents=True, exist_ok=True)
MODULE.write_text(module)
module_bytes = len(module.encode())
module_sha = sha(module)

new_kernel = kernel[:start] + kernel[end:]
if PARSER_BLOCK not in new_kernel:
    raise SystemExit('bloco Parser não encontrado')
config_alias = PARSER_BLOCK + "\n  const ConfigValidation = window.FlightFlowConfigValidation;\n  if (!ConfigValidation) throw new Error('FlightFlowConfigValidation não foi carregado.');\n  const { validateConfig } = ConfigValidation;"
new_kernel = new_kernel.replace(PARSER_BLOCK, config_alias, 1)

html = html[:body_start] + new_kernel + html[script_end:]
anchor_index = html.find(ANCHOR)
script_start = html.rfind('<script', 0, anchor_index)
if REFERENCE not in html:
    html = html[:script_start] + REFERENCE + '\n' + html[script_start:]
HTML.write_text(html)

normalized = new_kernel.strip('\n') + '\n'
new_bytes = len(normalized.encode())
new_sha = sha(normalized)
new_lines = normalized.count('\n')
mt = MAIN_TEST.read_text()
mt = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {new_bytes};', mt, count=1)
mt = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{new_sha}';", mt, count=1)
mt = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {new_lines};', mt, count=1)
if "const EXTRACTED_CONFIG_VALIDATION" not in mt:
    mt = mt.replace("const EXTRACTED_SOURCE_CLASS = ['getSourceClass'];", "const EXTRACTED_SOURCE_CLASS = ['getSourceClass'];\nconst EXTRACTED_CONFIG_VALIDATION = ['validateConfig'];")
mt = mt.replace(
    "    'const Parser = window.FlightParser;',\n    \"if (!Parser) throw new Error('FlightParser não foi carregado.');\",",
    "    'const Parser = window.FlightParser;',\n    \"if (!Parser) throw new Error('FlightParser não foi carregado.');\",\n    'const ConfigValidation = window.FlightFlowConfigValidation;',\n    \"if (!ConfigValidation) throw new Error('FlightFlowConfigValidation não foi carregado.');\",\n    'const { validateConfig } = ConfigValidation;',",
    1,
)
mt = mt.replace("    ...EXTRACTED_SOURCE_CLASS,\n  ])", "    ...EXTRACTED_SOURCE_CLASS,\n    ...EXTRACTED_CONFIG_VALIDATION,\n  ])", 1)
mt = mt.replace('assert.equal(names.length, 336);', 'assert.equal(names.length, 335);', 1)
mt = mt.replace('assert.equal(counts.size, 336);', 'assert.equal(counts.size, 335);', 1)
MAIN_TEST.write_text(mt)

ct = CONFIG_TEST.read_text()
if "const MODULE =" not in ct:
    ct = ct.replace("const HTML = path.join(ROOT, 'index.html');", "const HTML = path.join(ROOT, 'index.html');\nconst MODULE = path.join(ROOT, 'src', 'config', 'config-validation.js');\nconst REFERENCE = '<script id=\"flightflow-config-validation\" src=\"src/config/config-validation.js\"></script>';\nconst MODULE_BYTES = %d;\nconst MODULE_SHA256 = '%s';" % (module_bytes, module_sha), 1)
ct = ct.replace("  const source = functionSource(kernelSource(), 'validateConfig');\n  return Function(`${source}\\nreturn validateConfig;`)();", "  delete require.cache[require.resolve(MODULE)];\n  return require(MODULE).validateConfig;", 1)
ct = ct.replace("  const source = functionSource(kernelSource(), 'validateConfig');", "  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'validateConfig');", 1)
ct = ct.replace("  const source = functionSource(kernel, 'validateConfig');", "  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'validateConfig');", 1)
ct = ct.replace("assert.equal([...kernel.matchAll(/(?<![\\w$.])validateConfig\\s*\\(/g)].length - 1, 1);", "assert.equal([...kernel.matchAll(/(?<![\\w$.])validateConfig\\s*\\(/g)].length, 1);", 1)
needle = "  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);\n});"
replacement = "  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);\n  const moduleSource = fs.readFileSync(MODULE, 'utf8');\n  assert.equal(Buffer.byteLength(moduleSource, 'utf8'), MODULE_BYTES);\n  assert.equal(crypto.createHash('sha256').update(moduleSource).digest('hex'), MODULE_SHA256);\n  const api = require(MODULE);\n  assert.equal(Object.isFrozen(api), true);\n  assert.deepEqual(Object.keys(api), ['validateConfig']);\n});"
ct = ct.replace(needle, replacement, 1)
if "index carrega validação externa" not in ct:
    insertion = """

test('index carrega validação externa antes do núcleo e remove declaração inline', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1);
  const anchor = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScript = html.lastIndexOf('<script', anchor);
  assert.ok(html.indexOf(REFERENCE) < mainScript);
  const kernel = kernelSource();
  assert.ok(kernel.includes('const ConfigValidation = window.FlightFlowConfigValidation;'));
  assert.ok(kernel.includes("if (!ConfigValidation) throw new Error('FlightFlowConfigValidation não foi carregado.');"));
  assert.ok(kernel.includes('const { validateConfig } = ConfigValidation;'));
  assert.doesNotMatch(kernel, /function\\s+validateConfig\\s*\\(/);
});
"""
    pos = ct.find("test('validateConfig mantém fronteira pura")
    ct = ct[:pos] + insertion + "\n" + ct[pos:]
CONFIG_TEST.write_text(ct)

print(f'validateConfig preservado: {EXPECTED_BYTES} bytes / {EXPECTED_SHA}')
print(f'módulo: {module_bytes} bytes / {module_sha}')
print(f'núcleo normalizado: {new_bytes} bytes / {new_lines} linhas / {new_sha}')

for cmd in [
    ['python3', 'tools/audit_static.py', 'index.html'],
    ['python3', 'tools/function_inventory.py', 'index.html', '--check'],
    ['npm', 'test'],
    ['git', 'diff', '--check'],
]:
    subprocess.run(cmd, cwd=ROOT, check=True)
