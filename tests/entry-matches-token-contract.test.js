'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'entryMatchesToken';
const EXPECTED_BYTES = 703;
const EXPECTED_SHA256 = '1786277e616ee1668872e61de46c48ebf4e3405961bcc11b912eb02e48fa8c9c';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0);
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir no núcleo antes da extração');
  const start = match.index;
  const braceStart = start + match[0].length - 1;
  let depth = 0;
  let mode = 'code';
  for (let i = braceStart; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === 'code') {
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      else if (c === '/' && n === '/') { mode = 'line'; i += 1; }
      else if (c === '/' && n === '*') { mode = 'block'; i += 1; }
      else if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    } else if (mode === 'sq') {
      if (c === '\\') i += 1;
      else if (c === "'") mode = 'code';
    } else if (mode === 'dq') {
      if (c === '\\') i += 1;
      else if (c === '"') mode = 'code';
    } else if (mode === 'tpl') {
      if (c === '\\') i += 1;
      else if (c === '`') mode = 'code';
    } else if (mode === 'line') {
      if (c === '\n') mode = 'code';
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i += 1; }
    }
  }
  throw new Error('fim de ' + name + ' não encontrado');
}

function loadFunction(normalizeKnowledgeText, canonicalKnowledgeCode) {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  return Function('normalizeKnowledgeText', 'canonicalKnowledgeCode', source + '\nreturn entryMatchesToken;')(
    normalizeKnowledgeText,
    canonicalKnowledgeCode
  );
}

test('entryMatchesToken preserva identidade estrutural após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
  assert.ok(source.startsWith('function entryMatchesToken(entry, normalizedText) {'));
  assert.ok(source.includes('.map(normalizeKnowledgeText).filter(Boolean)'));
  assert.ok(source.includes('const normalizedCanonical = canonicalKnowledgeCode(normalizedText);'));
  assert.ok(source.includes('canonicalKnowledgeCode(candidate)'));
  assert.ok(source.includes('new RegExp('));
});

test('entryMatchesToken permanece puro e só usa dependências de conhecimento', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.',
    'goTo(', 'renderCurrent(', 'currentEvent(', 'stopPlayback(', 'route', 'planner', 'interpol',
    'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP', 'realMapState', 'leaflet', 'geometry',
    'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
  ]) assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);

  assert.equal((source.match(/\bnormalizeKnowledgeText\b/g) || []).length, 1);
  assert.equal((source.match(/\bcanonicalKnowledgeCode\s*\(/g) || []).length, 2);
});

test('entryMatchesToken mantém exatamente um consumidor executável no resolver modular', () => {
  const kernel = kernelSource();
  const moduleSource = fs.readFileSync(MODULE, 'utf8');
  assert.equal((kernel.match(/\bfunction\s+entryMatchesToken\s*\(/g) || []).length, 0);
  assert.equal((kernel.match(/\bentryMatchesToken\b/g) || []).length, 2);
  assert.ok(kernel.includes('const { entryMatchesToken } = CommunicationContextUtils.createEntryMatchesToken({'));
  assert.ok(kernel.includes('CommunicationContextUtils.createResolveKnowledgeEntry({'));
  assert.ok(kernel.includes('normalizeKnowledgeText,'));
  assert.ok(kernel.includes('canonicalKnowledgeCode,'));
  assert.ok(kernel.includes('entryMatchesToken,'));

  const resolver = extractNamedFunction(moduleSource, 'resolveKnowledgeEntry');
  assert.equal(
    resolver.split('entries.find(entry => entry.category === category && entryMatchesToken(entry, normalized));').length - 1,
    1
  );
});

test('entryMatchesToken preserva correspondência exata, aliases e equivalência canônica', () => {
  const fn = loadFunction(
    value => String(value || '').trim().toUpperCase(),
    value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  );
  assert.equal(fn({ code: ' abi ', aliases: [] }, 'ABI'), true);
  assert.equal(fn({ code: 'XYZ', aliases: ['p-q/r'] }, 'PQR'), true);
  assert.equal(fn({ code: 'A-B/C', aliases: [] }, 'ABC'), true);
});

test('entryMatchesToken preserva fallback flexível e fronteiras alfanuméricas', () => {
  const fn = loadFunction(
    value => String(value || '').toUpperCase(),
    value => String(value || '').toUpperCase()
  );
  assert.equal(fn({ code: 'A-B/C', aliases: [] }, 'A B/C'), true);
  assert.equal(fn({ code: 'A B C', aliases: [] }, 'A-B/C'), true);
  assert.equal(fn({ code: 'ABI', aliases: [] }, 'PREFIX ABI SUFFIX'), true);
  assert.equal(fn({ code: 'ABI', aliases: [] }, 'XABIY'), false);
  assert.equal(fn({ code: '', aliases: ['', null] }, 'QUALQUER'), false);
});

test('entryMatchesToken não muta entrada e propaga erros das dependências', () => {
  const entry = { code: 'ABC-12', aliases: ['ABC/12'], meta: { keep: true } };
  const before = JSON.stringify(entry);
  const fn = loadFunction(
    value => String(value || '').toUpperCase(),
    value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  );
  fn(entry, 'ABC12');
  assert.equal(JSON.stringify(entry), before);

  const normalizeError = new Error('normalize sentinel');
  const normalizeFail = loadFunction(() => { throw normalizeError; }, value => value);
  assert.throws(() => normalizeFail({ code: 'ABI', aliases: [] }, 'ABI'), error => error === normalizeError);

  const canonicalError = new Error('canonical sentinel');
  const canonicalFail = loadFunction(value => String(value || ''), () => { throw canonicalError; });
  assert.throws(() => canonicalFail({ code: 'ABI', aliases: [] }, 'ABI'), error => error === canonicalError);
});
