#!/usr/bin/env python3
"""Move the existing inline FlightParser UMD block to src/parser/flight-parser.js.

This is a mechanical extraction only. It preserves the parser source verbatim apart
from trimming surrounding blank lines and replaces the inline block with a static
<script src="..."> reference in the same position.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/parser/flight-parser.js')
REFERENCE = '<script src="src/parser/flight-parser.js"></script>'

text = INDEX.read_text(encoding='utf-8')
if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe; extração não deve ser executada duas vezes.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia o FlightParser externo.')

opening = re.search(r'<script\b([^>]*)>\s*(?=\(function \(root, factory\) \{)', text, re.I)
if not opening:
    raise SystemExit('Bloco UMD do FlightParser não encontrado.')
if re.search(r'\bsrc\s*=', opening.group(1), re.I):
    raise SystemExit('Bloco encontrado já possui src; abortando.')

close_start = text.find('</script>', opening.end())
if close_start < 0:
    raise SystemExit('Fechamento </script> do FlightParser não encontrado.')
close_end = close_start + len('</script>')

body = text[opening.end():close_start].strip('\n') + '\n'
checks = {
    'UMD factory': '(function (root, factory) {' in body,
    'CommonJS export': "if (typeof module === 'object' && module.exports) module.exports = api;" in body,
    'browser global': 'if (root) root.FlightParser = api;' in body,
    'parser function': 'function parseHistory' in body,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('FlightParser não passou nas pré-condições: ' + ', '.join(failed))

if text.count('if (root) root.FlightParser = api;') != 1:
    raise SystemExit('Esperado exatamente um export global FlightParser no index.html.')
if text.count('const Parser = window.FlightParser;') != 1:
    raise SystemExit('Contrato do consumidor principal não está único/esperado.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:opening.start()] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa do parser não ficou única.')
if 'if (root) root.FlightParser = api;' in patched:
    raise SystemExit('Código do parser permaneceu inline após a extração.')
if patched.count('const Parser = window.FlightParser;') != 1:
    raise SystemExit('Consumidor window.FlightParser foi alterado pela extração.')

before = hashlib.sha256(text.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(INDEX.read_bytes()).hexdigest()
parser_hash = hashlib.sha256(TARGET.read_bytes()).hexdigest()

print(f'FlightParser extraído para {TARGET}')
print(f'index.html: {before} -> {after}')
print(f'{TARGET}: {parser_hash}')
