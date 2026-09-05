#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'
EXPECTED_HANDLER_BYTES = 883
EXPECTED_HANDLER_SHA256 = 'f058462894b9f87a35c322eacf64c1047bea1579beac1821d789c25a6016b560'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def scan_function(text: str, marker: str) -> tuple[int, int, str]:
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'função não encontrada: {marker}')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit('abertura da função não encontrada')
    depth = 0
    mode = 'code'
    quote = ''
    escaped = False
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if mode == 'line':
            if c == '\n':
                mode = 'code'
            i += 1
            continue
        if mode == 'block':
            if c == '*' and n == '/':
                mode = 'code'
                i += 2
                continue
            i += 1
            continue
        if mode == 'string':
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                mode = 'code'
            i += 1
            continue
        if mode == 'template':
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == '`':
                mode = 'code'
            i += 1
            continue
        if c == '/' and n == '/':
            mode = 'line'
            i += 2
            continue
        if c == '/' and n == '*':
            mode = 'block'
            i += 2
            continue
        if c in ('"', "'"):
            mode = 'string'
            quote = c
            i += 1
            continue
        if c == '`':
            mode = 'template'
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1, text[start:i + 1]
        i += 1
    raise SystemExit('fim da função não encontrado')


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    anchor_index = html.find(anchor)
    if anchor_index < 0:
        raise SystemExit('ponte FIR não encontrada')
    script_start = html.rfind('<script', 0, anchor_index)
    body_start = html.find('>', script_start) + 1
    body_end = html.find('</script>', anchor_index)
    if script_start < 0 or body_start <= script_start or body_end <= body_start:
        raise SystemExit('IIFE principal não pôde ser delimitado')
    return html[body_start:body_end].strip('\n') + '\n'


html = INDEX.read_text(encoding='utf-8')

transport_ref = '<script id="flightflow-transport-navigation-controller" src="src/timeline/transport-navigation-controller.js"></script>'
keyboard_ref = '<script id="flightflow-keyboard-navigation-controller" src="src/timeline/keyboard-navigation-controller.js"></script>'
if keyboard_ref in html:
    raise SystemExit('referência do keyboard controller já existe; materializador é one-shot')
html = replace_once(html, transport_ref, transport_ref + '\n' + keyboard_ref, 'inserção do script externo')

marker = 'function handleKeyboard(event) {'
handler_start, handler_end, handler = scan_function(html, marker)
handler_bytes = len(handler.encode('utf-8'))
handler_sha = hashlib.sha256(handler.encode('utf-8')).hexdigest()
if handler_bytes != EXPECTED_HANDLER_BYTES or handler_sha != EXPECTED_HANDLER_SHA256:
    raise SystemExit(f'handleKeyboard divergiu do contrato: {handler_bytes} bytes / {handler_sha}')
line_start = handler_start
while line_start > 0 and html[line_start - 1] in (' ', '\t'):
    line_start -= 1
line_end = handler_end
if line_end < len(html) and html[line_end] == '\n':
    line_end += 1
html = html[:line_start] + html[line_end:]

transport_start = '  const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({'
start_index = html.find(transport_start)
if start_index < 0:
    raise SystemExit('instanciação do TransportNavigationController não encontrada')
close_index = html.find('\n  });', start_index)
if close_index < 0:
    raise SystemExit('fim da instanciação do TransportNavigationController não encontrado')
close_end = close_index + len('\n  });')
keyboard_integration = """

  const KeyboardNavigationController = window.FlightFlowKeyboardNavigationController;
  if (!KeyboardNavigationController) throw new Error('FlightFlowKeyboardNavigationController não foi carregado.');
  const { handleKeyboard } = KeyboardNavigationController.create({
    state,
    isTargetEditable: target => target.matches('input, textarea, select, [contenteditable=\"true\"]'),
    hasOpenDialog: () => Boolean(document.querySelector('dialog[open]')),
    togglePlayback: () => togglePlayback(),
    stopPlayback: () => stopPlayback(),
    goTo: (index, options) => goTo(index, options),
    showExactMessage: () => showExactMessage(),
    toggleFpv: () => toggleFpv(),
    toggleStrip: () => toggleStrip(),
  });"""
html = html[:close_end] + keyboard_integration + html[close_end:]

if html.count("document.addEventListener('keydown', handleKeyboard);") != 1:
    raise SystemExit('binding global de teclado deve permanecer exatamente uma vez')
if marker in kernel_source(html):
    raise SystemExit('handleKeyboard inline permaneceu no núcleo')
INDEX.write_text(html, encoding='utf-8')

kernel = kernel_source(html)
expected_bytes = len(kernel.encode('utf-8'))
expected_lines = kernel.count('\n')
expected_sha = hashlib.sha256(kernel.encode('utf-8')).hexdigest()

test_source = KERNEL_TEST.read_text(encoding='utf-8')
test_source = re.sub(r"const EXPECTED_BYTES = \d+;", f"const EXPECTED_BYTES = {expected_bytes};", test_source, count=1)
test_source = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", test_source, count=1)
test_source = re.sub(r"const EXPECTED_LINES = \d+;", f"const EXPECTED_LINES = {expected_lines};", test_source, count=1)

keyboard_list = "const EXTRACTED_KEYBOARD = ['handleKeyboard'];"
if keyboard_list not in test_source:
    test_source = replace_once(
        test_source,
        "const EXTRACTED_TRANSPORT = ['restartTransport', 'previousTransport', 'nextTransport', 'scrubTransport'];",
        "const EXTRACTED_TRANSPORT = ['restartTransport', 'previousTransport', 'nextTransport', 'scrubTransport'];\n" + keyboard_list,
        'lista de extração keyboard',
    )

if 'const KeyboardNavigationController = window.FlightFlowKeyboardNavigationController;' not in test_source:
    test_source = replace_once(
        test_source,
        "    'const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({',\n",
        "    'const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({',\n"
        "    'const KeyboardNavigationController = window.FlightFlowKeyboardNavigationController;',\n"
        "    \"if (!KeyboardNavigationController) throw new Error('FlightFlowKeyboardNavigationController não foi carregado.');\",\n"
        "    'const { handleKeyboard } = KeyboardNavigationController.create({',\n",
        'tokens de integração keyboard',
    )

if '...EXTRACTED_KEYBOARD,' not in test_source:
    test_source = replace_once(
        test_source,
        '    ...EXTRACTED_TRANSPORT,\n',
        '    ...EXTRACTED_TRANSPORT,\n    ...EXTRACTED_KEYBOARD,\n',
        'inventário de extração keyboard',
    )

test_source = test_source.replace(
    'após seis extrações puras e dois cortes de timeline',
    'após seis extrações puras e três cortes de timeline',
)
test_source = test_source.replace('assert.equal(names.length, 351);', 'assert.equal(names.length, 350);')
test_source = test_source.replace('assert.equal(counts.size, 351);', 'assert.equal(counts.size, 350);')
KERNEL_TEST.write_text(test_source, encoding='utf-8')

print(f'handler verificado: {handler_bytes} bytes / {handler_sha}')
print(f'index bytes: {len(html.encode("utf-8"))}')
print(f'kernel bytes: {expected_bytes}')
print(f'kernel lines: {expected_lines}')
print(f'kernel sha256: {expected_sha}')
print('materialização concluída')
