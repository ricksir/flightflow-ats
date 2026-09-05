#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).with_name('materialize_airport_ground_query_extraction.py')
lines = path.read_text(encoding='utf-8').splitlines(keepends=True)
inside_airport_test = False
patched = []
closed = False
for line in lines:
    if line.startswith("airport_test = r'''\\'use strict\\';"):
        patched.append('airport_test = r"""\'use strict\';\n')
        inside_airport_test = True
        continue
    if inside_airport_test and line.strip() == "'''":
        patched.append('"""\n')
        inside_airport_test = False
        closed = True
        continue
    if "airport_test = airport_test.replace(" in line and "use strict" in line:
        continue
    patched.append(line)

if not closed:
    raise SystemExit('runner: fechamento do bloco airport_test não foi localizado')
source = ''.join(patched)
compile(source, str(path), 'exec')
exec(compile(source, str(path), 'exec'), {'__name__': '__main__', '__file__': str(path)})
