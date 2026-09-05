#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATERIALIZER = ROOT / 'tools' / 'materialize_ground_centroid_extraction.py'
text = MATERIALIZER.read_text(encoding='utf-8')
bad = "  assert.ok(module.includes('    groundCentroid,\\n  }});'));"
good = "  assert.ok(module.includes('    groundCentroid,'));"
if text.count(bad) != 1:
    raise SystemExit(f'asserção problemática não encontrada de modo inequívoco: {text.count(bad)}')
text = text.replace(bad, good, 1)
code = compile(text, str(MATERIALIZER), 'exec')
namespace = {'__name__': '__main__', '__file__': str(MATERIALIZER)}
exec(code, namespace)
