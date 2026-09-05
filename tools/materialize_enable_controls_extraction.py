#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
KERNEL_TEST = ROOT / 'tests' / 'main-kernel-contract.test.js'

INLINE = '''  function enableControls(enabled) {
    ['exportBtn','showProtocolBtn','exactMessageBtn','copySummaryBtn','restartBtn','prevBtn','playBtn','nextBtn','scrubber','speedSelect','soundBtn','fpvToggleBtn','stripToggleBtn']
      .forEach(id => { els[id].disabled = !enabled; });
    if (enabled && state.parsed) {
      const lastIndex = Math.max(0, state.parsed.events.length - 1);
      els.scrubber.max = String(lastIndex);
      els.endTimeLabel.textContent = state.parsed.events[state.parsed.events.length - 1].time || '--:--:--';
      els.prevBtn.disabled = state.index <= 0;
      els.nextBtn.disabled = state.index >= lastIndex;
    } else {
      els.scrubber.max = '0';
      els.endTimeLabel.textContent = '--:--:--';
    }
  }'''
INLINE_BYTES = 735
INLINE_SHA256 = 'b2c9ff65b7a232e97418752d8007ffe0d12e615388b330ebc62b7faff79ab605'


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
    raise SystemExit(f'enableControls inline: esperado 1, encontrado {html.count(INLINE)}')

timeline_ref = '<script id="flightflow-timeline-selection-controller" src="src/timeline/timeline-selection-controller.js"></script>'
control_ref = '<script id="flightflow-control-state-controller" src="src/timeline/control-state-controller.js"></script>'
html = replace_once(
    html,
    timeline_ref + '\n<script>',
    timeline_ref + '\n' + control_ref + '\n<script>',
    'referência de script control-state',
)

timeline_block = '''  const TimelineSelectionController = window.FlightFlowTimelineSelectionController;
  if (!TimelineSelectionController) throw new Error('FlightFlowTimelineSelectionController não foi carregado.');
  const { updateTimelineSelection } = TimelineSelectionController.create({
    state,
    getTimelineList: () => els.timelineList,
    isTimelinePanelActive: () => document.querySelector('[data-panel="timeline"]').classList.contains('active'),
  });'''

control_block = '''

  const ControlStateController = window.FlightFlowControlStateController;
  if (!ControlStateController) throw new Error('FlightFlowControlStateController não foi carregado.');
  const { enableControls } = ControlStateController.create({
    state,
    getElements: () => els,
  });'''

html = replace_once(html, timeline_block, timeline_block + control_block, 'wiring control-state')
html = replace_once(html, '\n' + INLINE + '\n', '\n', 'remoção inline enableControls')

source = kernel_source(html)
if 'function enableControls(' in source:
    raise SystemExit('declaração inline enableControls ainda presente após materialização')
if html.count(control_ref) != 1:
    raise SystemExit(f'referência control-state: esperado 1, encontrado {html.count(control_ref)}')
if html.count('ControlStateController.create({') != 1:
    raise SystemExit('wiring ControlStateController deve existir exatamente uma vez')
HTML.write_text(html, encoding='utf-8')

contract = KERNEL_TEST.read_text(encoding='utf-8')
contract = replace_once(
    contract,
    "const EXTRACTED_TIMELINE_SELECTION = ['updateTimelineSelection'];",
    "const EXTRACTED_TIMELINE_SELECTION = ['updateTimelineSelection'];\nconst EXTRACTED_CONTROL_STATE = ['enableControls'];",
    'lista extraída control-state',
)
contract = replace_once(
    contract,
    "    'const { updateTimelineSelection } = TimelineSelectionController.create({',\n    \"name: 'FlightFlow ATS - TIOP Cindacta1'\",",
    "    'const { updateTimelineSelection } = TimelineSelectionController.create({',\n    'const ControlStateController = window.FlightFlowControlStateController;',\n    \"if (!ControlStateController) throw new Error('FlightFlowControlStateController não foi carregado.');\",\n    'const { enableControls } = ControlStateController.create({',\n    \"name: 'FlightFlow ATS - TIOP Cindacta1'\",",
    'dependência externa control-state',
)
contract = replace_once(
    contract,
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e quatro cortes de timeline', () => {",
    "test('inventário interno do núcleo mantém nomes únicos após seis extrações puras e cinco cortes de timeline', () => {",
    'título inventário',
)
contract = replace_once(contract, '  assert.equal(names.length, 349);', '  assert.equal(names.length, 348);', 'contagem funções')
contract = replace_once(contract, '  assert.equal(counts.size, 349);', '  assert.equal(counts.size, 348);', 'contagem nomes')
contract = replace_once(
    contract,
    '    ...EXTRACTED_TIMELINE_SELECTION,\n  ]) {',
    '    ...EXTRACTED_TIMELINE_SELECTION,\n    ...EXTRACTED_CONTROL_STATE,\n  ]) {',
    'spread control-state',
)
contract = replace_once(
    contract,
    "  assert.equal(counts.get('enableControls'), 1, 'enableControls deve permanecer inline neste corte');\n",
    '',
    'assert inline enableControls',
)

expected_bytes = len(source.encode('utf-8'))
expected_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()
expected_lines = source.count('\n')
contract = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {expected_bytes};', contract, count=1)
contract = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]+';", f"const EXPECTED_SHA256 = '{expected_sha}';", contract, count=1)
contract = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {expected_lines};', contract, count=1)
KERNEL_TEST.write_text(contract, encoding='utf-8')

print(f'materializado: enableControls extraído; núcleo {expected_bytes} bytes / {expected_lines} linhas / {expected_sha}')
