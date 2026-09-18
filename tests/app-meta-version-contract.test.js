'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('Sobre o programa acompanha a versão de desenvolvimento do projeto', () => {
  const match = HTML.match(/const APP_META = Object\.freeze\(\{[\s\S]*?version:\s*'([^']+)'[\s\S]*?\}\);/);
  assert.ok(match, 'APP_META deve declarar a versão exibida');
  assert.equal(match[1], PKG.version);
  assert.notEqual(match[1], '7.3.2');
  assert.match(HTML, /aboutAppName\.textContent = `\$\{APP_META\.name\} v\$\{APP_META\.version\}`/);
});

test('Configurações oferecem o preset visual de referência sem remover claro/escuro', () => {
  assert.match(HTML, /id="themeDarkBtn"/);
  assert.match(HTML, /id="themeLightBtn"/);
  assert.match(HTML, /id="themeVeloxBtn"/);
  assert.match(HTML, /setTheme\('velox'\)/);
});


test('Identidade institucional usa FlightFlow ATS como produto e mantém contexto secundário', () => {
  assert.match(HTML, /name:\s*'FlightFlow ATS'/);
  assert.match(HTML, /contextLabel:\s*'Ferramenta de análise operacional ATS'/);
  assert.match(HTML, /developerCredit:\s*'Desenvolvimento: 2S BCO Richard'/);
  assert.doesNotMatch(HTML, /FlightFlow ATS - TIOP Cindacta1/);
  assert.match(HTML, /appCredit\.textContent = APP_META\.contextLabel/);
  assert.match(HTML, /aboutDeveloper\.textContent = APP_META\.developerCredit/);
});
