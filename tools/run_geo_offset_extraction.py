#!/usr/bin/env python3
from pathlib import Path

materializer = Path(__file__).with_name('materialize_geo_offset_extraction.py')
text = materializer.read_text(encoding='utf-8')
old = """# Atualiza mecanicamente aliases congelados em outros contratos.\nalias_tests = []\nfor path in sorted(TESTS.glob('*.test.js')):\n    text = path.read_text(encoding='utf-8')\n    if OLD_ALIAS in text:\n        text = text.replace(OLD_ALIAS, NEW_ALIAS)\n        path.write_text(text, encoding='utf-8')\n        alias_tests.append(path.name)\n"""
new = """# Atualiza mecanicamente aliases congelados em outros contratos, inclusive asserts que congelam só o fragmento sem `const`.\nalias_tests = []\nold_alias_fragment = OLD_ALIAS.removeprefix('const ')\nnew_alias_fragment = NEW_ALIAS.removeprefix('const ')\nfor path in sorted(TESTS.glob('*.test.js')):\n    text = path.read_text(encoding='utf-8')\n    if old_alias_fragment in text:\n        text = text.replace(old_alias_fragment, new_alias_fragment)\n        path.write_text(text, encoding='utf-8')\n        alias_tests.append(path.name)\n"""
if text.count(old) != 1:
    raise SystemExit(f'runner: bloco de aliases esperado uma vez, encontrado {text.count(old)}')
text = text.replace(old, new, 1)
code = compile(text, str(materializer), 'exec')
exec(code, {'__name__': '__main__', '__file__': str(materializer)})
