#!/usr/bin/env python3
"""Mechanically extract six pure FlightFlow utilities to src/core/core-utils.js.

Safety properties:
- only runs when each source function exists exactly once in the main IIFE;
- each body must match its frozen byte length and SHA-256;
- moves function bodies without editing their contents;
- loads the external module immediately before the main IIFE;
- binds explicit local aliases so existing callers remain unchanged.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/core/core-utils.js')
ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({'
REFERENCE = '<script id="flightflow-core-utils" src="src/core/core-utils.js"></script>'
PARSER_ANCHOR = (
    "  const Parser = window.FlightParser;\n"
    "  if (!Parser) throw new Error('FlightParser não foi carregado.');\n"
)
ALIAS_BLOCK = (
    "\n  const CoreUtils = window.FlightFlowCoreUtils;\n"
    "  if (!CoreUtils) throw new Error('FlightFlowCoreUtils não foi carregado.');\n"
    "  const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes } = CoreUtils;\n"
)
EXPECTED = {
    'shortMessageType': (124, 'c61517a0039c41c02772b7d261d23925ad705fd5ef36dbbd6c47ef01d15b68c3'),
    'displayValue': (379, '79d5ccbcaec3caead3749f1defa25434e8d05b6f00cca3ac81fd6da66bbe341b'),
    'cleanDisplay': (90, '59f5bf0626873301d135dabc421a5f7e8deaecc2569ab52ca391c889d58f881f'),
    'humanize': (127, 'ae83fb699c075c0433d680e992e58456076aa71e650eced83825138f35d10010'),
    'clone': (69, 'db7ba8554335e139efc09ba8d33ec21644dd3beaa67883dac4faeef570f3873a'),
    'formatBytes': (292, 'e10a2b791e297d5c037cceb25ce9bdd960dd14f72965737fb5e505ef93db2e76'),
}
NAMES = list(EXPECTED)


def main_bounds(text: str) -> tuple[int, int, int]:
    idx = text.find(ANCHOR)
    if idx < 0:
        raise SystemExit('Ponte FIR do núcleo principal não encontrada.')
    script_start = text.rfind('<script', 0, idx)
    body_start = text.find('>', script_start, idx) + 1
    body_end = text.find('</script>', idx)
    if script_start < 0 or body_start <= script_start or body_end <= body_start:
        raise SystemExit('Núcleo principal não pôde ser delimitado.')
    return script_start, body_start, body_end


def occurrences(source: str, name: str) -> list[int]:
    pattern = re.compile(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\([^)]*\)\s*\{')
    return [m.start(0) + (1 if m.group(1) == '\n' else 0) for m in pattern.finditer(source)]


def function_end(source: str, offset: int) -> int:
    brace = source.find('{', offset)
    if brace < 0:
        raise SystemExit('Abertura de função não encontrada.')
    i = brace
    depth = 0
    state = 'code'
    quote = None
    escape = False
    while i < len(source):
        c = source[i]
        n = source[i + 1] if i + 1 < len(source) else ''
        if state == 'line_comment':
            if c == '\n':
                state = 'code'
        elif state == 'block_comment':
            if c == '*' and n == '/':
                state = 'code'
                i += 1
        elif state == 'string':
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == quote:
                state = 'code'
                quote = None
        elif state == 'template':
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '`':
                state = 'code'
        else:
            if c == '/' and n == '/':
                state = 'line_comment'
                i += 1
            elif c == '/' and n == '*':
                state = 'block_comment'
                i += 1
            elif c in ('"', "'"):
                state = 'string'
                quote = c
            elif c == '`':
                state = 'template'
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return i + 1
        i += 1
    raise SystemExit('Função não terminada durante varredura.')


def digest(body: str) -> tuple[int, str]:
    raw = body.encode('utf-8')
    return len(raw), hashlib.sha256(raw).hexdigest()


text = INDEX.read_text(encoding='utf-8')

if TARGET.exists() and REFERENCE in text:
    print('Core utilities já extraídos; nada a fazer.')
    raise SystemExit(0)
if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe sem referência coerente no index.html.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia core-utils sem arquivo-alvo coerente.')

script_start, body_start, body_end = main_bounds(text)
source = text[body_start:body_end]

if source.count(PARSER_ANCHOR) != 1:
    raise SystemExit(f'Âncora do FlightParser esperada uma vez; encontrada {source.count(PARSER_ANCHOR)}.')
if 'const CoreUtils = window.FlightFlowCoreUtils;' in source:
    raise SystemExit('Aliases de CoreUtils já existem no núcleo.')

extracted: dict[str, str] = {}
ranges: list[tuple[int, int, str]] = []
for name in NAMES:
    found = occurrences(source, name)
    if len(found) != 1:
        raise SystemExit(f'{name}: esperada exatamente 1 declaração, encontradas {len(found)}.')
    start = found[0]
    end = function_end(source, start)
    body = source[start:end]
    size, sha = digest(body)
    expected_size, expected_sha = EXPECTED[name]
    if size != expected_size or sha != expected_sha:
        raise SystemExit(
            f'{name}: identidade inesperada ({size} bytes / {sha}); '
            f'esperado {expected_size} / {expected_sha}.'
        )
    extracted[name] = body

    # Remove the declaration plus only directly-adjacent blank line(s).
    remove_end = end
    while remove_end < len(source) and source[remove_end] == '\n':
        remove_end += 1
        if remove_end < len(source) and source[remove_end] != '\n':
            break
    ranges.append((start, remove_end, name))

for start, end, name in sorted(ranges, reverse=True):
    source = source[:start] + source[end:]
    print(f'Movida declaração de {name}: {end - start} caracteres removidos do núcleo.')

for name in NAMES:
    if occurrences(source, name):
        raise SystemExit(f'{name} permaneceu declarado no núcleo após extração.')

source = source.replace(PARSER_ANCHOR, PARSER_ANCHOR + ALIAS_BLOCK, 1)
for name in NAMES:
    if not re.search(r'\b' + re.escape(name) + r'\b', source):
        raise SystemExit(f'{name} deixou de ter consumidores/alias no núcleo.')

module = """(function () {\n  'use strict';\n\n"""
module += '\n\n'.join(extracted[name] for name in NAMES)
module += "\n\n  window.FlightFlowCoreUtils = Object.freeze({\n"
module += ''.join(f'    {name},\n' for name in NAMES)
module += "  });\n})();\n"

# Re-verify every moved function inside the generated module before writing.
for name, (expected_size, expected_sha) in EXPECTED.items():
    found = occurrences(module, name)
    if len(found) != 1:
        raise SystemExit(f'{name}: módulo gerado não contém exatamente uma declaração.')
    end = function_end(module, found[0])
    body = module[found[0]:end]
    size, sha = digest(body)
    if size != expected_size or sha != expected_sha:
        raise SystemExit(f'{name}: módulo gerado alterou bytes/SHA.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(module, encoding='utf-8')

patched = (
    text[:script_start]
    + REFERENCE + '\n'
    + text[script_start:body_start]
    + source
    + text[body_end:]
)
if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência de core-utils não ficou única.')
INDEX.write_text(patched, encoding='utf-8')

# Report the new main-kernel identity for updating its permanent contract.
new_text = INDEX.read_text(encoding='utf-8')
_, new_body_start, new_body_end = main_bounds(new_text)
new_kernel = new_text[new_body_start:new_body_end].strip('\n') + '\n'
print(f'Core-utils criado em {TARGET}.')
print(f'Módulo: {len(module.encode("utf-8")):,} bytes / SHA-256 {hashlib.sha256(module.encode("utf-8")).hexdigest()}')
print(f'Novo núcleo: {len(new_kernel.encode("utf-8")):,} bytes / {len(new_kernel.splitlines()):,} linhas')
print(f'Novo SHA-256 do núcleo: {hashlib.sha256(new_kernel.encode("utf-8")).hexdigest()}')
