'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'knowledgeContextSummary';
const EXPECTED_CONSUMERS = 1;
const EXPECTED_SOURCE = [
  '  function knowledgeContextSummary(entry, context) {',
  "    if (!context) return '';",
  "    const prefix = canonicalKnowledgeCode(entry.code) === 'RQP'",
  "      ? 'Neste RQP, os papéis são obtidos do endereçamento real do histórico, sem presumir que a solicitação partiu de uma TWR.'",
  "      : 'Endereçamento registrado neste evento.';",
  '    return `${prefix}',
  'Originador: ${context.originator}',
  'Destinatário(s): ${context.recipients}`;',
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
  assert.ok(start >= 0, `${name} deve existir no módulo após a extração`);
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

function loadFunction(canonicalKnowledgeCode) {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowCommunicationContextUtils
    .create({ canonicalKnowledgeCode })
    .knowledgeContextSummary;
}

test('knowledgeContextSummary mantém identidade byte a byte após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(EXPECTED_SOURCE, 'utf8'));
});

test('knowledgeContextSummary permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('knowledgeContextSummary mantém exatamente um consumidor no núcleo e não permanece inline', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bknowledgeContextSummary\s*\(/g)].length;
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const contextSummary = knowledgeContextSummary(entry, context);'));
  assert.equal(kernel.includes('function knowledgeContextSummary('), false);
  assert.ok(kernel.includes('const { knowledgeContextSummary } = CommunicationContextUtils.create({ canonicalKnowledgeCode });'));
});

test('knowledgeContextSummary retorna vazio quando não há contexto', () => {
  let calls = 0;
  const fn = loadFunction(value => { calls += 1; return String(value || '').toUpperCase(); });

  assert.equal(fn({ code: 'RQP' }, null), '');
  assert.equal(fn({ code: 'RQP' }, undefined), '');
  assert.equal(calls, 0, 'normalizador não deve ser chamado quando o contexto está ausente');
});

test('knowledgeContextSummary preserva texto especial para RQP', () => {
  const calls = [];
  const fn = loadFunction(value => {
    calls.push(value);
    return String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  });
  const result = fn(
    { code: 'R-Q-P' },
    { originator: 'SBBRZTZX', recipients: 'SBCWZQZX · SBBSZTZX' }
  );

  assert.equal(result,
    'Neste RQP, os papéis são obtidos do endereçamento real do histórico, sem presumir que a solicitação partiu de uma TWR.\n' +
    'Originador: SBBRZTZX\n' +
    'Destinatário(s): SBCWZQZX · SBBSZTZX'
  );
  assert.deepEqual(calls, ['R-Q-P']);
});

test('knowledgeContextSummary preserva texto padrão para demais códigos', () => {
  const fn = loadFunction(value => String(value || '').toUpperCase());
  assert.equal(
    fn({ code: 'FPL' }, { originator: 'A', recipients: 'B' }),
    'Endereçamento registrado neste evento.\nOriginador: A\nDestinatário(s): B'
  );
});

test('knowledgeContextSummary preserva interpolação literal dos campos do contexto', () => {
  const fn = loadFunction(value => String(value || '').toUpperCase());
  assert.equal(
    fn({ code: 'DEP' }, { originator: '', recipients: undefined }),
    'Endereçamento registrado neste evento.\nOriginador: \nDestinatário(s): undefined'
  );
});
