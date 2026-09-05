#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATERIALIZER = ROOT / 'tools' / 'materialize_polygon_geo_centroid_extraction.py'
text = MATERIALIZER.read_text(encoding='utf-8')

old_constants = """OLD_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode } = CoordinateUtils;'\nNEW_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;'\n"""
new_constants = old_constants + """OLD_BARE_ALIAS = '{ normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode } = CoordinateUtils;'\nNEW_BARE_ALIAS = '{ normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;'\n"""
if text.count(old_constants) != 1:
    raise SystemExit(f'constantes de alias: esperado 1 bloco, encontrado {text.count(old_constants)}')
text = text.replace(old_constants, new_constants, 1)

old_loop = """for path in sorted((ROOT / 'tests').glob('*.test.js')):\n    text = path.read_text(encoding='utf-8')\n    if OLD_ALIAS in text:\n        path.write_text(text.replace(OLD_ALIAS, NEW_ALIAS), encoding='utf-8')\n"""
new_loop = """for path in sorted((ROOT / 'tests').glob('*.test.js')):\n    text = path.read_text(encoding='utf-8')\n    changed = text\n    if OLD_ALIAS in changed:\n        changed = changed.replace(OLD_ALIAS, NEW_ALIAS)\n    if OLD_BARE_ALIAS in changed:\n        changed = changed.replace(OLD_BARE_ALIAS, NEW_BARE_ALIAS)\n    if changed != text:\n        path.write_text(changed, encoding='utf-8')\n"""
if text.count(old_loop) != 1:
    raise SystemExit(f'loop de migração de alias: esperado 1 bloco, encontrado {text.count(old_loop)}')
text = text.replace(old_loop, new_loop, 1)

code = compile(text, str(MATERIALIZER), 'exec')
exec(code, {'__name__': '__main__', '__file__': str(MATERIALIZER)})
