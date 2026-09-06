from pathlib import Path
import hashlib
import re

INDEX = Path('index.html')
KERNEL_TEST = Path('tests/main-kernel-contract.test.js')
MODULE = Path('src/map/motion-transition-planner.js')


def extract_function(source: str, name: str):
    match = re.search(rf'(?m)^[ \t]*function[ \t]+{re.escape(name)}[ \t]*\(', source)
    if not match:
        raise SystemExit(f'{name} not found')
    start = match.start()
    open_paren = source.find('(', match.start())
    close_paren = source.find(')', open_paren + 1)
    if open_paren < 0 or close_paren <= open_paren:
        raise SystemExit(f'{name} signature not found')
    brace = source.find('{', close_paren + 1)
    if brace < 0:
        raise SystemExit(f'{name} opening brace not found')

    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1, source[start:i + 1]
        i += 1
    raise SystemExit(f'{name} closing brace not found')


if not MODULE.exists():
    raise SystemExit('motion transition planner module is missing')

html = INDEX.read_text(encoding='utf-8')

# Freeze the pre-extraction responsibility: all these tokens must still be inside goTo.
go_start, go_end, old_go = extract_function(html, 'goTo')
for token in (
    'api.transitionPlanForEvents(state.index, nextIndex)',
    'api.transitionDurations(plan, state.speed, state.playing)',
    "mode:'waypoints'",
    'steps:waypointPlan.steps',
    'stepStart:performance.now()',
    'state.motion.velocity = 0;',
    'state.index = nextIndex;',
    'renderCurrent(options);',
):
    if token not in old_go:
        raise SystemExit(f'pre-extraction goTo contract missing: {token}')

comment_start = old_go.find('    // v7.4.12: transição orientada pelos fixos/ETIM.')
index_commit = old_go.find('    state.index = nextIndex;')
if comment_start < 0 or index_commit <= comment_start:
    raise SystemExit('goTo transition block boundaries not found')
replacement = '\n'.join([
    '    // v7.4.12: transição orientada pelos fixos/ETIM. Se o intervalo entre dois eventos',
    '    // cruza vários pontos (ex.: 78 → 79), cada ponto vira uma etapa obrigatória da animação.',
    '    if (state.motion) planMotionTransition(nextIndex);',
    '',
])
new_go = old_go[:comment_start] + replacement + old_go[index_commit:]
for forbidden in ('transitionPlanForEvents', 'transitionDurations', 'ffrpTransition', 'performance.now()', 'console.warn'):
    if forbidden in new_go:
        raise SystemExit(f'planner detail remains inside goTo: {forbidden}')
if 'if (state.motion) planMotionTransition(nextIndex);' not in new_go:
    raise SystemExit('goTo delegation not installed')

html = html[:go_start] + new_go + html[go_end:]

# Wire the planner immediately before goTo, after state has already been initialized.
wiring_anchor = '  function goTo(index, options = {}) {'
wiring = '\n'.join([
    '  const MotionTransitionPlanner = window.FlightFlowMotionTransitionPlanner;',
    "  if (!MotionTransitionPlanner) throw new Error('FlightFlowMotionTransitionPlanner não foi carregado.');",
    '  const { planMotionTransition } = MotionTransitionPlanner.create({',
    '    state,',
    '    getRouteProcessedApi: () => window.FlightFlowRouteProcessedV7412,',
    '    now: () => performance.now(),',
    '    warn: (...args) => console.warn(...args),',
    '  });',
    '',
])
if html.count(wiring_anchor) != 1:
    raise SystemExit('goTo wiring anchor not found exactly once')
if 'const MotionTransitionPlanner = window.FlightFlowMotionTransitionPlanner;' in html:
    raise SystemExit('MotionTransitionPlanner wiring already present')
html = html.replace(wiring_anchor, wiring + wiring_anchor, 1)

# Load the planner before the motion controller and before the main kernel.
script_anchor = '<script src="src/map/real-map-aircraft-controller.js"></script>\n<script src="src/map/aircraft-motion-controller.js"></script>'
script_replacement = '<script src="src/map/real-map-aircraft-controller.js"></script>\n<script src="src/map/motion-transition-planner.js"></script>\n<script src="src/map/aircraft-motion-controller.js"></script>'
if html.count(script_anchor) != 1:
    raise SystemExit('planner script insertion anchor not found exactly once')
html = html.replace(script_anchor, script_replacement, 1)

state_pos = html.find('const state = {')
planner_pos = html.find('const MotionTransitionPlanner = window.FlightFlowMotionTransitionPlanner;')
go_pos = html.find('function goTo(index, options = {})')
script_pos = html.find('src/map/motion-transition-planner.js')
main_iife_pos = html.find('(function () {', script_pos + 1)
if min(state_pos, planner_pos, go_pos, script_pos, main_iife_pos) < 0:
    raise SystemExit('planner integration positions could not be resolved')
if not (script_pos < main_iife_pos and state_pos < planner_pos < go_pos):
    raise SystemExit('planner load/wiring order is invalid')

INDEX.write_text(html, encoding='utf-8')

# Extend the main-kernel contract with the new explicit dependency and recompute identity.
kernel = KERNEL_TEST.read_text(encoding='utf-8')
motion_const = "const EXTRACTED_AIRCRAFT_MOTION_CONTROLLER = ['resetMotionController', 'motionRoute', 'applyMotionFrame', 'snapMotionTo', 'startMotionLoop'];"
planner_const = "const EXTRACTED_MOTION_TRANSITION_PLANNER = ['planMotionTransition'];"
if planner_const not in kernel:
    if motion_const not in kernel:
        raise SystemExit('aircraft motion extracted-list anchor missing')
    kernel = kernel.replace(motion_const, motion_const + '\n' + planner_const, 1)

motion_token = "    'const { resetMotionController, motionRoute, applyMotionFrame, snapMotionTo, startMotionLoop } = AircraftMotionController.create({',"
planner_tokens = '\n'.join([
    "    'const MotionTransitionPlanner = window.FlightFlowMotionTransitionPlanner;',",
    "    \"if (!MotionTransitionPlanner) throw new Error('FlightFlowMotionTransitionPlanner não foi carregado.');\",",
    "    'const { planMotionTransition } = MotionTransitionPlanner.create({',",
])
if 'const MotionTransitionPlanner = window.FlightFlowMotionTransitionPlanner;' not in kernel:
    if motion_token not in kernel:
        raise SystemExit('aircraft motion dependency anchor missing')
    kernel = kernel.replace(motion_token, motion_token + '\n' + planner_tokens, 1)

motion_spread = '    ...EXTRACTED_AIRCRAFT_MOTION_CONTROLLER,'
planner_spread = '    ...EXTRACTED_MOTION_TRANSITION_PLANNER,'
if planner_spread not in kernel:
    if motion_spread not in kernel:
        raise SystemExit('aircraft motion extracted spread anchor missing')
    kernel = kernel.replace(motion_spread, motion_spread + '\n' + planner_spread, 1)

if 'assert.equal(names.length, 322);' not in kernel or 'assert.equal(counts.size, 322);' not in kernel:
    raise SystemExit('unexpected main-kernel function inventory before planner extraction')

anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
anchor_index = html.find(anchor)
open_index = html.rfind('<script', 0, anchor_index)
body_start = html.find('>', open_index) + 1
close_index = html.find('</script>', anchor_index)
if min(anchor_index, open_index, close_index) < 0 or body_start <= open_index:
    raise SystemExit('main kernel boundaries not found')
source = html[body_start:close_index].strip('\n') + '\n'
byte_count = len(source.encode('utf-8'))
line_count = len(source.splitlines())
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()
kernel = re.sub(r'const EXPECTED_BYTES = \d+;', f'const EXPECTED_BYTES = {byte_count};', kernel, count=1)
kernel = re.sub(r"const EXPECTED_SHA256 = '[0-9a-f]{64}';", f"const EXPECTED_SHA256 = '{source_sha}';", kernel, count=1)
kernel = re.sub(r'const EXPECTED_LINES = \d+;', f'const EXPECTED_LINES = {line_count};', kernel, count=1)
KERNEL_TEST.write_text(kernel, encoding='utf-8')

print('MotionTransitionPlanner extraction applied')
print(f'goTo before={len(old_go.encode("utf-8"))} bytes after={len(new_go.encode("utf-8"))} bytes')
print(f'kernel bytes={byte_count} lines={line_count} sha256={source_sha}')
