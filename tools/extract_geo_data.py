#!/usr/bin/env python3
"""Move the inline window.__FLIGHTFLOW_GEO_DATA__ definition to src/data/geo-data.js.

Mechanical extraction only. The defining script body is preserved byte-for-byte apart
from normalizing surrounding blank lines exactly as done in prior module extractions.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/data/geo-data.js')
ASSIGN_RE = re.compile(r'window\.__FLIGHTFLOW_GEO_DATA__\s*=')
REFERENCE = '<script id="flightflow-geo-data" src="src/data/geo-data.js"></script>'

text = INDEX.read_text(encoding='utf-8')
assignments = list(ASSIGN_RE.finditer(text))

if TARGET.exists() and REFERENCE in text and not assignments:
    print('Geo data já extraído; nada a fazer.')
    raise SystemExit(0)

if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe sem referência externa coerente.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia geo data externo sem arquivo-alvo coerente.')
if len(assignments) != 1:
    raise SystemExit(
        'Esperada exatamente uma atribuição window.__FLIGHTFLOW_GEO_DATA__ = ...; '
        f'encontradas {len(assignments)}.'
    )

assignment_index = assignments[0].start()
open_start = text.rfind('<script', 0, assignment_index)
if open_start < 0:
    raise SystemExit('Abertura <script> da definição geográfica não encontrada.')
open_end = text.find('>', open_start, assignment_index)
if open_end < 0:
    raise SystemExit('Fim da abertura <script> da base geográfica não encontrado.')
open_end += 1
opening = text[open_start:open_end]
if 'src=' in opening.lower():
    raise SystemExit('Bloco definidor de geo data já possui src; abortando.')

close_start = text.find('</script>', assignment_index)
if close_start < 0:
    raise SystemExit('Fechamento </script> da base geográfica não encontrado.')
close_end = close_start + len('</script>')
body = text[open_end:close_start].strip('\n') + '\n'

if not ASSIGN_RE.search(body):
    raise SystemExit('A atribuição geográfica não pertence ao bloco selecionado.')
if len(body.strip()) < 100:
    raise SystemExit('Base geográfica inesperadamente pequena.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:open_start] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa de geo data não ficou única.')
if ASSIGN_RE.search(patched):
    raise SystemExit('Definição de geo data permaneceu inline após a extração.')

before = hashlib.sha256(body.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(TARGET.read_bytes()).hexdigest()
if before != after:
    raise SystemExit('SHA do corpo geográfico mudou durante a extração.')

print(f'Base geográfica extraída para {TARGET}')
print(f'Bytes do módulo: {TARGET.stat().st_size:,}')
print(f'SHA-256 preservado: {after}')
