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

path = Path(sys.argv[1] if len(sys.argv) > 1 else 'index.html')
if not path.exists():
    raise SystemExit(f'ERRO: arquivo não encontrado: {path}')

raw = path.read_bytes()
text = raw.decode('utf-8', errors='replace')
styles = re.findall(r'<style\b[^>]*>(.*?)</style>', text, re.I | re.S)
scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', text, re.I | re.S)
external_scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)', text, re.I)
external_links = re.findall(r'<link[^>]+href=["\']([^"\']+)', text, re.I)

print(f'Arquivo: {path}')
print(f'Bytes: {len(raw):,}')
print(f'Linhas: {text.count(chr(10)) + 1:,}')
print(f'SHA-256: {hashlib.sha256(raw).hexdigest()}')
print(f'Blocos style: {len(styles)}')
print(f'Blocos script: {len(scripts)}')
print(f'Script src estático: {len(external_scripts)}')
print(f'Link href estático: {len(external_links)}')

node = shutil.which('node')
if not node:
    print('AVISO: Node.js não encontrado; validação sintática dos scripts foi pulada.')
    raise SystemExit(0)

failures = []
with tempfile.TemporaryDirectory(prefix='flightflow-audit-') as tmp:
    for idx, script in enumerate(scripts, 1):
        candidate = Path(tmp) / f'script-{idx}.js'
        candidate.write_text(script, encoding='utf-8')
        proc = subprocess.run([node, '--check', str(candidate)], capture_output=True, text=True)
        status = 'OK' if proc.returncode == 0 else 'ERRO'
        print(f'JavaScript #{idx}: {status}')
        if proc.returncode:
            failures.append((idx, proc.stderr.strip()))

if failures:
    print('\nFalhas de sintaxe:')
    for idx, error in failures:
        print(f'--- script #{idx} ---\n{error}')
    raise SystemExit(1)

print('Resultado: auditoria estática aprovada.')
