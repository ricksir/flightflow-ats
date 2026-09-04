#!/usr/bin/env python3
"""Auditoria estática mínima do FlightFlow sem dependências Python externas."""
from __future__ import annotations
import hashlib
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

path = Path(sys.argv[1] if len(sys.argv) > 1 else 'index.html')
if not path.exists():
    raise SystemExit(f'ERRO: arquivo não encontrado: {path}')

raw = path.read_bytes()
text = raw.decode('utf-8', errors='replace')
styles = re.findall(r'<style\b[^>]*>(.*?)</style>', text, re.I | re.S)
script_matches = list(re.finditer(r'<script\b([^>]*)>(.*?)</script>', text, re.I | re.S))
external_scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)', text, re.I)
external_links = re.findall(r'<link[^>]+href=["\']([^"\']+)', text, re.I)

print(f'Arquivo: {path}')
print(f'Bytes: {len(raw):,}')
print(f'Linhas: {text.count(chr(10)) + 1:,}')
print(f'SHA-256: {hashlib.sha256(raw).hexdigest()}')
print(f'Blocos style: {len(styles)}')
print(f'Blocos script: {len(script_matches)}')
print(f'Script src estático: {len(external_scripts)}')
print(f'Link href estático: {len(external_links)}')

node = shutil.which('node')
if not node:
    print('AVISO: Node.js não encontrado; validação sintática dos scripts foi pulada.')
    raise SystemExit(0)

failures = []
with tempfile.TemporaryDirectory(prefix='flightflow-audit-') as tmp:
    inline_index = 0
    for block_index, match in enumerate(script_matches, 1):
        attrs, body = match.group(1), match.group(2)
        if re.search(r'\bsrc=["\']', attrs, re.I):
            continue
        inline_index += 1
        candidate = Path(tmp) / f'inline-{inline_index}.js'
        candidate.write_text(body, encoding='utf-8')
        proc = subprocess.run([node, '--check', str(candidate)], capture_output=True, text=True)
        status = 'OK' if proc.returncode == 0 else 'ERRO'
        print(f'JavaScript inline #{block_index}: {status}')
        if proc.returncode:
            failures.append((f'inline #{block_index}', proc.stderr.strip()))

    for src in external_scripts:
        parsed = urlparse(src)
        if parsed.scheme or parsed.netloc or src.startswith('//'):
            print(f'JavaScript externo remoto {src}: NÃO VALIDADO')
            continue
        candidate = path.parent / src
        if not candidate.is_file():
            print(f'JavaScript externo {src}: AUSENTE')
            failures.append((src, 'arquivo local referenciado não existe'))
            continue
        proc = subprocess.run([node, '--check', str(candidate)], capture_output=True, text=True)
        status = 'OK' if proc.returncode == 0 else 'ERRO'
        print(f'JavaScript externo {src}: {status}')
        if proc.returncode:
            failures.append((src, proc.stderr.strip()))

if failures:
    print('\nFalhas de sintaxe:')
    for label, error in failures:
        print(f'--- {label} ---\n{error}')
    raise SystemExit(1)

print('Resultado: auditoria estática aprovada.')
