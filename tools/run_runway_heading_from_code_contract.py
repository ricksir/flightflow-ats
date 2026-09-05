#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATERIALIZER = ROOT / 'tools' / 'materialize_runway_heading_from_code_contract.py'
TEST = ROOT / 'tests' / 'runway-heading-from-code-contract.test.js'

code = compile(MATERIALIZER.read_text(encoding='utf-8'), str(MATERIALIZER), 'exec')
namespace = {'__name__': '__main__', '__file__': str(MATERIALIZER)}
exec(code, namespace)

text = TEST.read_text(encoding='utf-8')
bad = "\\'use strict\\';"
good = "'use strict';"
if not text.startswith(bad):
    raise SystemExit('prefixo serializado inesperado no contrato runwayHeadingFromCode')
TEST.write_text(good + text[len(bad):], encoding='utf-8')
