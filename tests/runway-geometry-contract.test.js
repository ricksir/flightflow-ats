'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const RUNWAYTOKENS = Object.freeze({ bytes: 104, lines: 1, sha: 'ea7c2d4dc62cfc56fa3bda6177625df9caff5213888cf700d5d5ad05d8eb7b2f', consumers: 4, calls: ["String"] });
const RUNWAYHEADING = Object.freeze({ bytes: 243, lines: 5, sha: '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715', consumers: 1, calls: ["Number", "runwayTokens"] });
const CONTROL_WORDS = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super']);

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
  assert.ok(start >= 0, `${name} deve existir no módulo após a extração`);
  const brace = container.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
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

function bareCalls(source, ownName) {
  return [...new Set([...source.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(m => m[1])
    .filter(name => name !== ownName && !CONTROL_WORDS.has(name)))].sort();
}

for (const [name, expected] of [['runwayTokens', RUNWAYTOKENS], ['runwayHeading', RUNWAYHEADING]]) {
  test(`${name} mantém identidade exata antes da extração`, () => {
    const source = functionSource(fs.readFileSync(MODULE, 'utf8'), name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes);
    assert.equal(source.split(/\r?\n/).length, expected.lines);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), expected.sha);
  });

  test(`${name} mantém dependências puras congeladas`, () => {
    const source = functionSource(fs.readFileSync(MODULE, 'utf8'), name);
    for (const forbidden of ['state.','els.','document.','window.','localStorage','sessionStorage','indexedDB','goTo(','renderCurrent(','stopPlayback(','fetch(']) {
      assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
    }
    assert.deepEqual(bareCalls(source, name), [...expected.calls]);
  });

  test(`${name} mantém consumidores reais conhecidos`, () => {
    const kernel = kernelSource();
    const consumers = [...kernel.matchAll(new RegExp(`(?<![\\w$.])${name}\\s*\\(`, 'g'))].length;
    const expectedKernelConsumers = name === 'runwayTokens' ? 3 : expected.consumers;
    assert.equal(consumers, expectedKernelConsumers);
    assert.ok(consumers >= 1);
    if (name === 'runwayTokens') {
      const headingSource = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeading');
      const internalConsumers = [...headingSource.matchAll(/(?<![\w$.])runwayTokens\s*\(/g)].length;
      assert.equal(consumers + internalConsumers, expected.consumers);
    }
  });
}

test('cluster runway geometry foi externalizado sem alterar consumidores', () => {
  const kernel = kernelSource();
  const module = fs.readFileSync(MODULE, 'utf8');
  for (const [name, expected] of [['runwayTokens', RUNWAYTOKENS], ['runwayHeading', RUNWAYHEADING]]) {
    assert.equal(kernel.includes(`function ${name}(`), false);
    assert.ok(module.includes(`function ${name}(`));
    assert.ok(module.includes(`    ${name},`));
    const consumers = [...kernel.matchAll(new RegExp(`(?<![\\w$.])${name}\\s*\\(`, 'g'))].length;
    assert.equal(consumers, name === 'runwayTokens' ? 3 : expected.consumers);
  }
  assert.ok(kernel.includes('function runwayHeadingFromCode('));
  assert.ok(kernel.includes('const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;'));
});
