#!/usr/bin/env python3
"""Move the inline FlightFlow AI/governance engine to src/ai/ai-engine.js.

Mechanical extraction only: preserve the engine body exactly (apart from trimming
surrounding blank lines and terminating with one newline) and replace its inline
<script> with an external script at the same logical position.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

INDEX = Path('index.html')
TARGET = Path('src/ai/ai-engine.js')
DECLARATION = "const AI_ENGINE_VERSION = '1.3.2';"
REFERENCE = '<script id="flightflow-ai-engine" src="src/ai/ai-engine.js"></script>'
EXPECTED_BYTES = 165965
EXPECTED_SHA256 = '304326300500423f81e250208a5c4eca839b76fb07e5c16c9fa0b30d6689bcd9'

text = INDEX.read_text(encoding='utf-8')

if TARGET.exists() and REFERENCE in text and DECLARATION not in text:
    print('AI engine já extraído; nada a fazer.')
    raise SystemExit(0)
if TARGET.exists():
    raise SystemExit(f'{TARGET} já existe sem referência externa coerente.')
if REFERENCE in text:
    raise SystemExit('index.html já referencia AI engine externo sem arquivo-alvo coerente.')
if text.count(DECLARATION) != 1:
    raise SystemExit(
        'Esperada exatamente uma declaração de AI_ENGINE_VERSION 1.3.2; '
        f'encontradas {text.count(DECLARATION)}.'
    )

token_index = text.index(DECLARATION)
open_start = text.rfind('<script', 0, token_index)
if open_start < 0:
    raise SystemExit('Abertura <script> do AI engine não encontrada.')
open_end = text.find('>', open_start, token_index)
if open_end < 0:
    raise SystemExit('Fim da abertura <script> do AI engine não encontrado.')
open_end += 1
opening = text[open_start:open_end]
if 'src=' in opening.lower():
    raise SystemExit('Bloco do AI engine já possui src; abortando.')

close_start = text.find('</script>', token_index)
if close_start < 0:
    raise SystemExit('Fechamento </script> do AI engine não encontrado.')
close_end = close_start + len('</script>')
body = text[open_end:close_start].strip('\n') + '\n'
body_bytes = body.encode('utf-8')
body_sha = hashlib.sha256(body_bytes).hexdigest()

if len(body_bytes) != EXPECTED_BYTES:
    raise SystemExit(f'Tamanho inesperado do AI engine: {len(body_bytes)} != {EXPECTED_BYTES}.')
if body_sha != EXPECTED_SHA256:
    raise SystemExit(f'SHA inesperado do AI engine: {body_sha} != {EXPECTED_SHA256}.')

checks = {
    'IIFE start': body.startswith("(function () {\n  'use strict';"),
    'IIFE end': body.rstrip().endswith('})();'),
    'version': DECLARATION in body,
    'model schema': 'const MODEL_SCHEMA_VERSION = 1;' in body,
    'model key': "const MODEL_KEY = 'flightflow-ai-governance-v1';" in body,
    'audit key': "const AUDIT_KEY = 'flightflow-ai-audit-v1';" in body,
    'settings key': "const SETTINGS_KEY = 'flightflow-ai-settings-v1';" in body,
    'manual DB': "const MANUAL_DB_NAME = 'FlightFlowAIBrain';" in body,
    'knowledge publication': 'window.__flightflowKnowledgeEntries =' in body,
    'public API': 'window.__flightflowAI = Object.freeze({' in body,
    'session reset listener': "document.addEventListener('flightflow:history-session-reset'" in body,
    'DOMContentLoaded': "document.addEventListener('DOMContentLoaded', bindDom, { once: true })" in body,
    'self-test API': 'runSelfTests' in body,
}
for method in [
    'analyzeRaw','parseHistory','runSelfTests','getModel','getCurrentAnalysis',
    'expectedNextMessages','inferCycleState','answerQuestion','buildReport',
    'getManualBrain','searchManuals','normativeSupport','findMessageAnywhereAfter',
    'applyFalsePositiveMask','getConfirmedErrors','getFalsePositives',
    'resetCurrentSession','refreshReviewUI'
]:
    checks[f'public method {method}'] = method in body
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('AI engine não passou nas pré-condições: ' + ', '.join(failed))

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(body, encoding='utf-8')
patched = text[:open_start] + REFERENCE + text[close_end:]

if patched.count(REFERENCE) != 1:
    raise SystemExit('Referência externa do AI engine não ficou única.')
if DECLARATION in patched:
    raise SystemExit('Declaração do AI engine permaneceu inline após a extração.')

INDEX.write_text(patched, encoding='utf-8')
written = TARGET.read_bytes()
if len(written) != EXPECTED_BYTES or hashlib.sha256(written).hexdigest() != EXPECTED_SHA256:
    raise SystemExit('Arquivo externo do AI engine não preservou bytes/SHA esperados.')

print(f'AI engine extraído para {TARGET}')
print(f'Bytes preservados: {len(written):,}')
print(f'SHA-256 preservado: {hashlib.sha256(written).hexdigest()}')
