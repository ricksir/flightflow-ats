'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';

const EXPECTED = Object.freeze({
  aircraftPixelSizeForZoom: {
    bytes: 156,
    sha256: '20aa9c98a5d48b25893a8741eaefa60ec0f920d348bd188a7cbe294abdb647a7',
  },
  planeIconHtml: {
    bytes: 693,
    sha256: '9e7709914d527334d2c91c38c1204e6c54e563cfa90f5053c2f852f46a2f53bf',
  },
});

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchorIndex = html.indexOf(ANCHOR);
  assert.ok(anchorIndex >= 0, 'núcleo principal deve manter a ponte FIR usada como âncora');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no núcleo`);

  let i = container.indexOf('(', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (; i < container.length; i += 1) {
    const ch = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  let brace = i + 1;
  while (/\s/.test(container[brace])) brace += 1;
  assert.equal(container[brace], '{', `${name} deve possuir corpo`);

  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const ch = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  assert.fail(`fim de ${name} não encontrado`);
}

function loadInlineHelpers() {
  const kernel = kernelSource();
  const aircraftSource = functionSource(kernel, 'aircraftPixelSizeForZoom');
  const iconSource = functionSource(kernel, 'planeIconHtml');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escapeHtml = value => `ESC(${String(value)})`;
  return Function('clamp', 'escapeHtml', `${aircraftSource}\n${iconSource}\nreturn { aircraftPixelSizeForZoom, planeIconHtml };`)(clamp, escapeHtml);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

test('helpers visuais da aeronave mantêm identidade byte a byte', () => {
  const kernel = kernelSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const source = functionSource(kernel, name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes, `${name}: bytes`);
    assert.equal(sha256(source), expected.sha256, `${name}: SHA-256`);
  }
});

test('cada helper possui somente definição e um consumidor conhecido', () => {
  const kernel = kernelSource();
  assert.equal(kernel.split('aircraftPixelSizeForZoom').length - 1, 2);
  assert.equal(kernel.split('planeIconHtml').length - 1, 2);
  assert.match(kernel, /const size=aircraftPixelSizeForZoom\(realMapState\.map&&realMapState\.map\.getZoom\(\)\);/);
  assert.match(kernel, /html:planeIconHtml\(heading,callsign,size\)/);
});

test('aircraftPixelSizeForZoom preserva fallback, escala, arredondamento e limites', () => {
  const { aircraftPixelSizeForZoom } = loadInlineHelpers();
  assert.equal(aircraftPixelSizeForZoom(undefined), 18);
  assert.equal(aircraftPixelSizeForZoom(null), 12);
  assert.equal(aircraftPixelSizeForZoom(5), 12);
  assert.equal(aircraftPixelSizeForZoom('10'), 21);
  assert.equal(aircraftPixelSizeForZoom(18), 36);
  assert.equal(aircraftPixelSizeForZoom(100), 36);
  assert.equal(aircraftPixelSizeForZoom(-10), 12);
  assert.equal(aircraftPixelSizeForZoom('abc'), 18);
});

test('planeIconHtml preserva tamanho, rotação, modo compacto e escaping por dependência', () => {
  const { planeIconHtml } = loadInlineHelpers();

  const regular = planeIconHtml(45, 'GLO<1>', 30);
  assert.match(regular, /ff-aircraft-icon /);
  assert.doesNotMatch(regular, /ff-aircraft-icon compact/);
  assert.match(regular, /--ff-aircraft-size:30px;transform:rotate\(45\.0deg\)/);
  assert.match(regular, /ff-aircraft-label" style="transform:rotate\(-45deg\)"/);
  assert.ok(regular.includes('ESC(GLO<1>)'));

  const compact = planeIconHtml(0, 'TAM3720', 18);
  assert.match(compact, /ff-aircraft-icon compact/);
  assert.match(compact, /--ff-aircraft-size:18px;transform:rotate\(0\.0deg\)/);

  const fallback = planeIconHtml(undefined, 'PSFBU');
  assert.match(fallback, /--ff-aircraft-size:30px;transform:rotate\(0\.0deg\)/);
});

test('fronteira visual permanece sem estado, DOM, storage, rota ou movimento', () => {
  const kernel = kernelSource();
  const combined = [
    functionSource(kernel, 'aircraftPixelSizeForZoom'),
    functionSource(kernel, 'planeIconHtml'),
  ].join('\n');

  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'FlightParser', 'FlightFlowRouteProcessedV7412', 'goTo(', 'renderCurrent(',
    'realMapState', 'motion.', 'aircraftPixelSizeForZoom(',
  ]) {
    if (token === 'aircraftPixelSizeForZoom(') continue;
    assert.equal(combined.includes(token), false, `acoplamento proibido: ${token}`);
  }

  assert.ok(functionSource(kernel, 'aircraftPixelSizeForZoom').includes('clamp('));
  assert.ok(functionSource(kernel, 'planeIconHtml').includes('escapeHtml(callsign)'));
});
