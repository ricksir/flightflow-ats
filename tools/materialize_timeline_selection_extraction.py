#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

INLINE = '''  function updateTimelineSelection() {
    const items = els.timelineList.querySelectorAll('.timeline-item');
    items.forEach(item => item.classList.toggle('active', Number(item.dataset.eventIndex) === state.index));
    const active = els.timelineList.querySelector('.timeline-item.active');
    if (active && document.querySelector('[data-panel="timeline"]').classList.contains('active')) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }'''
INLINE_BYTES = 461
INLINE_SHA256 = 'de1f5864d3d8dbd3fc528e194671c2529ca1b434785cc7b833814995e1e82b70'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    index = html.find(anchor)
    if index < 0:
        raise SystemExit('ponte FIR não encontrada')
    script_open = html.rfind('<script', 0, index)
    body_start = html.find('>', script_open) + 1
    script_close = html.find('</script>', index)
    if script_open < 0 or body_start <= script_open or script_close <= body_start:
        raise SystemExit('IIFE principal não delimitado')
    return html[body_start:script_close].strip('\n') + '\n'


inline_bytes = len(INLINE.encode('utf-8'))
inline_sha = hashlib.sha256(INLINE.encode('utf-8')).hexdigest()
if inline_bytes != INLINE_BYTES or inline_sha != INLINE_SHA256:
    raise SystemExit(f'identidade declarada do inline divergiu: {inline_bytes} bytes / {inline_sha}')

html = HTML.read_text(encoding='utf-8')
if html.count(INLINE) != 1:
    raise SystemExit(f'updateTimelineSelection inline: esperado 1, encontrado {html.count(INLINE)}')

keyboard_ref = '<script id="flightflow-keyboard-navigation-controller" src="src/timeline/keyboard-navigation-controller.js"></script>'
timeline_ref = '<script id="flightflow-timeline-selection-controller" src="src/timeline/timeline-selection-controller.js"></script>'
html = replace_once(
    html,
    keyboard_ref + '\n<script>',
    keyboard_ref + '\n' + timeline_ref + '\n<script>',
    'referência de script timeline-selection',
)

keyboard_block = '''  const KeyboardNavigationController = window.FlightFlowKeyboardNavigationController;
  if (!KeyboardNavigationController) throw new Error('FlightFlowKeyboardNavigationController não foi carregado.');
  const { handleKeyboard } = KeyboardNavigationController.create({
    state,
    isTargetEditable: target => target.matches('input, textarea, select, [contenteditable="true"]'),
    hasOpenDialog: () => Boolean(document.querySelector('dialog[open]')),
    togglePlayback: () => togglePlayback(),
    stopPlayback: () => stopPlayback(),
    goTo: (index, options) => goTo(index, options),
    showExactMessage: () => showExactMessage(),
    toggleFpv: () => toggleFpv(),
    toggleStrip: () => toggleStrip(),
  });'''

timeline_block = '''

  const TimelineSelectionController = window.FlightFlowTimelineSelectionController;
  if (!TimelineSelectionController) throw new Error('FlightFlowTimelineSelectionController não foi carregado.');
  const { updateTimelineSelection } = TimelineSelectionController.create({
    state,
    getTimelineList: () => els.timelineList,
    isTimelinePanelActive: () => document.querySelector('[data-panel="timeline"]').classList.contains('active'),
  });'''

html = replace_once(html, keyboard_block, keyboard_block + timeline_block, 'wiring timeline-selection')
html = replace_once(html, '\n' + INLINE + '\n', '\n', 'remoção inline updateTimelineSelection')

if 'function updateTimelineSelection()' in kernel_source(html):
    raise SystemExit('declaração inline ainda presente após materialização')
if html.count('updateTimelineSelection();') != 2:
    raise SystemExit(f'consumidores updateTimelineSelection: esperado 2, encontrado {html.count("updateTimelineSelection();")}')
HTML.write_text(html, encoding='utf-8')

contract = KERNEL_TEST.read_text(encoding='utf-8')
contract = replace_once(
    contract,
    "const EXTRACTED_KEYBOARD = ['handleKeyboard'];",
    "const EXTRACTED_KEYBOARD = ['handleKeyboard'];\nconst EXTRACTED_TIMELINE_SELECTION = ['updateTimelineSelection'];",
    'lista extraída timeline-selection',
)
contract = replace_once(
    contract,
    "    'const { handleKeyboard } = KeyboardNavigationController.create({',\n    \"name: 'FlightFlow ATS - TIOP Cindacta1'\",",
    "    'const { handleKeyboard } = KeyboardNavigationController.create({',\n    'const TimelineSelectionController = window.FlightFlowTimelineSelectionController;',\n    \"if (!TimelineSelectionController) throw new Error('FlightFlowTimelineSelectionController não foi carregado.');\",\n    'const { updateTimelineSelection } = TimelineSelectionController.create({',\n    \"name: 'FlightFlow ATS - TIOP Cindacta1'\",",
    'dependência externa timeline-selection',
)
contract = replace_once(
    contract,
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e três cortes de timeline', () => {",
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e quatro cortes de timeline', () => {",
    'título inventário',
)
contract = replace_once(contract, '  assert.equal(names.length, 350);', '  assert.equal(names.length, 349);', 'contagem funções')
contract = replace_once(contract, '  assert.equal(counts.size, 350);', '  assert.equal(counts.size, 349);', 'contagem nomes')
contract = replace_once(
    contract,
    '    ...EXTRACTED_KEYBOARD,\n  ]) {',
    '    ...EXTRACTED_KEYBOARD,\n    ...EXTRACTED_TIMELINE_SELECTION,\n  ]) {',
    'spread timeline-selection',
)

source = kernel_source(html)
expected_bytes = len(source.encode('utf-8'))
expected_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()
expected_lines = source.count('\n')
contract = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', contract, count=1)
contract = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", contract, count=1)
contract = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', contract, count=1)
KERNEL_TEST.write_text(contract, encoding='utf-8')

print(f'materializado: timeline selection extraída; núcleo {expected_bytes} bytes / {expected_lines} linhas / {expected_sha}')
