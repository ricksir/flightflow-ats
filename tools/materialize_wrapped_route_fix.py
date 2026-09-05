#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARSER = ROOT / 'src' / 'parser' / 'flight-parser.js'
ROUTE = ROOT / 'src' / 'route' / 'route-processed-v7412.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


parser = PARSER.read_text(encoding='utf-8')

anchor = """  function splitTokens(line) {\n    if (!line) return [];\n    return line.trim().split(/\\s+/).map(clean).filter(Boolean);\n  }\n"""
helpers = """

  function wrappedLabeledField(block, label) {
    const escaped = label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const lines = normalizeText(block).split('\\n');
    const pattern = new RegExp(`^\\\\s*${escaped}[ \\t]*:[ \\t]*(.*)$`, 'i');
    for (let index = 0; index < lines.length; index += 1) {
      const match = pattern.exec(lines[index]);
      if (!match) continue;
      const parts = [clean(match[1])];
      for (let next = index + 1; next < lines.length; next += 1) {
        const line = lines[next];
        if (!/^[ \\t]+\\S/.test(line)) break;
        const trimmed = clean(line);
        if (/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .()/_-]{0,48}[ \\t]*:/.test(trimmed)) break;
        parts.push(trimmed);
      }
      return parts.filter(Boolean).join(' ');
    }
    return '';
  }

  function wrappedTag(content, name) {
    const escaped = name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const lines = normalizeText(content).split('\\n');
    const pattern = new RegExp(`^\\\\s*-${escaped}[ \\t]+(.*)$`, 'i');
    for (let index = 0; index < lines.length; index += 1) {
      const match = pattern.exec(lines[index]);
      if (!match) continue;
      const first = clean(match[1]);
      if (/[ \\t]+-[A-Z][A-Z0-9]*[ \\t]/.test(first)) return tag(content, name);
      const parts = [first];
      for (let next = index + 1; next < lines.length; next += 1) {
        const line = lines[next];
        if (/^\\s*-[A-Z][A-Z0-9]*\\b/.test(line)) break;
        if (!/^[ \\t]+\\S/.test(line)) break;
        parts.push(clean(line));
      }
      return parts.filter(Boolean).join(' ');
    }
    return tag(content, name);
  }
"""
parser = replace_once(parser, anchor, anchor + helpers, 'helpers de campo quebrado')
parser = replace_once(
    parser,
    "      route: safeMatch(block, /^Rota[ \\t]*:[ \\t]*(.*)$/mi),",
    "      route: wrappedLabeledField(block, 'Rota'),",
    'Rota de criação',
)
parser = replace_once(
    parser,
    "    const speed = safeMatch(tag(content, 'ROUTE'), /^([KNM][0-9]{4})/i);\n    const idPlano = tag(content, 'IDPLANO') || safeMatch(content, /IDPLANO[\\s/]+([A-Z0-9]+)/i);\n    const rawRoute = tag(content, 'ROUTE');",
    "    const rawRoute = wrappedTag(content, 'ROUTE');\n    const speed = safeMatch(rawRoute, /^([KNM][0-9]{4})/i);\n    const idPlano = tag(content, 'IDPLANO') || safeMatch(content, /IDPLANO[\\s/]+([A-Z0-9]+)/i);",
    '-ROUTE estruturado',
)
version_count = parser.count("parserVersion: '1.1.2'")
if version_count != 2:
    raise SystemExit(f'parserVersion 1.1.2: esperado 2 ocorrências, encontrado {version_count}')
parser = parser.replace("parserVersion: '1.1.2'", "parserVersion: '1.1.3'")
PARSER.write_text(parser, encoding='utf-8')

route = ROUTE.read_text(encoding='utf-8')
route = replace_once(
    route,
    """    const routeMatch=raw.match(/^\\s*Rota\\s*:\\s*(.*?)\\s*$/im);\n    const route=routeMatch?routeMatch[1].trim():'';""",
    """    const routeLines=raw.split('\\n');\n    let route='';\n    for(let i=0;i<routeLines.length;i++){\n      const routeMatch=/^\\s*Rota\\s*:\\s*(.*?)\\s*$/i.exec(routeLines[i]);\n      if(!routeMatch)continue;\n      const parts=[String(routeMatch[1]||'').trim()];\n      for(let j=i+1;j<routeLines.length;j++){\n        const line=routeLines[j];\n        if(!/^\\s+\\S/.test(line))break;\n        const trimmed=String(line).trim();\n        if(/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .()/_-]{0,48}\\s*:/.test(trimmed))break;\n        parts.push(trimmed);\n      }\n      route=parts.filter(Boolean).join(' ');\n      break;\n    }""",
    'Rota Processada campo Rota quebrado',
)
ROUTE.write_text(route, encoding='utf-8')
print('materializado: wrapped Rota + wrapped -ROUTE + route processed; parser 1.1.3')
