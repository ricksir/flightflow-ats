from pathlib import Path
import hashlib
import re

INDEX = Path('index.html')
KERNEL_TEST = Path('tests/main-kernel-contract.test.js')
EXPECTED_BYTES = 842
EXPECTED_SHA = 'dd8b4660db04490cee36a8d8754a0026f936cd0859e1737c5c033eb0547520dc'


def extract_function(source: str, name: str):
    match = re.search(rf'(?m)^[ \t]*function[ \t]+{re.escape(name)}[ \t]*\(', source)
    if not match:
        raise SystemExit(f'{name} not found')
    start = match.start()
    brace = source.find('{', match.end())
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


html = INDEX.read_text(encoding='utf-8')
start, end, old_function = extract_function(html, 'updateRealMapAircraft')
frozen = old_function.strip()
frozen_bytes = len(frozen.encode('utf-8'))
frozen_sha = hashlib.sha256(frozen.encode('utf-8')).hexdigest()
if frozen_bytes != EXPECTED_BYTES:
    raise SystemExit(f'unexpected frozen byte count: {frozen_bytes}')
if frozen_sha != EXPECTED_SHA:
    raise SystemExit(f'unexpected frozen sha256: {frozen_sha}')

wiring = '\n'.join([
    '  const RealMapAircraftController = window.FlightFlowRealMapAircraftController;',
    "  if (!RealMapAircraftController) throw new Error('FlightFlowRealMapAircraftController não foi carregado.');",
    '  const { updateRealMapAircraft } = RealMapAircraftController.create({',
    '    realMapState,',
    '    state,',
    '    unprojectGeo,',
    '    updateRealMapCoordinateReadout,',
    '    currentEvent,',
    '    updateGoogleAircraftMarker,',
    '    updateGoogleCompletedRoute,',
    '    followRealMapAircraft,',
    '    updateLeafletAircraftMarker,',
    '    updateLeafletCompletedRoute,',
    '  });',
])

# Important: splice first, while start/end still refer to the original source.
html = html[:start] + wiring + html[end:]
if re.search(r'function\s+updateRealMapAircraft\s*\(', html):
    raise SystemExit('inline updateRealMapAircraft remains in index')

script_anchor = '<script src="src/map/aircraft-follow-controller.js"></script>\n<script src="src/map/aircraft-motion-controller.js"></script>'
script_replacement = '<script src="src/map/aircraft-follow-controller.js"></script>\n<script src="src/map/real-map-aircraft-controller.js"></script>\n<script src="src/map/aircraft-motion-controller.js"></script>'
if html.count(script_anchor) != 1:
    raise SystemExit('script insertion anchor not found exactly once')
html = html.replace(script_anchor, script_replacement, 1)

marker_pos = html.find('const { updateLeafletAircraftMarker, googlePlaneSymbol, updateGoogleAircraftMarker } = AircraftMarkerController.create({')
real_pos = html.find('const { updateRealMapAircraft } = RealMapAircraftController.create({')
state_pos = html.find('const state = {')
if min(marker_pos, real_pos, state_pos) < 0 or not (state_pos < marker_pos < real_pos):
    raise SystemExit('real-map controller wiring order is invalid')

INDEX.write_text(html, encoding='utf-8')

kernel = KERNEL_TEST.read_text(encoding='utf-8')
follow_const = "const EXTRACTED_AIRCRAFT_FOLLOW_CONTROLLER = ['maybeFollowAircraft'];"
real_const = "const EXTRACTED_REAL_MAP_AIRCRAFT_CONTROLLER = ['updateRealMapAircraft'];"
if real_const not in kernel:
    if follow_const not in kernel:
        raise SystemExit('follow extracted list anchor missing')
    kernel = kernel.replace(follow_const, follow_const + '\n' + real_const, 1)

marker_token = "    'const { updateLeafletAircraftMarker, googlePlaneSymbol, updateGoogleAircraftMarker } = AircraftMarkerController.create({',"
real_tokens = '\n'.join([
    "    'const RealMapAircraftController = window.FlightFlowRealMapAircraftController;',",
    "    \"if (!RealMapAircraftController) throw new Error('FlightFlowRealMapAircraftController não foi carregado.');\",",
    "    'const { updateRealMapAircraft } = RealMapAircraftController.create({',",
])
if 'const RealMapAircraftController = window.FlightFlowRealMapAircraftController;' not in kernel:
    if marker_token not in kernel:
        raise SystemExit('marker dependency anchor missing')
    kernel = kernel.replace(marker_token, marker_token + '\n' + real_tokens, 1)

follow_spread = '    ...EXTRACTED_AIRCRAFT_FOLLOW_CONTROLLER,'
real_spread = '    ...EXTRACTED_REAL_MAP_AIRCRAFT_CONTROLLER,'
if real_spread not in kernel:
    if follow_spread not in kernel:
        raise SystemExit('follow spread anchor missing')
    kernel = kernel.replace(follow_spread, follow_spread + '\n' + real_spread, 1)

if 'assert.equal(names.length, 323);' not in kernel or 'assert.equal(counts.size, 323);' not in kernel:
    raise SystemExit('expected pre-extraction function inventory not found')
kernel = kernel.replace('assert.equal(names.length, 323);', 'assert.equal(names.length, 322);', 1)
kernel = kernel.replace('assert.equal(counts.size, 323);', 'assert.equal(counts.size, 322);', 1)

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

print(f'frozen bytes={frozen_bytes} sha256={frozen_sha}')
print(f'kernel bytes={byte_count} lines={line_count} sha256={source_sha}')
