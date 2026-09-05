#!/usr/bin/env python3
"""Move the inline FIR layers IIFE to src/map/fir-layers.js.

Mechanical extraction only. The JavaScript body is preserved verbatim apart from
surrounding blank lines, and the external script is inserted at the same position.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/map/fir-layers.js')
MARKER = '/* FlightFlow v7.3.5 — camadas FIR selecionáveis e persistentes */'
REFERENCE = '<script id="flightflow-fir-layers" src="src/map/fir-layers.js"></script>'

text = INDEX.read_text(encoding='utf-8')
if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe; extração não deve ser executada duas vezes.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia a camada FIR externa.')
if text.count(MARKER) != 1:
    raise SystemExit(f'Esperado exatamente um marcador FIR; encontrado {text.count(MARKER)}.')

marker_index = text.index(MARKER)
open_start = text.rfind('<script', 0, marker_index)
if open_start < 0:
    raise SystemExit('Abertura <script> da camada FIR não encontrada.')
open_end = text.find('>', open_start, marker_index)
if open_end < 0:
    raise SystemExit('Fim da abertura <script> da camada FIR não encontrado.')
open_end += 1
opening = text[open_start:open_end]
if 'src=' in opening.lower():
    raise SystemExit('Camada FIR encontrada já possui src; abortando.')

close_start = text.find('</script>', marker_index)
if close_start < 0:
    raise SystemExit('Fechamento </script> da camada FIR não encontrado.')
close_end = close_start + len('</script>')
body = text[open_end:close_start].strip('\n') + '\n'

bridge_assignment = 'window.__FlightFlowFirBridge = Object.freeze({'
if bridge_assignment not in text[:open_start]:
    raise SystemExit('A ponte window.__FlightFlowFirBridge não é publicada antes da camada FIR.')

checks = {
    'marker': MARKER in body,
    'IIFE': '(() => {' in body,
    'bridge consumer': 'const bridge=window.__FlightFlowFirBridge;' in body,
    'bridge guard': "if(!bridge){console.error('[FlightFlow FIR] Ponte do mapa indisponível.');return;}" in body,
    'storage key': "const FIR_STORAGE_KEY='flightflow-manual-firs-v1';" in body,
    'Brasilia FIR': 'SBBSZQZX' in body,
    'Amazonico FIR': 'SBAZZQZX' in body,
    'Curitiba FIR': 'SBCWZQZX' in body,
    'Recife FIR': 'SBREZQZX' in body,
    'public renderer': 'window.renderManualFirLayers=renderManualFirLayers;' in body,
    'storage listener': "window.addEventListener('storage'" in body,
    'DOMContentLoaded': "document.addEventListener('DOMContentLoaded'" in body,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Camada FIR não passou nas pré-condições: ' + ', '.join(failed))

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:open_start] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa FIR não ficou única.')
if MARKER in patched:
    raise SystemExit('Implementação FIR permaneceu inline após a extração.')
if bridge_assignment not in patched:
    raise SystemExit('Publicação da ponte FIR foi alterada indevidamente.')
if patched.index(bridge_assignment) > patched.index(REFERENCE):
    raise SystemExit('A referência FIR passou a carregar antes da ponte.')

before = hashlib.sha256(text.encode('utf-8')).hexdigest()
INDEX.write_text(patched, encoding='utf-8')
after = hashlib.sha256(INDEX.read_bytes()).hexdigest()
module_hash = hashlib.sha256(TARGET.read_bytes()).hexdigest()

print(f'Camada FIR extraída para {TARGET}')
print(f'index.html: {before} -> {after}')
print(f'{TARGET}: {module_hash}')
