#!/usr/bin/env python3
"""Move the inline FlightFlow Secure Storage IIFE to src/storage/secure-storage.js.

Mechanical extraction only: preserve the JavaScript body verbatim apart from surrounding
blank lines and replace the original script element at the same position with a local src.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/storage/secure-storage.js')
SCRIPT_ID = 'flightflow-secure-storage-module'
REFERENCE = '<script id="flightflow-secure-storage-module" src="src/storage/secure-storage.js"></script>'

text = INDEX.read_text(encoding='utf-8')
if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe; extração não deve ser executada duas vezes.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia o Secure Storage externo.')

pattern = re.compile(r'<script\b([^>]*)\bid=["\']flightflow-secure-storage-module["\']([^>]*)>', re.I)
opening = pattern.search(text)
if not opening:
    raise SystemExit('Script flightflow-secure-storage-module não encontrado.')
attrs = (opening.group(1) or '') + (opening.group(2) or '')
if re.search(r'\bsrc\s*=', attrs, re.I):
    raise SystemExit('Secure Storage já possui src; abortando.')
if len(pattern.findall(text)) != 1:
    raise SystemExit('Esperado exatamente um script Secure Storage inline.')

body_start = opening.end()
close_start = text.find('</script>', body_start)
if close_start < 0:
    raise SystemExit('Fechamento </script> do Secure Storage não encontrado.')
close_end = close_start + len('</script>')
body = text[body_start:close_start].strip('\n') + '\n'

checks = {
    'IIFE': "(() => {" in body,
    'product id': "const PRODUCT_ID = 'FlightFlow';" in body,
    'app version': "const APP_VERSION = 'FINAL-OFICIAL-SECURE-1.1';" in body,
    'schema version': 'const SCHEMA_VERSION = 1;' in body,
    'database name': "const DB_NAME = 'FlightFlowSecureDB';" in body,
    'public API': 'window.FlightFlowStorage=Object.freeze({' in body,
    'scheduleSnapshot API': 'scheduleSnapshot' in body,
    'saveHistory API': 'saveHistory' in body,
    'external history restore hooks': "typeof selectFile==='function'" in body and "typeof loadFile==='function'" in body,
    'auto init': "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();" in body,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Secure Storage não passou nas pré-condições: ' + ', '.join(failed))

if text.count('window.FlightFlowStorage=Object.freeze({') != 1:
    raise SystemExit('Esperado exatamente um ponto de publicação FlightFlowStorage antes da extração.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:opening.start()] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa do Secure Storage não ficou única.')
if 'window.FlightFlowStorage=Object.freeze({' in patched:
    raise SystemExit('Implementação do Secure Storage permaneceu inline no index.html.')

before = hashlib.sha256(text.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(INDEX.read_bytes()).hexdigest()
module_hash = hashlib.sha256(TARGET.read_bytes()).hexdigest()

print(f'Secure Storage extraído para {TARGET}')
print(f'index.html: {before} -> {after}')
print(f'{TARGET}: {module_hash}')
