#!/usr/bin/env python3
"""Move the inline Route Processed v7.4.12 block to src/route/.

Mechanical extraction only: the JavaScript body is preserved verbatim apart from
surrounding blank lines. The start/end HTML markers and script id are retained.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/route/route-processed-v7412.js')
START = '<!-- flightflow-route-processed-v7412:start -->'
END = '<!-- flightflow-route-processed-v7412:end -->'
REFERENCE = '<script id="flightflow-route-processed-v7412" src="src/route/route-processed-v7412.js"></script>'

text = INDEX.read_text(encoding='utf-8')
if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe; extração não deve ser executada duas vezes.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia a Rota Processada externa.')

start_marker = text.find(START)
end_marker = text.find(END, start_marker + len(START))
if start_marker < 0 or end_marker < 0:
    raise SystemExit('Marcadores da Rota Processada v7.4.12 não encontrados.')

segment_start = start_marker + len(START)
segment = text[segment_start:end_marker]
opening = re.search(r'<script\b([^>]*)\bid=["\']flightflow-route-processed-v7412["\']([^>]*)>', segment, re.I)
if not opening:
    raise SystemExit('Script id=flightflow-route-processed-v7412 não encontrado entre os marcadores.')
attrs = (opening.group(1) or '') + (opening.group(2) or '')
if re.search(r'\bsrc\s*=', attrs, re.I):
    raise SystemExit('Bloco da Rota Processada já possui src; abortando.')

body_start = segment_start + opening.end()
close_start = text.find('</script>', body_start)
if close_start < 0 or close_start > end_marker:
    raise SystemExit('Fechamento </script> da Rota Processada não encontrado.')
close_end = close_start + len('</script>')
body = text[body_start:close_start].strip('\n') + '\n'

checks = {
    'IIFE start': "(() => {" in body,
    'version': "const VERSION = '7.4.12';" in body,
    'double-init guard': 'if (window.FlightFlowRouteProcessedV7412) return;' in body,
    'public API': 'function publicApi()' in body,
    'global API assignment': 'window.FlightFlowRouteProcessedV7412=publicApi();' in body,
    'critical transition API': 'transitionPlanForEvents' in body and 'transitionDurations' in body,
    'initialization hook': "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);" in body,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Rota Processada não passou nas pré-condições: ' + ', '.join(failed))

if text.count('id="flightflow-route-processed-v7412"') != 1:
    raise SystemExit('Esperado exatamente um script id flightflow-route-processed-v7412.')
if text.count('window.FlightFlowRouteProcessedV7412=publicApi();') != 1:
    raise SystemExit('Esperado exatamente um ponto de publicação da API antes da extração.')

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:body_start - opening.end()]  # placeholder guard; rebuilt below

# Rebuild only the script element between the existing comments.
absolute_open_start = segment_start + opening.start()
patched = text[:absolute_open_start] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa da Rota Processada não ficou única.')
if 'window.FlightFlowRouteProcessedV7412=publicApi();' in patched:
    raise SystemExit('Implementação da Rota Processada permaneceu inline no index.html.')
if patched.count(START) != 1 or patched.count(END) != 1:
    raise SystemExit('Marcadores de fronteira foram alterados indevidamente.')

before = hashlib.sha256(text.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(INDEX.read_bytes()).hexdigest()
module_hash = hashlib.sha256(TARGET.read_bytes()).hexdigest()

print(f'Rota Processada v7.4.12 extraída para {TARGET}')
print(f'index.html: {before} -> {after}')
print(f'{TARGET}: {module_hash}')
