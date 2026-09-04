#!/usr/bin/env python3
"""Inventory named JavaScript function declarations inside FlightFlow's HTML.

This is intentionally a structural guard, not a JavaScript scope analyser. A repeated
name may be legitimate when it lives in a different IIFE/module. The gate only prevents
new repeated declaration names from appearing silently while the monolith is being split.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

KNOWN_REPEATED = {
    'buildTimeline',
    'describeEvent',
    'escapeHtml',
    'exportNormalized',
    'getSourceClass',
    'init',
    'normalizeSearchText',
    'openDb',
    'parseHistory',
    'stageForProgress',
    'toast',
}

SCRIPT_RE = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.I | re.S)
ID_RE = re.compile(r'\bid=["\']([^"\']+)["\']', re.I)
FUNC_RE = re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('html', nargs='?', default='index.html')
    parser.add_argument(
        '--check',
        action='store_true',
        help='fail if a new repeated named function declaration appears',
    )
    args = parser.parse_args()

    path = Path(args.html)
    text = path.read_text(encoding='utf-8', errors='replace')
    declarations = defaultdict(list)
    blocks = []

    for index, match in enumerate(SCRIPT_RE.finditer(text), 1):
        attrs, body = match.group(1), match.group(2)
        id_match = ID_RE.search(attrs)
        ident = id_match.group(1) if id_match else f'script-{index}'
        start_line = text.count('\n', 0, match.start(2)) + 1
        functions = []

        for function_match in FUNC_RE.finditer(body):
            name = function_match.group(1)
            line = start_line + body.count('\n', 0, function_match.start())
            declarations[name].append((index, ident, line))
            functions.append((name, line))

        blocks.append((index, ident, start_line, len(body.splitlines()), len(functions)))

    repeated = {name: locations for name, locations in declarations.items() if len(locations) > 1}

    print(f'Arquivo: {path}')
    print(f'Blocos script: {len(blocks)}')
    print(f'Declarações function nomeadas: {sum(len(v) for v in declarations.values())}')
    print(f'Nomes únicos: {len(declarations)}')
    print(f'Nomes repetidos: {len(repeated)}')

    print('\nBlocos:')
    for index, ident, start_line, line_count, function_count in blocks:
        print(
            f'  #{index} {ident}: linha {start_line}, '
            f'~{line_count} linhas, {function_count} funções nomeadas'
        )

    print('\nNomes repetidos:')
    for name in sorted(repeated):
        locations = ', '.join(f'{ident}@L{line}' for _, ident, line in repeated[name])
        print(f'  {name}: {locations}')

    unexpected = set(repeated) - KNOWN_REPEATED
    resolved = KNOWN_REPEATED - set(repeated)

    if resolved:
        print('\nRepetições conhecidas já eliminadas: ' + ', '.join(sorted(resolved)))

    if unexpected:
        print(
            '\nNOVAS repetições não catalogadas: ' + ', '.join(sorted(unexpected)),
            file=sys.stderr,
        )
        return 1 if args.check else 0

    if args.check:
        print('\nResultado: nenhuma nova repetição de nome foi introduzida.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
