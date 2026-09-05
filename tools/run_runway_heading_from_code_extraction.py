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

OLD_ALIAS = '{ normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;'
NEW_ALIAS = '{ normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode } = CoordinateUtils;'

def replace_exact(path: Path, old_text: str, new_text: str, label: str):
    source = path.read_text(encoding='utf-8')
    count = source.count(old_text)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    path.write_text(source.replace(old_text, new_text, 1), encoding='utf-8')

# Contrato de groundCentroid continua validando os mesmos dois consumidores;
# apenas acompanha a ampliação explícita do alias de CoordinateUtils.
replace_exact(
    ROOT / 'tests' / 'ground-centroid-contract.test.js',
    OLD_ALIAS,
    NEW_ALIAS,
    'alias groundCentroid',
)

# O contrato do cluster de pista foi criado antes do congelamento específico de
# runwayHeadingFromCode. Após este corte, ele deve confirmar a nova localização
# sem enfraquecer as garantias de runwayTokens/runwayHeading.
runway_contract = ROOT / 'tests' / 'runway-geometry-contract.test.js'
replace_exact(
    runway_contract,
    "  assert.ok(kernel.includes('function runwayHeadingFromCode('));",
    "  assert.equal(kernel.includes('function runwayHeadingFromCode('), false);\n  assert.ok(module.includes('function runwayHeadingFromCode('));\n  assert.ok(module.includes('    runwayHeadingFromCode,'));",
    'localização runwayHeadingFromCode no contrato runway geometry',
)
# O materializador já pode ter atualizado este alias genericamente; só o altere
# se ainda estiver na forma anterior.
source = runway_contract.read_text(encoding='utf-8')
if OLD_ALIAS in source:
    replace_exact(runway_contract, OLD_ALIAS, NEW_ALIAS, 'alias runway geometry')
elif NEW_ALIAS not in source:
    raise SystemExit('runway geometry: alias esperado não encontrado')

print('contratos afetados migrados: ground-centroid + runway-geometry')
