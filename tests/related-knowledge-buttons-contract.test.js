'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'relatedKnowledgeButtons';
const EXPECTED_BYTES = 630;
const EXPECTED_SHA256 = '61ea15f4014d7872d74c62b4d2fcf8fc2079f7adc462c3f4959394db69a03c31';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart, 'IIFE principal deve continuar delimitado');
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

function loadFunction(findKnowledgeEntriesByCode, escapeHtml) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'findKnowledgeEntriesByCode',
    'escapeHtml',
    source + '\nreturn relatedKnowledgeButtons;'
  )(findKnowledgeEntriesByCode, escapeHtml);
}

test('relatedKnowledgeButtons congela exatamente a fronteira selecionada no remapeamento #178', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
  assert.ok(source.startsWith('function relatedKnowledgeButtons(entry) {'));
  assert.ok(source.includes('matches.slice(0,12)'));
  assert.ok(source.includes('data-related-knowledge='));
});

test('relatedKnowledgeButtons permanece sem acoplamento temporal, espacial ou de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.',
    'goTo(', 'renderCurrent(', 'currentEvent(', 'stopPlayback(', 'route', 'planner', 'interpol',
    'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP', 'realMapState', 'leaflet', 'geometry',
    'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal((source.match(/\\bfindKnowledgeEntriesByCode\\s*\\(/g) || []).length, 1);
  assert.equal((source.match(/\\bescapeHtml\\s*\\(/g) || []).length, 3);
});

test('relatedKnowledgeButtons mantém exatamente um consumidor funcional em knowledgeDetailMarkup', () => {
  const kernel = kernelSource();
  assert.equal((kernel.match(/\\bfunction\\s+relatedKnowledgeButtons\\s*\\(/g) || []).length, 1);
  assert.equal((kernel.match(/\\brelatedKnowledgeButtons\\b/g) || []).length, 2);

  const consumer = extractNamedFunction(kernel, 'knowledgeDetailMarkup');
  assert.equal((consumer.match(/\\brelatedKnowledgeButtons\\s*\\(/g) || []).length, 1);
});

test('relatedKnowledgeButtons retorna vazio sem relacionados resolvidos', () => {
  const calls = [];
  const fn = loadFunction(code => {
    calls.push(code);
    return [];
  }, value => String(value));

  assert.equal(fn({ key: 'SELF', related: null }), '');
  assert.deepEqual(calls, []);

  assert.equal(fn({ key: 'SELF', related: ['A', 'B'] }), '');
  assert.deepEqual(calls, ['A', 'B']);
});

test('relatedKnowledgeButtons exclui a própria entrada, deduplica por key e preserva ordem de encontro', () => {
  const catalog = {
    A: [
      { key: 'SELF', code: 'SELF', title: 'Próprio' },
      { key: 'K1', code: 'C1', title: 'Título 1' },
      { key: 'K2', code: 'C2', title: 'Título 2' },
    ],
    B: [
      { key: 'K2', code: 'C2-DUP', title: 'Duplicado' },
      { key: 'K3', code: 'C3', title: 'Título 3' },
    ],
  };
  const calls = [];
  const fn = loadFunction(code => {
    calls.push(code);
    return catalog[code] || [];
  }, value => '[' + String(value) + ']');

  const html = fn({ key: 'SELF', related: ['A', 'B'] });
  assert.deepEqual(calls, ['A', 'B']);
  assert.equal(
    html,
    '<div class="knowledge-related">' +
      '<button type="button" data-related-knowledge="[K1]">[C1] · [Título 1]</button>' +
      '<button type="button" data-related-knowledge="[K2]">[C2] · [Título 2]</button>' +
      '<button type="button" data-related-knowledge="[K3]">[C3] · [Título 3]</button>' +
    '</div>'
  );
});

test('relatedKnowledgeButtons limita a saída aos doze primeiros matches', () => {
  const items = Array.from({ length: 13 }, (_, index) => ({
    key: 'K' + index,
    code: 'C' + index,
    title: 'T' + index,
  }));
  const fn = loadFunction(() => items, value => String(value));
  const html = fn({ key: 'SELF', related: ['A'] });

  assert.equal((html.match(/<button /g) || []).length, 12);
  assert.ok(html.includes('data-related-knowledge="K0"'));
  assert.ok(html.includes('data-related-knowledge="K11"'));
  assert.equal(html.includes('data-related-knowledge="K12"'), false);
});

test('relatedKnowledgeButtons não muta entradas e propaga erros das duas dependências', () => {
  const entry = { key: 'SELF', related: ['A'], meta: { keep: true } };
  const item = { key: 'K1', code: 'C1', title: 'T1', meta: { keep: true } };
  const beforeEntry = JSON.stringify(entry);
  const beforeItem = JSON.stringify(item);

  const fn = loadFunction(() => [item], value => String(value));
  fn(entry);
  assert.equal(JSON.stringify(entry), beforeEntry);
  assert.equal(JSON.stringify(item), beforeItem);

  const lookupError = new Error('lookup sentinel');
  const lookupFail = loadFunction(() => { throw lookupError; }, value => String(value));
  assert.throws(() => lookupFail({ key: 'SELF', related: ['A'] }), error => error === lookupError);

  const escapeError = new Error('escape sentinel');
  const escapeFail = loadFunction(() => [item], () => { throw escapeError; });
  assert.throws(() => escapeFail({ key: 'SELF', related: ['A'] }), error => error === escapeError);
});
