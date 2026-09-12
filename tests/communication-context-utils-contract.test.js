'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const MODULE_BYTES = 3692;
const MODULE_SHA256 = 'afecb2a6913d0769f8c94a304ec80dc82e7130b0814c7d9c819ccdbca9958fc5'
const TARGET_BYTES = 628;
const TARGET_SHA256 = 'f844273330a6cec8df2f8137c209159434d7e76a1076b39e256f79cd5f4fc71a';

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no módulo`);
  const paren = container.indexOf('(', start);
  let i = paren, depth = 0, quote = null, escaped = false;
  while (i < container.length) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1; continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) break; }
    i += 1;
  }
  let brace = i + 1;
  while (/\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{');
  depth = 0; quote = null; escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const c = container[i];
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
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('módulo communication-context-utils mantém identidade estrutural congelada', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.match(source, /^\(function \(\) \{\n  'use strict';/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('internalTransitionDetails preserva exatamente os bytes congelados dentro do módulo', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails');
  assert.equal(Buffer.byteLength(source, 'utf8'), TARGET_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), TARGET_SHA256);
});

test('API pública preserva contratos existentes e expõe fábrica isolada de formatação', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const api = context.window.FlightFlowCommunicationContextUtils;
  assert.ok(api);
  assert.deepEqual(Object.keys(api), ['internalTransitionDetails', 'create', 'createAddressFormatter', 'createAddressDisplayFormatter']);
  assert.equal(Object.isFrozen(api), true);
  assert.equal(typeof api.internalTransitionDetails, 'function');
  assert.equal(typeof api.create, 'function');
  assert.equal(typeof api.createAddressFormatter, 'function');
  assert.equal(typeof api.createAddressDisplayFormatter, 'function');

  assert.throws(
    () => api.create({}),
    /FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode/
  );

  const scoped = api.create({ canonicalKnowledgeCode: value => String(value || '').toUpperCase() });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['knowledgeContextSummary']);
  assert.equal(typeof scoped.knowledgeContextSummary, 'function');

  assert.throws(
    () => api.createAddressFormatter({}),
    /FlightFlowCommunicationContextUtils requer normalizeLocalityCode/
  );
  assert.throws(
    () => api.createAddressFormatter({ normalizeLocalityCode: value => value }),
    /FlightFlowCommunicationContextUtils requer lookupLocality/
  );
  const addressScoped = api.createAddressFormatter({
    normalizeLocalityCode: value => String(value || '').trim().toUpperCase(),
    lookupLocality: code => code === 'SBBR' ? 'Brasília' : '',
  });
  assert.equal(Object.isFrozen(addressScoped), true);
  assert.deepEqual(Object.keys(addressScoped), ['formatAddressCode']);
  assert.equal(addressScoped.formatAddressCode('sbbr'), 'SBBR — Brasília');

  assert.throws(
    () => api.createAddressDisplayFormatter({}),
    /FlightFlowCommunicationContextUtils requer cleanDisplay/
  );
  assert.throws(
    () => api.createAddressDisplayFormatter({ cleanDisplay: value => value }),
    /FlightFlowCommunicationContextUtils requer parseAddresses/
  );
  assert.throws(
    () => api.createAddressDisplayFormatter({
      cleanDisplay: value => value,
      parseAddresses: () => [],
    }),
    /FlightFlowCommunicationContextUtils requer normalizeLocalityCode para display/
  );
  assert.throws(
    () => api.createAddressDisplayFormatter({
      cleanDisplay: value => value,
      parseAddresses: () => [],
      normalizeLocalityCode: value => value,
    }),
    /FlightFlowCommunicationContextUtils requer formatAddressCode/
  );
  const displayScoped = api.createAddressDisplayFormatter({
    cleanDisplay: value => String(value || '').trim(),
    parseAddresses: () => ['SBBR', 'SBBR', 'SBGO'],
    normalizeLocalityCode: value => String(value || '').toUpperCase(),
    formatAddressCode: value => `FMT:${value}`,
  });
  assert.equal(Object.isFrozen(displayScoped), true);
  assert.deepEqual(Object.keys(displayScoped), ['formatAddressDisplay']);
  assert.equal(displayScoped.formatAddressDisplay('qualquer'), 'FMT:SBBR · FMT:SBGO');
});

test('index carrega módulo antes do IIFE e núcleo usa aliases explícitos', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-communication-context-utils" src="src/timeline/communication-context-utils.js"></script>';
  assert.equal(html.split(tag).length - 1, 1);
  const iife = html.indexOf('<script>\n\n(function () {');
  assert.ok(iife > 0 && html.indexOf(tag) < iife);
  assert.ok(html.includes('const CommunicationContextUtils = window.FlightFlowCommunicationContextUtils;'));
  assert.ok(html.includes("if (!CommunicationContextUtils) throw new Error('FlightFlowCommunicationContextUtils não foi carregado.');"));
  assert.ok(html.includes('const { internalTransitionDetails } = CommunicationContextUtils;'));
  assert.ok(html.includes('const { knowledgeContextSummary } = CommunicationContextUtils.create({ canonicalKnowledgeCode });'));
  assert.ok(html.includes('const { formatAddressCode } = CommunicationContextUtils.createAddressFormatter({ normalizeLocalityCode, lookupLocality });'));
  assert.ok(html.includes('const { formatAddressDisplay } = CommunicationContextUtils.createAddressDisplayFormatter({ cleanDisplay, parseAddresses, normalizeLocalityCode, formatAddressCode });'));
});

test('módulo permanece desacoplado de estado, DOM, rede, storage e mapa', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  for (const name of ['internalTransitionDetails', 'knowledgeContextSummary', 'formatAddressCode', 'formatAddressDisplay']) {
    const target = functionSource(source, name);
    for (const token of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'google.', 'L.', 'Parser', 'realMapState']) {
      assert.equal(target.includes(token), false, `acoplamento inesperado em ${name}: ${token}`);
    }
  }
});
