#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'index.html'
NAMES = ('runwayTokens', 'runwayHeading', 'runwayHeadingFromCode')
CONTROL_WORDS = {'if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super'}


def kernel_source(html: str) -> str:
    anchor = 'window.__FlightFlowFirBridge = Object.freeze({'
    pos = html.find(anchor)
    if pos < 0: raise SystemExit('ponte FIR não encontrada')
    open_pos = html.rfind('<script', 0, pos)
    body_start = html.find('>', open_pos) + 1
    close_pos = html.find('</script>', pos)
    return html[body_start:close_pos]


def function_source(container: str, name: str) -> str:
    marker = f'  function {name}('
    start = container.find(marker)
    if start < 0:
        raise SystemExit(f'{name} não encontrada')
    brace = container.find('{', start)
    depth = 0
    quote = None
    escaped = False
    for i in range(brace, len(container)):
        c = container[i]
        if quote:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: quote = None
            continue
        if c in "'\"`": quote = c; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return container[start:i + 1]
    raise SystemExit(f'fim de {name} não encontrado')


kernel = kernel_source(HTML.read_text(encoding='utf-8'))
for name in NAMES:
    source = function_source(kernel, name)
    raw_calls = [m.group(1) for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', source)]
    calls = sorted(set(x for x in raw_calls if x != name and x not in CONTROL_WORDS))
    consumers = len(re.findall(rf'(?<![\w$.]){name}\s*\(', kernel)) - 1
    forbidden = [token for token in ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','goTo(','renderCurrent(','stopPlayback(','fetch('] if token in source]
    print(
        f'{name}: bytes={len(source.encode("utf-8"))}; lines={source.count(chr(10))+1}; '
        f'sha={hashlib.sha256(source.encode("utf-8")).hexdigest()}; calls={calls}; '
        f'consumers={consumers}; forbidden={forbidden}'
    )
