#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATERIALIZER = ROOT / 'tools' / 'materialize_runway_heading_from_code_extraction.py'

text = MATERIALIZER.read_text(encoding='utf-8')
old = '''    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid', 'runwayTokens', 'runwayHeading'\\n];",
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid', 'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode'\\n];",
'''
new = '''    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid',\\n  'runwayTokens', 'runwayHeading'\\n];",
    "  'normalizeCoordinateInput', 'validAerodromeCoordinate', 'formatGeoCoord', 'atsCoordinateLabel', 'groundCentroid',\\n  'runwayTokens', 'runwayHeading', 'runwayHeadingFromCode'\\n];",
'''
if text.count(old) != 1:
    raise SystemExit(f'bloco de lista esperado não encontrado de modo inequívoco: {text.count(old)}')
text = text.replace(old, new, 1)

code = compile(text, str(MATERIALIZER), 'exec')
namespace = {'__name__': '__main__', '__file__': str(MATERIALIZER)}
exec(code, namespace)
