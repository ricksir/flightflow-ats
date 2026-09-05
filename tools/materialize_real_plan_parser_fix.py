#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARSER = ROOT / 'src' / 'parser' / 'flight-parser.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


source = PARSER.read_text(encoding='utf-8')

source = replace_once(
    source,
    """  function splitTokens(line) {\n    if (!line) return [];\n    return line.trim().split(/\\s{2,}|\\t+/).map(clean).filter(Boolean);\n  }""",
    """  function splitTokens(line) {\n    if (!line) return [];\n    return line.trim().split(/\\s+/).map(clean).filter(Boolean);\n  }""",
    'splitTokens',
)

source = replace_once(
    source,
    """  function parsePoints(block) {\n    const pointsLine = safeMatch(block, /^PONTOS\\s*:\\s*(.+)$/mi);\n    if (!pointsLine) return null;\n    const points = splitTokens(pointsLine);\n    const etim = splitTokens(safeMatch(block, /^ETIM\\s*:\\s*(.+)$/mi));\n    const cfl = splitTokens(safeMatch(block, /^CFL\\s*:\\s*(.+)$/mi));\n    const rows = points.map((point, i) => ({\n      point,\n      estimate: etim[i] || '',\n      cfl: cfl[i] || ''\n    }));\n    return rows.length ? rows : null;\n  }""",
    """  function parsePoints(block) {\n    const lines = normalizeText(block).split('\\n');\n    const rows = [];\n    for (let index = 0; index < lines.length; index += 1) {\n      const pointsMatch = /^\\s*PONTOS\\s*:\\s*(.+)$/i.exec(lines[index]);\n      if (!pointsMatch) continue;\n      const points = splitTokens(pointsMatch[1]);\n      let cfl = [];\n      let etim = [];\n      for (let offset = 1; offset <= 3 && index + offset < lines.length; offset += 1) {\n        const line = lines[index + offset];\n        if (/^\\s*PONTOS\\s*:/i.test(line)) break;\n        const cflMatch = /^\\s*CFL(?:\\/IFL)?\\s*:\\s*(.+)$/i.exec(line);\n        if (cflMatch) cfl = splitTokens(cflMatch[1]);\n        const etimMatch = /^\\s*ETIM\\s*:\\s*(.+)$/i.exec(line);\n        if (etimMatch) etim = splitTokens(etimMatch[1]);\n      }\n      rows.push(...points.map((point, pointIndex) => ({\n        point,\n        estimate: etim[pointIndex] || '',\n        cfl: cfl[pointIndex] || ''\n      })));\n    }\n    return rows.length ? rows : null;\n  }""",
    'parsePoints',
)

source = replace_once(
    source,
    """    m = /\\(DEP-?([A-Z0-9]+)?-?([A-Z0-9]{4})?([0-9]{4})?/i.exec(content);\n    if (m && m[1]) output.callsign = m[1];""",
    """    m = /\\(DEP[A-Z0-9]{4}\\/[A-Z0-9]{4}\\d{3}-([A-Z0-9]+)-([A-Z0-9]{4})([0-9]{4})-([A-Z0-9]{4})/i.exec(content);\n    if (m) {\n      Object.assign(output, { callsign: m[1], adep: m[2], eobt: m[3], ades: m[4] });\n    } else {\n      m = /\\(DEP-([A-Z0-9]+)-([A-Z0-9]{4})([0-9]{4})-([A-Z0-9]{4})/i.exec(content);\n      if (m) Object.assign(output, { callsign: m[1], adep: m[2], eobt: m[3], ades: m[4] });\n    }""",
    'DEP ICAO/TTY',
)

version_count = source.count("parserVersion: '1.1.1'")
if version_count != 2:
    raise SystemExit(f'versão parser: esperado 2 ocorrências, encontrado {version_count}')
source = source.replace("parserVersion: '1.1.1'", "parserVersion: '1.1.2'")

PARSER.write_text(source, encoding='utf-8')
print('parser materializado: multi-row PONTOS + CFL/IFL + DEP TTY; versão 1.1.2')
