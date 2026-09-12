'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'formatFieldDisplay';
const EXPECTED_CONSUMERS = 2;
const EXPECTED_SOURCE = [
  '  function formatFieldDisplay(key, value) {',
  "    if (['adep','ades'].includes(key)) {",
  '      const code = cleanDisplay(value);',
  "      return code ? formatAddressCode(code) : '—';",
  '    }',
  "    if (key === 'originator' || key === 'recipients') return formatAddressDisplay(value);",
  '    return displayValue(value);',
  '  }',
].join('\n');

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'núcleo principal deve manter a ponte FIR usada como âncora');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function extractNamedFunction(source, name) {
  const marker = `  function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
  const paren = source.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;

  while (i < source.length) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }

  let brace = i + 1;
  while (/\s/.test(source[brace] || '')) brace += 1;
  assert.equal(source[brace], '{');

  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < source.length; i += 1) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function loadFunction(deps = {}) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'cleanDisplay',
    'formatAddressCode',
    'formatAddressDisplay',
    'displayValue',
    `${source}\nreturn formatFieldDisplay;`
  )(
    deps.cleanDisplay,
    deps.formatAddressCode,
    deps.formatAddressDisplay,
    deps.displayValue
  );
}

test('formatFieldDisplay mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(EXPECTED_SOURCE, 'utf8'));
});

test('formatFieldDisplay permanece sem acoplamento direto de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('formatFieldDisplay mantém exatamente dois consumidores no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bformatFieldDisplay\s*\(/g)].length;
  assert.equal(occurrences - 1, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const value = formatFieldDisplay(key, snapshot[key]);'));
  assert.ok(kernel.includes("const before = change ? formatFieldDisplay(key, change.before) : '';"));
});

test('formatFieldDisplay formata ADEP e ADES como código de endereço', () => {
  for (const key of ['adep', 'ades']) {
    const calls = [];
    const fn = loadFunction({
      cleanDisplay: value => { calls.push(['clean', value]); return String(value || '').trim(); },
      formatAddressCode: value => { calls.push(['addressCode', value]); return `ADDR:${value}`; },
      formatAddressDisplay: value => { calls.push(['addressDisplay', value]); return `DISPLAY:${value}`; },
      displayValue: value => { calls.push(['displayValue', value]); return `VALUE:${value}`; },
    });

    assert.equal(fn(key, ' sbbr '), 'ADDR:sbbr');
    assert.deepEqual(calls, [['clean', ' sbbr '], ['addressCode', 'sbbr']]);
  }
});

test('formatFieldDisplay preserva travessão em ADEP/ADES vazios sem chamar formatAddressCode', () => {
  const calls = [];
  const fn = loadFunction({
    cleanDisplay: value => { calls.push(['clean', value]); return ''; },
    formatAddressCode: value => { calls.push(['addressCode', value]); return 'não deve ser usado'; },
    formatAddressDisplay: value => { calls.push(['addressDisplay', value]); return String(value); },
    displayValue: value => { calls.push(['displayValue', value]); return String(value); },
  });

  assert.equal(fn('adep', null), '—');
  assert.deepEqual(calls, [['clean', null]]);
});

test('formatFieldDisplay delega originator e recipients para formatAddressDisplay', () => {
  for (const key of ['originator', 'recipients']) {
    const calls = [];
    const fn = loadFunction({
      cleanDisplay: value => { calls.push(['clean', value]); return String(value); },
      formatAddressCode: value => { calls.push(['addressCode', value]); return String(value); },
      formatAddressDisplay: value => { calls.push(['addressDisplay', value]); return `ADDRESS:${value}`; },
      displayValue: value => { calls.push(['displayValue', value]); return `VALUE:${value}`; },
    });

    assert.equal(fn(key, 'SBBR SBGO'), 'ADDRESS:SBBR SBGO');
    assert.deepEqual(calls, [['addressDisplay', 'SBBR SBGO']]);
  }
});

test('formatFieldDisplay delega demais campos para displayValue', () => {
  const calls = [];
  const fn = loadFunction({
    cleanDisplay: value => { calls.push(['clean', value]); return String(value); },
    formatAddressCode: value => { calls.push(['addressCode', value]); return String(value); },
    formatAddressDisplay: value => { calls.push(['addressDisplay', value]); return String(value); },
    displayValue: value => { calls.push(['displayValue', value]); return `VALUE:${value}`; },
  });

  assert.equal(fn('callsign', 'FAB1234'), 'VALUE:FAB1234');
  assert.deepEqual(calls, [['displayValue', 'FAB1234']]);
});
