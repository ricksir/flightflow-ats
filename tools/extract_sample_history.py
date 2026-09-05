#!/usr/bin/env python3
"""Move the inline window.__SAMPLE_HISTORY__ script to src/data/sample-history.js.

Mechanical extraction only: preserve the script body verbatim apart from surrounding
blank lines and keep the external script at the same position in index.html.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/data/sample-history.js')
TOKEN = 'window.__SAMPLE_HISTORY__'
REFERENCE = '<script id="flightflow-sample-history" src="src/data/sample-history.js"></script>'

text = INDEX.read_text(encoding='utf-8')

# Idempotent exit is intentional: deleting the one-time workflow/tool may trigger the
# old workflow definition once more. In that case, the already-extracted state is valid.
if TARGET.exists() and REFERENCE in text and TOKEN not in text:
    print('Sample history já extraído; nada a fazer.')
    raise SystemExit(0)

if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe sem referência externa coerente.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia sample history externo sem arquivo-alvo coerente.')
if text.count(TOKEN) != 1:
    raise SystemExit(f'Esperado exatamente um {TOKEN}; encontrado {text.count(TOKEN)}.')

token_index = text.index(TOKEN)
open_start = text.rfind('<script', 0, token_index)
if open_start < 0:
    raise SystemExit('Abertura <script> do sample history não encontrada.')
open_end = text.find('>', open_start, token_index)
if open_end < 0:
    raise SystemExit('Fim da abertura <script> do sample history não encontrado.')
open_end += 1
opening = text[open_start:open_end]
if 'src=' in opening.lower():
    raise SystemExit('Bloco de sample history já possui src; abortando.')

close_start = text.find('</script>', token_index)
if close_start < 0:
    raise SystemExit('Fechamento </script> do sample history não encontrado.')
close_end = close_start + len('</script>')
body = text[open_end:close_start].strip('\n') + '\n'

if TOKEN not in body:
    raise SystemExit('Token de sample history não pertence ao bloco de script selecionado.')
if len(body.strip()) < 20:
    raise SystemExit('Bloco de sample history inesperadamente pequeno.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:open_start] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa de sample history não ficou única.')
if TOKEN in patched:
    raise SystemExit('Implementação de sample history permaneceu inline após a extração.')

before = hashlib.sha256(body.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(TARGET.read_bytes()).hexdigest()
if before != after:
    raise SystemExit('SHA do corpo do sample history mudou durante a extração.')

print(f'Sample history extraído para {TARGET}')
print(f'SHA-256 preservado: {after}')
