#!/usr/bin/env python3
"""Mechanically move frozen operational-state presentation helpers out of the main IIFE.

Safety properties:
- each source declaration must exist exactly once in the main IIFE;
- each function body must match its frozen UTF-8 byte length and SHA-256;
- function bodies are moved without editing their contents;
- existing consumers keep the same local names through aliases;
- the new module is loaded immediately before the main IIFE;
- no functional rule is changed, including the current INATIVO stripTheme behavior.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
MODULE = Path('src/ui/operational-state-utils.js')
ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({'
SCRIPT_TAG = '<script id="flightflow-operational-state-utils" src="src/ui/operational-state-utils.js"></script>'

EXPECTED = {
    'themeSwatch': (330, 'f6a08de7486f9f317f9ae48739bf130d2d3f7f07b45ab5c4f76afa609994ba52'),
    'stripTheme': (653, '2dd09d6f90d269c0441ca63a5022d66a12de606235acbe8d5554ef2bf8c6f2f4'),
    'statusClass': (413, '459acb249e4af18bb6973d305fbd6e43c9c558ec89452b975de71ee4d122f12e'),
}

ALIAS_ANCHOR = "  const { normalizeFontScale, fontLayoutForScale, fontLayoutDescription } = TypographyUtils;\n"
ALIAS_BLOCK = (
    ALIAS_ANCHOR
    + "  const OperationalStateUtils = window.FlightFlowOperationalStateUtils;\n"
    + "  if (!OperationalStateUtils) throw new Error('FlightFlowOperationalStateUtils não foi carregado.');\n"
    + "  const { themeSwatch, stripTheme, statusClass } = OperationalStateUtils;\n"
)


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def scan_balanced(text: str, open_index: int, open_char: str, close_char: str) -> int:
    depth = 0
    mode = 'code'
    quote = ''
    escape = False
    i = open_index
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if mode == 'line':
            if c == '\n':
                mode = 'code'
            i += 1
            continue
        if mode == 'block':
            if c == '*' and n == '/':
                mode = 'code'
                i += 2
                continue
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
        if c == '/' and n == '/':
            mode = 'line'
            i += 2
            continue
        if c == '/' and n == '*':
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
        if c == open_char:
            depth += 1
        elif c == close_char:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_function(source: str, name: str) -> tuple[int, int, str]:
    pattern = re.compile(r'(^|\n)([ \t]*)function\s+' + re.escape(name) + r'\s*\(', re.M)
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise RuntimeError(f'{name}: expected exactly one declaration, got {len(matches)}')
    match = matches[0]
    start = match.start() + (1 if match.group(1) == '\n' else 0)
    paren = source.find('(', start)
    paren_end = scan_balanced(source, paren, '(', ')')
    if paren_end < 0:
        raise RuntimeError(f'{name}: unterminated parameter list')
    brace = paren_end + 1
    while brace < len(source) and source[brace].isspace():
        brace += 1
    if brace >= len(source) or source[brace] != '{':
        raise RuntimeError(f'{name}: opening brace not found')
    end = scan_balanced(source, brace, '{', '}')
    if end < 0:
        raise RuntimeError(f'{name}: unterminated body')
    body = source[start:end + 1]
    expected_bytes, expected_sha = EXPECTED[name]
    actual_bytes = len(body.encode('utf-8'))
    actual_sha = sha256(body)
    if actual_bytes != expected_bytes or actual_sha != expected_sha:
        raise RuntimeError(
            f'{name}: frozen contract mismatch: bytes={actual_bytes}/{expected_bytes} '
            f'sha={actual_sha}/{expected_sha}'
        )
    return start, end + 1, body


def main() -> None:
    html = INDEX.read_text(encoding='utf-8')
    if SCRIPT_TAG in html:
        raise RuntimeError('operational-state module script tag already exists')
    anchor_index = html.find(ANCHOR)
    if anchor_index < 0:
        raise RuntimeError('FIR bridge anchor not found')
    script_start = html.rfind('<script', 0, anchor_index)
    body_start = html.find('>', script_start) + 1
    body_end = html.find('</script>', anchor_index)
    if script_start < 0 or body_start <= script_start or body_end <= body_start:
        raise RuntimeError('main IIFE script bounds not found')

    kernel = html[body_start:body_end]
    extracted: dict[str, str] = {}
    ranges: list[tuple[int, int, str]] = []
    for name in EXPECTED:
        start, end, body = extract_function(kernel, name)
        extracted[name] = body
        ranges.append((start, end, name))

    for start, end, name in sorted(ranges, reverse=True):
        kernel = kernel[:start] + kernel[end:]
        print(f'Moved {name}: {end - start} characters removed from main IIFE.')

    if kernel.count(ALIAS_ANCHOR) != 1:
        raise RuntimeError('typography alias anchor must exist exactly once')
    kernel = kernel.replace(ALIAS_ANCHOR, ALIAS_BLOCK, 1)

    module_text = "(function () {\n  'use strict';\n\n"
    module_text += extracted['themeSwatch'] + '\n\n'
    module_text += extracted['stripTheme'] + '\n\n'
    module_text += extracted['statusClass'] + '\n'
    module_text += "  window.FlightFlowOperationalStateUtils = Object.freeze({\n"
    module_text += "    themeSwatch,\n    stripTheme,\n    statusClass,\n  });\n})();\n"

    MODULE.parent.mkdir(parents=True, exist_ok=True)
    MODULE.write_text(module_text, encoding='utf-8')

    html = html[:body_start] + kernel + html[body_end:]
    # Recompute the main script location after shortening the kernel, then insert module directly before it.
    anchor_index = html.find(ANCHOR)
    script_start = html.rfind('<script', 0, anchor_index)
    html = html[:script_start] + SCRIPT_TAG + '\n' + html[script_start:]
    INDEX.write_text(html, encoding='utf-8')

    # Postconditions.
    if html.count(SCRIPT_TAG) != 1:
        raise RuntimeError('operational-state module reference must exist exactly once')
    if html.find(SCRIPT_TAG) > html.rfind('<script', 0, html.find(ANCHOR)):
        raise RuntimeError('operational-state module must load before main IIFE')
    new_anchor = html.find(ANCHOR)
    new_script_start = html.rfind('<script', 0, new_anchor)
    new_body_start = html.find('>', new_script_start) + 1
    new_body_end = html.find('</script>', new_anchor)
    new_kernel = html[new_body_start:new_body_end]
    for name in EXPECTED:
        if re.search(r'function\s+' + re.escape(name) + r'\s*\(', new_kernel):
            raise RuntimeError(f'{name}: still declared inline after extraction')
    for token in (
        'const OperationalStateUtils = window.FlightFlowOperationalStateUtils;',
        "if (!OperationalStateUtils) throw new Error('FlightFlowOperationalStateUtils não foi carregado.');",
        'const { themeSwatch, stripTheme, statusClass } = OperationalStateUtils;',
    ):
        if token not in new_kernel:
            raise RuntimeError(f'missing alias contract: {token}')

    module_bytes = len(module_text.encode('utf-8'))
    kernel_bytes = len(new_kernel.encode('utf-8'))
    print(f'Operational-state module: {module_bytes:,} bytes / SHA-256 {sha256(module_text)}')
    print(f'Main IIFE: {kernel_bytes:,} bytes / {new_kernel.count(chr(10)):,} newline characters')
    print(f'Main IIFE SHA-256: {sha256(new_kernel)}')
    print(f'index.html: {len(html.encode("utf-8")):,} bytes / SHA-256 {sha256(html)}')


if __name__ == '__main__':
    main()
