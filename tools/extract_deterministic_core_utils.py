#!/usr/bin/env python3
"""Mechanically move three frozen deterministic helpers into FlightFlowCoreUtils.

Safety properties:
- each source declaration must exist exactly once in the main IIFE;
- each body must match its frozen UTF-8 byte length and SHA-256;
- function bodies are moved without editing their contents;
- existing consumers keep their original local names through the CoreUtils alias;
- no new module boundary is created.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
CORE = Path('src/core/core-utils.js')
ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({'

EXPECTED = {
    'angleDifference': (89, 'c33f42ad25fa9d352f3d38975f1d054fe026b3924bf1ac37780e11b674c5e4b2'),
    'hashString': (141, '7da6f0aba25a918f031e10e8abbd2fea0c777054758b7b5b7d0edec024555a94'),
    'seeded': (107, 'e8a98352bd15958c19bfa524d389fa7f84ce3ab902bde82439dafee89dacfbc2'),
}
NAMES = list(EXPECTED)
OLD_ALIAS = '  const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes } = CoreUtils;'
NEW_ALIAS = '  const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes, angleDifference, hashString, seeded } = CoreUtils;'
EXPORT_NEEDLE = '    formatBytes,\n'
EXPORT_REPLACEMENT = '    formatBytes,\n    angleDifference,\n    hashString,\n    seeded,\n'
CORE_INSERT_ANCHOR = '\n  window.FlightFlowCoreUtils = Object.freeze({'


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def extract_function(source: str, name: str) -> tuple[int, int, str]:
    pattern = re.compile(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\([^)]*\)\s*\{')
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise RuntimeError(f'{name}: expected exactly one declaration, got {len(matches)}')
    match = matches[0]
    start = match.start() + (1 if match.group(1) == '\n' else 0)
    brace = source.find('{', start)
    if brace < 0:
        raise RuntimeError(f'{name}: opening brace not found')

    depth = 0
    mode = 'code'
    quote = ''
    escape = False
    i = brace
    while i < len(source):
        c = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if mode == 'line':
            if c == '\n':
                mode = 'code'
            i += 1
            continue
        if mode == 'block':
            if c == '*' and nxt == '/':
                mode = 'code'
                i += 2
            else:
                i += 1
            continue
        if mode == 'string':
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == quote:
                mode = 'code'
            i += 1
            continue
        if mode == 'template':
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '`':
                mode = 'code'
            i += 1
            continue
        if c == '/' and nxt == '/':
            mode = 'line'
            i += 2
            continue
        if c == '/' and nxt == '*':
            mode = 'block'
            i += 2
            continue
        if c in ('"', "'"):
            mode = 'string'
            quote = c
            i += 1
            continue
        if c == '`':
            mode = 'template'
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                return start, end, source[start:end]
        i += 1
    raise RuntimeError(f'{name}: declaration not terminated')


def main() -> None:
    html = INDEX.read_text(encoding='utf-8')
    core = CORE.read_text(encoding='utf-8')

    anchor_index = html.find(ANCHOR)
    if anchor_index < 0:
        raise RuntimeError('main IIFE FIR anchor not found')
    script_start = html.rfind('<script', 0, anchor_index)
    body_start = html.find('>', script_start) + 1
    body_end = html.find('</script>', anchor_index)
    if script_start < 0 or body_start <= script_start or body_end <= body_start:
        raise RuntimeError('main IIFE bounds not found')
    kernel = html[body_start:body_end]

    extracted: dict[str, str] = {}
    spans: list[tuple[int, int, str]] = []
    for name, (expected_bytes, expected_sha) in EXPECTED.items():
        start, end, body = extract_function(kernel, name)
        actual_bytes = len(body.encode('utf-8'))
        actual_sha = sha256(body)
        if actual_bytes != expected_bytes or actual_sha != expected_sha:
            raise RuntimeError(
                f'{name}: frozen identity mismatch: bytes={actual_bytes} sha={actual_sha}'
            )
        extracted[name] = body
        spans.append((start, end, name))

    if OLD_ALIAS not in kernel:
        raise RuntimeError('expected CoreUtils alias not found')
    if NEW_ALIAS in kernel:
        raise RuntimeError('deterministic utilities already present in CoreUtils alias')

    # Remove from the end backwards so frozen offsets remain valid.
    for start, end, name in sorted(spans, reverse=True):
        kernel = kernel[:start] + kernel[end:]
        print(f'Moved {name}: {end - start} characters removed from main IIFE.')

    kernel = kernel.replace(OLD_ALIAS, NEW_ALIAS, 1)

    if CORE_INSERT_ANCHOR not in core:
        raise RuntimeError('FlightFlowCoreUtils export anchor not found')
    for name in NAMES:
        if re.search(r'(^|\n)[ \t]*function\s+' + re.escape(name) + r'\s*\(', core):
            raise RuntimeError(f'{name}: already declared in core-utils module')

    moved_block = '\n\n'.join(extracted[name] for name in NAMES)
    core = core.replace(CORE_INSERT_ANCHOR, '\n\n' + moved_block + CORE_INSERT_ANCHOR, 1)

    if core.count(EXPORT_NEEDLE) != 1:
        raise RuntimeError('formatBytes export anchor must occur exactly once')
    core = core.replace(EXPORT_NEEDLE, EXPORT_REPLACEMENT, 1)

    html = html[:body_start] + kernel + html[body_end:]
    INDEX.write_text(html, encoding='utf-8')
    CORE.write_text(core, encoding='utf-8')

    normalized_kernel = kernel.strip('\n') + '\n'
    print(f'Core-utils: {len(core.encode("utf-8")):,} bytes / SHA-256 {sha256(core)}')
    print(f'Main IIFE: {len(normalized_kernel.encode("utf-8")):,} bytes / {normalized_kernel.count(chr(10)):,} lines')
    print(f'Main IIFE SHA-256: {sha256(normalized_kernel)}')


if __name__ == '__main__':
    main()
