#!/usr/bin/env python3
"""Inventory named JavaScript function declarations in FlightFlow HTML and local modules.

This is intentionally a structural guard, not a JavaScript scope analyser. A repeated
name may be legitimate when it lives in a different IIFE/module. The gate only prevents
new repeated declaration names from appearing silently while the monolith is being split.

Local files referenced by <script src="..."> are followed so moving code out of index.html
does not make functions disappear from the architecture inventory.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

KNOWN_REPEATED = {
    'describeEvent',
    'escapeHtml',
    'exportNormalized',
    'init',
    'normalizeSearchText',
    'openDb',
    'parseHistory',
    'stageForProgress',
    'toast',
}

SCRIPT_RE = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.I | re.S)
ID_RE = re.compile(r'\bid=["\']([^"\']+)["\']', re.I)
SRC_RE = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
FUNC_RE = re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(')


def is_local_script(src: str) -> bool:
    parsed = urlparse(src)
    return not parsed.scheme and not parsed.netloc and not src.startswith('//')


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
    missing_local_scripts = []

    for index, match in enumerate(SCRIPT_RE.finditer(text), 1):
        attrs, inline_body = match.group(1), match.group(2)
        id_match = ID_RE.search(attrs)
        src_match = SRC_RE.search(attrs)
        src = src_match.group(1) if src_match else ''
        ident = id_match.group(1) if id_match else (src or f'script-{index}')

        if src and is_local_script(src):
            script_path = path.parent / src
            if not script_path.is_file():
                missing_local_scripts.append(src)
                body = ''
            else:
                body = script_path.read_text(encoding='utf-8', errors='replace')
            start_line = 1
            location_label = src
        elif src:
            body = ''
            start_line = 1
            location_label = src
        else:
            body = inline_body
            start_line = text.count('\n', 0, match.start(2)) + 1
            location_label = str(path)

        functions = []
        for function_match in FUNC_RE.finditer(body):
            name = function_match.group(1)
            line = start_line + body.count('\n', 0, function_match.start())
            declarations[name].append((index, ident, location_label, line))
            functions.append((name, line))

        blocks.append((index, ident, location_label, start_line, len(body.splitlines()), len(functions)))

    repeated = {name: locations for name, locations in declarations.items() if len(locations) > 1}

    print(f'Arquivo: {path}')
    print(f'Blocos script: {len(blocks)}')
    print(f'Declarações function nomeadas: {sum(len(v) for v in declarations.values())}')
    print(f'Nomes únicos: {len(declarations)}')
    print(f'Nomes repetidos: {len(repeated)}')

    print('\nBlocos:')
    for index, ident, location_label, start_line, line_count, function_count in blocks:
        print(
            f'  #{index} {ident}: {location_label}@L{start_line}, '
            f'~{line_count} linhas, {function_count} funções nomeadas'
        )

    print('\nNomes repetidos:')
    for name in sorted(repeated):
        locations = ', '.join(
            f'{ident}({location})@L{line}' for _, ident, location, line in repeated[name]
        )
        print(f'  {name}: {locations}')

    unexpected = set(repeated) - KNOWN_REPEATED
    resolved = KNOWN_REPEATED - set(repeated)

    if resolved:
        print('\nRepetições conhecidas já eliminadas: ' + ', '.join(sorted(resolved)))

    if missing_local_scripts:
        print(
            '\nScripts locais referenciados mas ausentes: ' + ', '.join(sorted(missing_local_scripts)),
            file=sys.stderr,
        )
        if args.check:
            return 1

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
