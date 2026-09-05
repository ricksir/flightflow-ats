#!/usr/bin/env python3
"""Move the inline window.__SAMPLE_HISTORY__ definition to src/data/sample-history.js.

Mechanical extraction only: preserve the defining script body verbatim apart from
surrounding blank lines and keep the external script at the same position in index.html.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/data/sample-history.js')
TOKEN = 'window.__SAMPLE_HISTORY__'
ASSIGN_RE = re.compile(r'window\.__SAMPLE_HISTORY__\s*=')
REFERENCE = '<script id="flightflow-sample-history" src="src/data/sample-history.js"></script>'

text = INDEX.read_text(encoding='utf-8')
assignments = list(ASSIGN_RE.finditer(text))

# Idempotent exit is intentional: removing the one-time workflow/tool can cause the
# previous workflow definition to run once more. Consumer reads may still contain TOKEN.
if TARGET.exists() and REFERENCE in text and not assignments:
    print('Sample history já extraído; nada a fazer.')
    raise SystemExit(0)

if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe sem referência externa coerente.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia sample history externo sem arquivo-alvo coerente.')
if len(assignments) != 1:
    raise SystemExit(
        'Esperada exatamente uma atribuição window.__SAMPLE_HISTORY__ = ...; '
        f'encontradas {len(assignments)}.'
    )

assignment_index = assignments[0].start()
open_start = text.rfind('<script', 0, assignment_index)
if open_start < 0:
    raise SystemExit('Abertura <script> da definição de sample history não encontrada.')
open_end = text.find('>', open_start, assignment_index)
if open_end < 0:
    raise SystemExit('Fim da abertura <script> do sample history não encontrado.')
open_end += 1
opening = text[open_start:open_end]
if 'src=' in opening.lower():
    raise SystemExit('Bloco definidor de sample history já possui src; abortando.')

close_start = text.find('</script>', assignment_index)
if close_start < 0:
    raise SystemExit('Fechamento </script> do sample history não encontrado.')
close_end = close_start + len('</script>')
body = text[open_end:close_start].strip('\n') + '\n'

if not ASSIGN_RE.search(body):
    raise SystemExit('A atribuição de sample history não pertence ao bloco selecionado.')
if len(body.strip()) < 20:
    raise SystemExit('Bloco de sample history inesperadamente pequeno.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:open_start] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa de sample history não ficou única.')
if ASSIGN_RE.search(patched):
    raise SystemExit('Definição de sample history permaneceu inline após a extração.')
if TOKEN not in patched:
    print('Aviso: não há consumidores inline restantes de __SAMPLE_HISTORY__.')

before = hashlib.sha256(body.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(TARGET.read_bytes()).hexdigest()
if before != after:
    raise SystemExit('SHA do corpo do sample history mudou durante a extração.')

print(f'Sample history extraído para {TARGET}')
print(f'SHA-256 preservado: {after}')
