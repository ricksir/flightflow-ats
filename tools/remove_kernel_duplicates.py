#!/usr/bin/env python3
"""Remove byte-identical duplicate function declarations from the main FlightFlow IIFE.

This is a one-time mechanical cleanup. It only proceeds when both duplicate pairs match
known SHA-256 fingerprints captured before the change. The later declarations are kept,
which preserves the effective declaration that already won by source order.
"""
from __future__ import annotations

import hashlib
import re
from collections import Counter
from pathlib import Path

INDEX = Path('index.html')
INVENTORY = Path('tools/function_inventory.py')
CONTRACT = Path('tests/main-kernel-contract.test.js')
ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({'
EXPECTED = {
    'buildTimeline': ('5c152a66eee7d3a5294f868340725275a705d1432a3351b90733a29fa535c85a', 1681),
    'getSourceClass': ('218601658b8d5f0826ff053c155579ae404ffec1cb8612a9192fd9be504c5df9', 289),
}


def kernel_bounds(text: str) -> tuple[int, int]:
    idx = text.find(ANCHOR)
    if idx < 0:
        raise SystemExit('Ponte FIR do núcleo principal não encontrada.')
    script_start = text.rfind('<script', 0, idx)
    body_start = text.find('>', script_start, idx) + 1
    body_end = text.find('</script>', idx)
    if script_start < 0 or body_start <= 0 or body_end < 0:
        raise SystemExit('IIFE principal não pôde ser delimitado.')
    return body_start, body_end


def find_occurrences(source: str, name: str) -> list[int]:
    pat = re.compile(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\([^)]*\)\s*\{')
    return [m.start(0) + (1 if m.group(1) == '\n' else 0) for m in pat.finditer(source)]


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


def body_hash(body: str) -> tuple[str, int]:
    raw = body.encode('utf-8')
    return hashlib.sha256(raw).hexdigest(), len(raw)


def normalized_kernel(text: str) -> str:
    start, end = kernel_bounds(text)
    return text[start:end].strip('\n') + '\n'


text = INDEX.read_text(encoding='utf-8')
body_start, body_end = kernel_bounds(text)
source = text[body_start:body_end]

ranges: list[tuple[int, int, str]] = []
for name, (expected_sha, expected_bytes) in EXPECTED.items():
    offsets = find_occurrences(source, name)
    if len(offsets) != 2:
        raise SystemExit(f'{name}: esperadas 2 ocorrências, encontradas {len(offsets)}.')
    bodies = []
    ends = []
    for offset in offsets:
        end = function_end(source, offset)
        body = source[offset:end]
        sha, size = body_hash(body)
        if sha != expected_sha or size != expected_bytes:
            raise SystemExit(
                f'{name}: corpo inesperado em {offset}: {size} bytes / {sha}; '
                f'esperado {expected_bytes} / {expected_sha}.'
            )
        bodies.append(body)
        ends.append(end)
    if bodies[0] != bodies[1]:
        raise SystemExit(f'{name}: as duas declarações deixaram de ser byte-idênticas.')

    remove_start = offsets[0]
    remove_end = ends[0]
    if name == 'buildTimeline':
        marker = '  // Modifica renderTimeline para mostrar a fonte\n'
        marker_start = source.rfind(marker, max(0, remove_start - len(marker) - 8), remove_start)
        if marker_start >= 0 and marker_start + len(marker) == remove_start:
            remove_start = marker_start
    while remove_end < len(source) and source[remove_end] == '\n':
        remove_end += 1
        if remove_end < len(source) and source[remove_end] != '\n':
            break
    ranges.append((remove_start, remove_end, name))

# Remove earlier duplicates only; later declarations remain untouched.
for start, end, name in sorted(ranges, reverse=True):
    source = source[:start] + source[end:]
    print(f'Removida primeira declaração redundante de {name}: {end - start} caracteres.')

patched = text[:body_start] + source + text[body_end:]
for name in EXPECTED:
    count = len(find_occurrences(source, name))
    if count != 1:
        raise SystemExit(f'{name}: esperado exatamente 1 após limpeza, encontrado {count}.')

# Update structural inventory: these names are no longer accepted as known repetitions.
inv = INVENTORY.read_text(encoding='utf-8')
for name in EXPECTED:
    token = f"    '{name}',\n"
    if token not in inv:
        raise SystemExit(f'Entrada {name} não encontrada em KNOWN_REPEATED.')
    inv = inv.replace(token, '', 1)
INVENTORY.write_text(inv, encoding='utf-8')

# Update the exact baseline contract to the mechanically-cleaned kernel.
new_kernel = normalized_kernel(patched)
new_bytes = len(new_kernel.encode('utf-8'))
new_lines = len(new_kernel.splitlines())
new_sha = hashlib.sha256(new_kernel.encode('utf-8')).hexdigest()
contract = CONTRACT.read_text(encoding='utf-8')
replacements = {
    'const EXPECTED_BYTES = 1150175;': f'const EXPECTED_BYTES = {new_bytes};',
    "const EXPECTED_SHA256 = 'b55bf4d7734e8e085c8a04e40f523aa4cad90b20b00be0cbb6a137114ca4911d';": f"const EXPECTED_SHA256 = '{new_sha}';",
    'const EXPECTED_LINES = 5571;': f'const EXPECTED_LINES = {new_lines};',
    "const EXPECTED_DUPLICATES = ['buildTimeline', 'getSourceClass'];": 'const EXPECTED_DUPLICATES = [];',
    'assert.equal(names.length, 378);': 'assert.equal(names.length, 376);',
}
for old, new in replacements.items():
    if old not in contract:
        raise SystemExit(f'Baseline esperado não encontrado no contrato: {old}')
    contract = contract.replace(old, new, 1)
CONTRACT.write_text(contract, encoding='utf-8')

INDEX.write_text(patched, encoding='utf-8')

# Final structural proof.
names = re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(', new_kernel)
counts = Counter(names)
duplicates = sorted(name for name, count in counts.items() if count > 1)
if len(names) != 376 or len(counts) != 376 or duplicates:
    raise SystemExit(
        f'Inventário interno inesperado: declarations={len(names)}, unique={len(counts)}, duplicates={duplicates}'
    )

print(f'Novo núcleo: {new_bytes:,} bytes, {new_lines:,} linhas')
print(f'Novo SHA-256: {new_sha}')
print('Duplicações internas do núcleo: 0')
