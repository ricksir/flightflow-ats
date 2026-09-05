#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATERIALIZER = ROOT / 'tools' / 'materialize_runway_geometry_extraction.py'
RUNWAY_TEST = ROOT / 'tests' / 'runway-geometry-contract.test.js'

text = MATERIALIZER.read_text(encoding='utf-8')
old = """post_kernel = kernel_source(html)\nfor name, (_, _, _, exp_consumers) in EXPECTED.items():\n    if f'function {name}(' in post_kernel:\n        raise SystemExit(f'{name} continua inline')\n    consumers = len(re.findall(rf'(?<![\\w$.]){name}\\s*\\(', post_kernel))\n    if consumers != exp_consumers:\n        raise SystemExit(f'{name}: consumidores mudaram após extração: {consumers}')\n"""
new = """post_kernel = kernel_source(html)\npost_kernel_consumers = {'runwayTokens': 3, 'runwayHeading': 1}\nobserved_kernel_consumers = {}\nfor name in EXPECTED:\n    if f'function {name}(' in post_kernel:\n        raise SystemExit(f'{name} continua inline')\n    consumers = len(re.findall(rf'(?<![\\w$.]){name}\\s*\\(', post_kernel))\n    observed_kernel_consumers[name] = consumers\n    if consumers != post_kernel_consumers[name]:\n        raise SystemExit(f'{name}: consumidores externos mudaram após extração: {consumers}')\ninternal_runway_tokens = len(re.findall(r'(?<![\\w$.])runwayTokens\\s*\\(', sources['runwayHeading']))\nif observed_kernel_consumers['runwayTokens'] + internal_runway_tokens != EXPECTED['runwayTokens'][3]:\n    raise SystemExit('runwayTokens: total de consumidores não foi preservado entre kernel e módulo')\n"""
if text.count(old) != 1:
    raise SystemExit(f'bloco pós-corte esperado não encontrado: {text.count(old)}')
text = text.replace(old, new, 1)

code = compile(text, str(MATERIALIZER), 'exec')
namespace = {'__name__': '__main__', '__file__': str(MATERIALIZER)}
exec(code, namespace)

# O contrato pré-corte descontava a própria declaração inline. Após externalizar,
# o kernel contém apenas consumidores externos; runwayHeading mantém a quarta
# chamada a runwayTokens dentro do módulo.
test = RUNWAY_TEST.read_text(encoding='utf-8')
old_consumer = """    const consumers = [...kernel.matchAll(new RegExp(`(?<![\\\\w$.])${name}\\\\s*\\\\(`, 'g'))].length - 1;\n    assert.equal(consumers, expected.consumers);\n    assert.ok(consumers >= 1);\n"""
new_consumer = """    const consumers = [...kernel.matchAll(new RegExp(`(?<![\\\\w$.])${name}\\\\s*\\\\(`, 'g'))].length;\n    const expectedKernelConsumers = name === 'runwayTokens' ? 3 : expected.consumers;\n    assert.equal(consumers, expectedKernelConsumers);\n    assert.ok(consumers >= 1);\n    if (name === 'runwayTokens') {\n      const headingSource = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeading');\n      const internalConsumers = [...headingSource.matchAll(/(?<![\\w$.])runwayTokens\\s*\\(/g)].length;\n      assert.equal(consumers + internalConsumers, expected.consumers);\n    }\n"""
if test.count(old_consumer) != 1:
    raise SystemExit(f'bloco de consumidores do contrato não encontrado: {test.count(old_consumer)}')
test = test.replace(old_consumer, new_consumer, 1)
old_final = "    assert.equal(consumers, expected.consumers);\n"
new_final = "    assert.equal(consumers, name === 'runwayTokens' ? 3 : expected.consumers);\n"
if test.count(old_final) != 1:
    raise SystemExit(f'asserção final de consumidores não encontrada de modo inequívoco: {test.count(old_final)}')
test = test.replace(old_final, new_final, 1)
RUNWAY_TEST.write_text(test, encoding='utf-8')
