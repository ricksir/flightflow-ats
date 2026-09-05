#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


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

playback_ref = '<script id="flightflow-playback-controller" src="src/timeline/playback-controller.js"></script>'
transport_ref = '<script id="flightflow-transport-navigation-controller" src="src/timeline/transport-navigation-controller.js"></script>'
if transport_ref in html:
    raise SystemExit('referência do transport controller já existe; materializador é one-shot')
html = replace_once(html, playback_ref, playback_ref + '\n' + transport_ref, 'inserção do script externo')

playback_start = '  const { startPlayback, stopPlayback, togglePlayback, scheduleNext } = PlaybackController.create({'
start_index = html.find(playback_start)
if start_index < 0:
    raise SystemExit('instanciação do PlaybackController não encontrada')
close_index = html.find('\n  });', start_index)
if close_index < 0:
    raise SystemExit('fim da instanciação do PlaybackController não encontrado')
close_end = close_index + len('\n  });')
transport_integration = """

  const TransportNavigationController = window.FlightFlowTransportNavigationController;
  if (!TransportNavigationController) throw new Error('FlightFlowTransportNavigationController não foi carregado.');
  const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({
    state,
    getScrubber: () => els.scrubber,
    stopPlayback: () => stopPlayback(),
    snapMotionTo: progress => snapMotionTo(progress),
    goTo: (index, options) => goTo(index, options),
  });"""
html = html[:close_end] + transport_integration + html[close_end:]

bindings = {
    "els.restartBtn.addEventListener('click', () => { stopPlayback(); snapMotionTo(0); goTo(0, { silent: true }); });":
        "els.restartBtn.addEventListener('click', restartTransport);",
    "els.prevBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index - 1); });":
        "els.prevBtn.addEventListener('click', previousTransport);",
    "els.nextBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index + 1); });":
        "els.nextBtn.addEventListener('click', nextTransport);",
    "els.scrubber.addEventListener('input', () => { stopPlayback(); goTo(Number(els.scrubber.value)); });":
        "els.scrubber.addEventListener('input', scrubTransport);",
}
for old, new in bindings.items():
    html = replace_once(html, old, new, f'binding {new}')

INDEX.write_text(html, encoding='utf-8')

kernel = kernel_source(html)
expected_bytes = len(kernel.encode('utf-8'))
expected_lines = kernel.count('\n')
expected_sha = hashlib.sha256(kernel.encode('utf-8')).hexdigest()

test_source = KERNEL_TEST.read_text(encoding='utf-8')
test_source = re.sub(r"const EXPECTED_BYTES = \d+;", f"const EXPECTED_BYTES = {expected_bytes};", test_source, count=1)
test_source = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", test_source, count=1)
test_source = re.sub(r"const EXPECTED_LINES = \d+;", f"const EXPECTED_LINES = {expected_lines};", test_source, count=1)

transport_list = "const EXTRACTED_TRANSPORT = ['restartTransport', 'previousTransport', 'nextTransport', 'scrubTransport'];"
if transport_list not in test_source:
    test_source = replace_once(
        test_source,
        "const EXTRACTED_PLAYBACK = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];",
        "const EXTRACTED_PLAYBACK = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];\n" + transport_list,
        'lista de extração transport',
    )

integration_tokens = """    'const TransportNavigationController = window.FlightFlowTransportNavigationController;',
    \"if (!TransportNavigationController) throw new Error('FlightFlowTransportNavigationController não foi carregado.');\",
    'const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({',
"""
if 'const TransportNavigationController = window.FlightFlowTransportNavigationController;' not in test_source:
    test_source = replace_once(
        test_source,
        "    'const { startPlayback, stopPlayback, togglePlayback, scheduleNext } = PlaybackController.create({',\n",
        "    'const { startPlayback, stopPlayback, togglePlayback, scheduleNext } = PlaybackController.create({',\n" + integration_tokens,
        'tokens de integração transport',
    )

if '...EXTRACTED_TRANSPORT,' not in test_source:
    test_source = replace_once(
        test_source,
        '    ...EXTRACTED_PLAYBACK,\n',
        '    ...EXTRACTED_PLAYBACK,\n    ...EXTRACTED_TRANSPORT,\n',
        'inventário de extração transport',
    )

test_source = test_source.replace(
    'após seis extrações puras e o primeiro corte de timeline',
    'após seis extrações puras e dois cortes de timeline',
)
KERNEL_TEST.write_text(test_source, encoding='utf-8')

print(f'index bytes: {len(html.encode("utf-8"))}')
print(f'kernel bytes: {expected_bytes}')
print(f'kernel lines: {expected_lines}')
print(f'kernel sha256: {expected_sha}')
print('materialização concluída')
