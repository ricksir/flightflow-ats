'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'resolveKnowledgeEntry';
const EXPECTED_BYTES = 1907;
const EXPECTED_SHA256 = '95ca385afde918ceb769218088baaacfe7f146b4334666989846333e24590cc2';

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
  assert.ok(match, name + ' deve existir na fonte protegida');
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

function loadFunction(overrides = {}) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  const deps = {
    normalizeKnowledgeText: value => String(value || '').trim().toUpperCase(),
    knowledgeEntries: () => [],
    canonicalKnowledgeCode: value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    entryMatchesToken: () => false,
    ...overrides,
  };
  return Function(
    'normalizeKnowledgeText',
    'knowledgeEntries',
    'canonicalKnowledgeCode',
    'entryMatchesToken',
    source + '\nreturn resolveKnowledgeEntry;'
  )(
    deps.normalizeKnowledgeText,
    deps.knowledgeEntries,
    deps.canonicalKnowledgeCode,
    deps.entryMatchesToken
  );
}

test('resolveKnowledgeEntry congela exatamente a fronteira selecionada no remapeamento #187', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
  assert.ok(source.startsWith('function resolveKnowledgeEntry(fieldKey, rawValue, event) {'));
  assert.ok(source.includes("priorities = ['message','status_sagitario','status_tatic','plan_state','term','mca_abbreviation','mca_definition','mca_general']"));
  assert.ok(source.includes("priorities = ['plan_state','status_sagitario','status_tatic','message','term','mca_abbreviation','mca_definition','mca_general']"));
  assert.ok(source.includes("priorities = ['status_tatic','status_sagitario','message','plan_state','term','mca_abbreviation','mca_definition','mca_general']"));
});

test('resolveKnowledgeEntry permanece sem acoplamento temporal, espacial ou de infraestrutura', () => {
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

  assert.equal(source.split('normalizeKnowledgeText(').length - 1, 1);
  assert.equal(source.split('knowledgeEntries(').length - 1, 1);
  assert.equal(source.split('canonicalKnowledgeCode(').length - 1, 3);
  assert.equal(source.split('entryMatchesToken(').length - 1, 1);
});

test('resolveKnowledgeEntry mantém um único consumidor funcional em renderKnowledgeFieldLabel', () => {
  const kernel = kernelSource();
  assert.equal(kernel.split('resolveKnowledgeEntry').length - 1, 2);
  assert.equal(kernel.split('function resolveKnowledgeEntry(').length - 1, 1);
  assert.ok(kernel.includes('const { renderKnowledgeFieldLabel } = KnowledgeFieldLabelRenderer.create({'));
  assert.ok(kernel.includes('resolveKnowledgeEntry,'));
});

test('resolveKnowledgeEntry encerra cedo quando a normalização fica vazia', () => {
  const calls = [];
  const fn = loadFunction({
    normalizeKnowledgeText: value => {
      calls.push(['normalize', value]);
      return '';
    },
    knowledgeEntries: () => { throw new Error('knowledgeEntries não deveria ser chamada'); },
    canonicalKnowledgeCode: () => { throw new Error('canonical não deveria ser chamada'); },
    entryMatchesToken: () => { throw new Error('matcher não deveria ser chamado'); },
  });

  assert.equal(fn('status', '   ', null), null);
  assert.deepEqual(calls, [['normalize', '   ']]);
});

test('resolveKnowledgeEntry usa messageType e operação/protocolo do evento apenas nos campos previstos', () => {
  const normalizedInputs = [];
  const fn = loadFunction({
    normalizeKnowledgeText: value => {
      normalizedInputs.push(value);
      return String(value || '').toUpperCase();
    },
  });
  const event = { messageType: 'MSG', operation: 'OP', protocol: 'PROTO' };

  assert.equal(fn('operation', 'RAW', event), null);
  assert.equal(fn('protocol', 'RAW', event), null);
  assert.equal(fn('messageType', 'RAW', event), null);
  assert.equal(fn('status', 'RAW', event), null);

  assert.deepEqual(normalizedInputs, [
    'RAW MSG OP',
    'RAW MSG PROTO',
    'RAW',
    'RAW',
  ]);
});

test('resolveKnowledgeEntry preserva preferência canônica de mensagem normativa e fallback MCA', () => {
  const complementary = { key: 'COMP', code: 'ABC', category: 'message', normative: false };
  const abbreviation = { key: 'ABBR', code: 'ABC', category: 'mca_abbreviation' };
  const normative = { key: 'NORM', code: 'A-B/C', category: 'message', normative: true };

  const fnNormative = loadFunction({
    knowledgeEntries: () => [complementary, abbreviation, normative],
  });
  assert.equal(fnNormative('messageType', 'ABC', null), normative);

  const fnAbbreviation = loadFunction({
    knowledgeEntries: () => [complementary, abbreviation],
  });
  assert.equal(fnAbbreviation('protocol', 'ABC', null), abbreviation);

  const fnComplementary = loadFunction({
    knowledgeEntries: () => [complementary],
  });
  assert.equal(fnComplementary('operation', 'ABC', null), complementary);
});

test('resolveKnowledgeEntry preserva prioridades por tipo de campo no fallback por token', () => {
  const entries = [
    { key: 'MESSAGE', code: 'MESSAGE', category: 'message' },
    { key: 'PLAN', code: 'PLAN', category: 'plan_state' },
    { key: 'SAG', code: 'SAG', category: 'status_sagitario' },
    { key: 'TATIC', code: 'TATIC', category: 'status_tatic' },
  ];
  const matcher = entry => true;
  const canonical = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const fn = loadFunction({
    knowledgeEntries: () => entries,
    canonicalKnowledgeCode: canonical,
    entryMatchesToken: matcher,
  });

  assert.equal(fn('messageType', 'NO-EXACT', null).key, 'MESSAGE');
  assert.equal(fn('operation', 'NO-EXACT', null).key, 'MESSAGE');
  assert.equal(fn('protocol', 'NO-EXACT', null).key, 'MESSAGE');
  assert.equal(fn('status', 'NO-EXACT', null).key, 'PLAN');
  assert.equal(fn('other', 'NO-EXACT', null).key, 'TATIC');
});

test('resolveKnowledgeEntry ordena cópia por comprimento de código sem mutar catálogo nem entradas', () => {
  const short = Object.freeze({ key: 'SHORT', code: 'A', category: 'status_tatic' });
  const long = Object.freeze({ key: 'LONG', code: 'LONG-CODE', category: 'status_tatic' });
  const catalog = [short, long];
  const before = catalog.slice();
  const seen = [];

  const fn = loadFunction({
    knowledgeEntries: () => catalog,
    entryMatchesToken: entry => {
      seen.push(entry.key);
      return true;
    },
  });

  assert.equal(fn('other', 'TOKEN', null), long);
  assert.deepEqual(catalog, before);
  assert.deepEqual(seen, ['LONG']);
});

test('resolveKnowledgeEntry propaga erros das quatro dependências', () => {
  const normalizeError = new Error('normalize sentinel');
  assert.throws(
    () => loadFunction({ normalizeKnowledgeText: () => { throw normalizeError; } })('status', 'X', null),
    error => error === normalizeError
  );

  const entriesError = new Error('entries sentinel');
  assert.throws(
    () => loadFunction({ knowledgeEntries: () => { throw entriesError; } })('status', 'X', null),
    error => error === entriesError
  );

  const canonicalError = new Error('canonical sentinel');
  assert.throws(
    () => loadFunction({
      knowledgeEntries: () => [{ code: 'X', category: 'message' }],
      canonicalKnowledgeCode: () => { throw canonicalError; },
    })('messageType', 'X', null),
    error => error === canonicalError
  );

  const matcherError = new Error('matcher sentinel');
  assert.throws(
    () => loadFunction({
      knowledgeEntries: () => [{ code: 'X', category: 'status_tatic' }],
      entryMatchesToken: () => { throw matcherError; },
    })('other', 'X', null),
    error => error === matcherError
  );
});
