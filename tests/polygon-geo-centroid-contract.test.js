'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = 337;
const EXPECTED_LINES = 9;
const EXPECTED_SHA256 = 'af2ed9697962ac78039ec6c758b9de6e8f1e24367e5d362a8cf245b14572ba61';
const EXPECTED_CONSUMERS = 1;
const EXPECTED_ALIAS = 'const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid, geoOffset } = CoordinateUtils;';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0);
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no coordinate-utils`);
  const brace = container.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return container.slice(start, i + 1); }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('polygonGeoCentroid foi movida preservando exatamente a identidade congelada', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'polygonGeoCentroid');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('polygonGeoCentroid permanece puro e desacoplado de infraestrutura', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'polygonGeoCentroid');
  for (const token of ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','fetch(','goTo(','renderCurrent(','stopPlayback(','setTimeout(','setInterval(','requestAnimationFrame(','google.','L.','Parser','realMapState']) {
    assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  }
});

test('IIFE usa polygonGeoCentroid pelo coordinate-utils sem alterar o único consumidor', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes('function polygonGeoCentroid('), false);
  assert.ok(kernel.includes(EXPECTED_ALIAS));
  const consumers = [...kernel.matchAll(/(?<![\w$.])polygonGeoCentroid\s*\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.ok(module.includes('    polygonGeoCentroid,'));
});

test('polygonGeoCentroid preserva média, coerção numérica e descarte de pontos inválidos', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'polygonGeoCentroid');
  const fn = Function(`${source}; return polygonGeoCentroid;`)();
  assert.equal(fn(null), null);
  assert.equal(fn([]), null);
  assert.deepEqual(fn([[0, 0], [2, 4]]), { lon: 1, lat: 2 });
  assert.deepEqual(fn([[-48, -16], [-47, -15]]), { lon: -47.5, lat: -15.5 });
  assert.deepEqual(fn([['3', '4'], [1, 2], [NaN, 5]]), { lon: 2, lat: 3 });
});
