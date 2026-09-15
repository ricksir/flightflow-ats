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
const MODULE_BYTES = 22691;
const MODULE_SHA256 = '3d6e6f787a296194a651037bc80bf1050473a266f578712893064b66a8e2d68c';
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

test('API pública preserva contratos existentes e expõe fábricas isoladas', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const api = context.window.FlightFlowCommunicationContextUtils;
  assert.ok(api);
  assert.deepEqual(Object.keys(api), ['internalTransitionDetails', 'parseAddresses', 'knowledgeEntryDocumentKey', 'normalizeKnowledgeText', 'createCommunicationContextInferer', 'createCanonicalKnowledgeCode', 'createEntryMatchesToken', 'createResolveKnowledgeEntry', 'createKnowledgeEntryFinder', 'createKnowledgeEntriesByCodeFinder', 'createRelatedKnowledgeButtons', 'createKnowledgeDetailMarkup', 'createKnowledgeDocumentLabeler', 'createKnowledgeCategoryLabeler', 'create', 'createAddressFormatter', 'createAddressDisplayFormatter', 'createFieldDisplayFormatter']);
  assert.equal(Object.isFrozen(api), true);
  assert.equal(typeof api.internalTransitionDetails, 'function');
  assert.equal(typeof api.parseAddresses, 'function');
  assert.equal(JSON.stringify(api.parseAddresses('sbbrztzx sbbszqzx SBBRZTZX')), '["SBBRZTZX","SBBSZQZX"]');
  assert.equal(typeof api.knowledgeEntryDocumentKey, 'function');
  assert.equal(api.knowledgeEntryDocumentKey({ sourceDocument: 'MCA 100-27' }), 'MCA');
  assert.equal(typeof api.normalizeKnowledgeText, 'function');
  assert.equal(api.normalizeKnowledgeText('RQP — Brasília / ZQZX'), 'RQP - BRASILIA ZQZX');
  assert.equal(typeof api.createCommunicationContextInferer, 'function');
  assert.throws(() => api.createCommunicationContextInferer({}), /FlightFlowCommunicationContextUtils requer parseAddresses para inferir contexto/);
  assert.throws(() => api.createCommunicationContextInferer({
    parseAddresses: () => [],
  }), /FlightFlowCommunicationContextUtils requer formatAddressCode para inferir contexto/);
  assert.throws(() => api.createCommunicationContextInferer({
    parseAddresses: () => [],
    formatAddressCode: value => String(value),
  }), /FlightFlowCommunicationContextUtils requer internalTransitionDetails para inferir contexto/);
  const inferScoped = api.createCommunicationContextInferer({
    parseAddresses: value => value === 'ORIG' ? ['SBBRZQZX'] : [],
    formatAddressCode: value => `FMT:${value}`,
    internalTransitionDetails: () => ({ previous: '', current: '' }),
  });
  assert.equal(Object.isFrozen(inferScoped), true);
  assert.deepEqual(Object.keys(inferScoped), ['inferCommunicationContext']);
  const inferred = inferScoped.inferCommunicationContext({ originator: 'ORIG', snapshot: {} });
  assert.equal(inferred.external, true);
  assert.equal(inferred.originLabel, 'FMT:SBBRZQZX');
  assert.equal(typeof api.createCanonicalKnowledgeCode, 'function');
  assert.throws(() => api.createCanonicalKnowledgeCode({}), /FlightFlowCommunicationContextUtils requer normalizeKnowledgeText para código canônico/);
  const canonicalScoped = api.createCanonicalKnowledgeCode({ normalizeKnowledgeText: value => String(value || '').trim().toUpperCase() });
  assert.equal(Object.isFrozen(canonicalScoped), true);
  assert.deepEqual(Object.keys(canonicalScoped), ['canonicalKnowledgeCode']);
  assert.equal(canonicalScoped.canonicalKnowledgeCode(' AB-C / 12 '), 'ABC12');
  assert.equal(typeof api.createEntryMatchesToken, 'function');
  assert.throws(() => api.createEntryMatchesToken({}), /FlightFlowCommunicationContextUtils requer normalizeKnowledgeText para correspondência de token/);
  assert.throws(() => api.createEntryMatchesToken({ normalizeKnowledgeText: value => value }), /FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode para correspondência de token/);
  const tokenMatcherScoped = api.createEntryMatchesToken({
    normalizeKnowledgeText: value => String(value || '').trim().toUpperCase(),
    canonicalKnowledgeCode: value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
  });
  assert.equal(Object.isFrozen(tokenMatcherScoped), true);
  assert.deepEqual(Object.keys(tokenMatcherScoped), ['entryMatchesToken']);
  assert.equal(tokenMatcherScoped.entryMatchesToken({ code: 'A-B/C', aliases: [] }, 'ABC'), true);
  assert.equal(typeof api.createResolveKnowledgeEntry, 'function');
  assert.throws(() => api.createResolveKnowledgeEntry({}), /FlightFlowCommunicationContextUtils requer normalizeKnowledgeText para resolver conhecimento/);
  assert.throws(() => api.createResolveKnowledgeEntry({
    normalizeKnowledgeText: value => String(value),
  }), /FlightFlowCommunicationContextUtils requer knowledgeEntries para resolver conhecimento/);
  assert.throws(() => api.createResolveKnowledgeEntry({
    normalizeKnowledgeText: value => String(value),
    knowledgeEntries: () => [],
  }), /FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode para resolver conhecimento/);
  assert.throws(() => api.createResolveKnowledgeEntry({
    normalizeKnowledgeText: value => String(value),
    knowledgeEntries: () => [],
    canonicalKnowledgeCode: value => String(value),
  }), /FlightFlowCommunicationContextUtils requer entryMatchesToken para resolver conhecimento/);
  const resolveScoped = api.createResolveKnowledgeEntry({
    normalizeKnowledgeText: value => String(value || '').trim().toUpperCase(),
    knowledgeEntries: () => [],
    canonicalKnowledgeCode: value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    entryMatchesToken: () => false,
  });
  assert.equal(Object.isFrozen(resolveScoped), true);
  assert.deepEqual(Object.keys(resolveScoped), ['resolveKnowledgeEntry']);
  assert.equal(resolveScoped.resolveKnowledgeEntry('status', '', null), null);
  assert.equal(typeof api.createKnowledgeEntryFinder, 'function');
  assert.throws(() => api.createKnowledgeEntryFinder({}), /FlightFlowCommunicationContextUtils requer knowledgeEntries/);
  const entryA = { key: 'ENTRY:A' };
  const finderScoped = api.createKnowledgeEntryFinder({ knowledgeEntries: () => [entryA, { key: 'ENTRY:B' }] });
  assert.equal(Object.isFrozen(finderScoped), true);
  assert.deepEqual(Object.keys(finderScoped), ['findKnowledgeEntryByKey']);
  assert.equal(finderScoped.findKnowledgeEntryByKey('ENTRY:A'), entryA);
  assert.equal(finderScoped.findKnowledgeEntryByKey('MISSING'), null);
  assert.equal(typeof api.createKnowledgeEntriesByCodeFinder, 'function');
  assert.throws(() => api.createKnowledgeEntriesByCodeFinder({}), /FlightFlowCommunicationContextUtils requer knowledgeEntries para busca por código/);
  assert.throws(() => api.createKnowledgeEntriesByCodeFinder({ knowledgeEntries: () => [] }), /FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode para busca por código/);
  const codeEntryA = { key: 'CODE:A', code: 'ABC', aliases: ['ALT'] };
  const codeFinderScoped = api.createKnowledgeEntriesByCodeFinder({
    knowledgeEntries: () => [codeEntryA, { key: 'CODE:B', code: 'DEF', aliases: [] }],
    canonicalKnowledgeCode: value => String(value || '').trim().toUpperCase(),
  });
  assert.equal(Object.isFrozen(codeFinderScoped), true);
  assert.deepEqual(Object.keys(codeFinderScoped), ['findKnowledgeEntriesByCode']);
  const aliasMatches = codeFinderScoped.findKnowledgeEntriesByCode(' alt ');
  assert.equal(aliasMatches.length, 1);
  assert.equal(aliasMatches[0], codeEntryA);
  assert.equal(typeof api.createRelatedKnowledgeButtons, 'function');
  assert.throws(() => api.createRelatedKnowledgeButtons({}), /FlightFlowCommunicationContextUtils requer findKnowledgeEntriesByCode para relacionados/);
  assert.throws(() => api.createRelatedKnowledgeButtons({ findKnowledgeEntriesByCode: () => [] }), /FlightFlowCommunicationContextUtils requer escapeHtml para relacionados/);
  const relatedEntry = { key: 'REL:A', code: 'ABC', title: 'Alpha' };
  const relatedScoped = api.createRelatedKnowledgeButtons({
    findKnowledgeEntriesByCode: code => code === 'ABC' ? [relatedEntry] : [],
    escapeHtml: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  });
  assert.equal(Object.isFrozen(relatedScoped), true);
  assert.deepEqual(Object.keys(relatedScoped), ['relatedKnowledgeButtons']);
  assert.equal(relatedScoped.relatedKnowledgeButtons({ key: 'ROOT', related: ['ABC'] }), '<div class="knowledge-related"><button type="button" data-related-knowledge="REL:A">ABC · Alpha</button></div>');
  assert.equal(relatedScoped.relatedKnowledgeButtons({ key: 'REL:A', related: ['ABC'] }), '');
  assert.equal(typeof api.createKnowledgeDetailMarkup, 'function');
  assert.throws(() => api.createKnowledgeDetailMarkup({}), /FlightFlowCommunicationContextUtils requer escapeHtml para detalhe de conhecimento/);
  assert.throws(() => api.createKnowledgeDetailMarkup({ escapeHtml: value => String(value) }), /FlightFlowCommunicationContextUtils requer knowledgeEntryDocumentLabel para detalhe de conhecimento/);
  assert.throws(() => api.createKnowledgeDetailMarkup({
    escapeHtml: value => String(value),
    knowledgeEntryDocumentLabel: () => 'DOC',
  }), /FlightFlowCommunicationContextUtils requer knowledgeCategoryLabel para detalhe de conhecimento/);
  assert.throws(() => api.createKnowledgeDetailMarkup({
    escapeHtml: value => String(value),
    knowledgeEntryDocumentLabel: () => 'DOC',
    knowledgeCategoryLabel: () => 'CAT',
  }), /FlightFlowCommunicationContextUtils requer relatedKnowledgeButtons para detalhe de conhecimento/);
  const detailScoped = api.createKnowledgeDetailMarkup({
    escapeHtml: value => String(value),
    knowledgeEntryDocumentLabel: () => 'DOC',
    knowledgeCategoryLabel: () => 'CAT',
    relatedKnowledgeButtons: () => '<R/>',
    knowledgeDisclaimer: 'DISCLAIMER',
  });
  assert.equal(Object.isFrozen(detailScoped), true);
  assert.deepEqual(Object.keys(detailScoped), ['knowledgeDetailMarkup']);
  assert.equal(detailScoped.knowledgeDetailMarkup(null), '<div class="knowledge-empty">Selecione uma mensagem, status ou termo.</div>');
  assert.ok(detailScoped.knowledgeDetailMarkup({
    code: 'ABC',
    category: 'message',
    title: 'Alpha',
    definition: 'Definição',
    source: 'Fonte',
  }).includes('<R/>'));
  assert.equal(typeof api.createKnowledgeDocumentLabeler, 'function');
  assert.throws(() => api.createKnowledgeDocumentLabeler({}), /FlightFlowCommunicationContextUtils requer knowledgeDocumentLabels/);
  assert.throws(() => api.createKnowledgeDocumentLabeler({ knowledgeDocumentLabels: {} }), /FlightFlowCommunicationContextUtils requer knowledgeEntryDocumentKey para rótulos/);
  const labelScoped = api.createKnowledgeDocumentLabeler({ knowledgeDocumentLabels: { MCA: 'MCA 100-27/2025' }, knowledgeEntryDocumentKey: () => 'MCA' });
  assert.equal(Object.isFrozen(labelScoped), true);
  assert.deepEqual(Object.keys(labelScoped), ['knowledgeEntryDocumentLabel']);
  assert.equal(labelScoped.knowledgeEntryDocumentLabel({}), 'MCA 100-27/2025');
  assert.equal(typeof api.createKnowledgeCategoryLabeler, 'function');
  assert.throws(() => api.createKnowledgeCategoryLabeler({}), /FlightFlowCommunicationContextUtils requer knowledgeCategoryLabels/);
  assert.throws(() => api.createKnowledgeCategoryLabeler({ knowledgeCategoryLabels: {} }), /FlightFlowCommunicationContextUtils requer humanize para categorias/);
  const categoryScoped = api.createKnowledgeCategoryLabeler({ knowledgeCategoryLabels: { message: 'Mensagem ATS' }, humanize: value => `H:${value}` });
  assert.equal(Object.isFrozen(categoryScoped), true);
  assert.deepEqual(Object.keys(categoryScoped), ['knowledgeCategoryLabel']);
  assert.equal(categoryScoped.knowledgeCategoryLabel('message'), 'Mensagem ATS');
  assert.equal(categoryScoped.knowledgeCategoryLabel('custom'), 'H:custom');
  assert.equal(typeof api.create, 'function');
  assert.equal(typeof api.createAddressFormatter, 'function');
  assert.equal(typeof api.createAddressDisplayFormatter, 'function');
  assert.equal(typeof api.createFieldDisplayFormatter, 'function');
  assert.throws(() => api.create({}), /FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode/);
  const scoped = api.create({ canonicalKnowledgeCode: value => String(value || '').toUpperCase() });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['knowledgeContextSummary']);
  assert.equal(typeof scoped.knowledgeContextSummary, 'function');
  assert.throws(() => api.createAddressFormatter({}), /FlightFlowCommunicationContextUtils requer normalizeLocalityCode/);
  assert.throws(() => api.createAddressFormatter({ normalizeLocalityCode: value => value }), /FlightFlowCommunicationContextUtils requer lookupLocality/);
  const addressScoped = api.createAddressFormatter({
    normalizeLocalityCode: value => String(value || '').trim().toUpperCase(),
    lookupLocality: code => code === 'SBBR' ? 'Brasília' : '',
  });
  assert.equal(Object.isFrozen(addressScoped), true);
  assert.deepEqual(Object.keys(addressScoped), ['formatAddressCode']);
  assert.equal(addressScoped.formatAddressCode('sbbr'), 'SBBR — Brasília');
  assert.throws(() => api.createAddressDisplayFormatter({}), /FlightFlowCommunicationContextUtils requer cleanDisplay/);
  assert.throws(() => api.createAddressDisplayFormatter({ cleanDisplay: value => value }), /FlightFlowCommunicationContextUtils requer parseAddresses/);
  assert.throws(() => api.createAddressDisplayFormatter({ cleanDisplay: value => value, parseAddresses: () => [] }), /FlightFlowCommunicationContextUtils requer normalizeLocalityCode para display/);
  assert.throws(() => api.createAddressDisplayFormatter({ cleanDisplay: value => value, parseAddresses: () => [], normalizeLocalityCode: value => value }), /FlightFlowCommunicationContextUtils requer formatAddressCode/);
  const displayScoped = api.createAddressDisplayFormatter({
    cleanDisplay: value => String(value || '').trim(),
    parseAddresses: () => ['SBBR', 'SBBR', 'SBGO'],
    normalizeLocalityCode: value => String(value || '').toUpperCase(),
    formatAddressCode: value => `FMT:${value}`,
  });
  assert.equal(Object.isFrozen(displayScoped), true);
  assert.deepEqual(Object.keys(displayScoped), ['formatAddressDisplay']);
  assert.equal(displayScoped.formatAddressDisplay('qualquer'), 'FMT:SBBR · FMT:SBGO');
  assert.throws(() => api.createFieldDisplayFormatter({}), /FlightFlowCommunicationContextUtils requer cleanDisplay para campos/);
  assert.throws(() => api.createFieldDisplayFormatter({ cleanDisplay: value => value }), /FlightFlowCommunicationContextUtils requer formatAddressCode para campos/);
  assert.throws(() => api.createFieldDisplayFormatter({ cleanDisplay: value => value, formatAddressCode: value => value }), /FlightFlowCommunicationContextUtils requer formatAddressDisplay/);
  assert.throws(() => api.createFieldDisplayFormatter({ cleanDisplay: value => value, formatAddressCode: value => value, formatAddressDisplay: value => value }), /FlightFlowCommunicationContextUtils requer displayValue/);
  const fieldScoped = api.createFieldDisplayFormatter({
    cleanDisplay: value => String(value || '').trim(),
    formatAddressCode: value => `CODE:${value}`,
    formatAddressDisplay: value => `ADDRESS:${value}`,
    displayValue: value => `VALUE:${value}`,
  });
  assert.equal(Object.isFrozen(fieldScoped), true);
  assert.deepEqual(Object.keys(fieldScoped), ['formatFieldDisplay']);
  assert.equal(fieldScoped.formatFieldDisplay('adep', ' sbbr '), 'CODE:sbbr');
  assert.equal(fieldScoped.formatFieldDisplay('originator', 'SBBR'), 'ADDRESS:SBBR');
  assert.equal(fieldScoped.formatFieldDisplay('callsign', 'FAB1234'), 'VALUE:FAB1234');
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
  assert.ok(html.includes('const { parseAddresses } = CommunicationContextUtils;'));
  assert.ok(html.includes('const { inferCommunicationContext } = CommunicationContextUtils.createCommunicationContextInferer({'));
  assert.ok(html.includes('parseAddresses,'));
  assert.ok(html.includes('formatAddressCode,'));
  assert.ok(html.includes('internalTransitionDetails,'));
  assert.ok(html.includes('const { knowledgeEntryDocumentKey } = CommunicationContextUtils;'));
  assert.ok(html.includes('const { normalizeKnowledgeText } = CommunicationContextUtils;'));
  assert.ok(html.includes('const { canonicalKnowledgeCode } = CommunicationContextUtils.createCanonicalKnowledgeCode({ normalizeKnowledgeText });'));
  assert.ok(html.includes('const { entryMatchesToken } = CommunicationContextUtils.createEntryMatchesToken({'));
  assert.ok(html.includes('normalizeKnowledgeText,'));
  assert.ok(html.includes('canonicalKnowledgeCode,'));
  assert.ok(html.includes('const { resolveKnowledgeEntry } = CommunicationContextUtils.createResolveKnowledgeEntry({'));
  assert.ok(html.includes('knowledgeEntries,'));
  assert.ok(html.includes('entryMatchesToken,'));
  assert.ok(html.includes('const { findKnowledgeEntryByKey } = CommunicationContextUtils.createKnowledgeEntryFinder({'));
  assert.ok(html.includes('knowledgeEntries,'));
  assert.ok(html.includes('const { findKnowledgeEntriesByCode } = CommunicationContextUtils.createKnowledgeEntriesByCodeFinder({'));
  assert.ok(html.includes('canonicalKnowledgeCode,'));
  assert.ok(html.includes('const { relatedKnowledgeButtons } = CommunicationContextUtils.createRelatedKnowledgeButtons({'));
  assert.ok(html.includes('findKnowledgeEntriesByCode,'));
  assert.ok(html.includes('escapeHtml,'));
  assert.ok(html.includes('const { knowledgeDetailMarkup } = CommunicationContextUtils.createKnowledgeDetailMarkup({'));
  assert.ok(html.includes('knowledgeEntryDocumentLabel,'));
  assert.ok(html.includes('knowledgeCategoryLabel,'));
  assert.ok(html.includes('relatedKnowledgeButtons,'));
  assert.ok(html.includes('knowledgeDisclaimer: KNOWLEDGE_DISCLAIMER,'));
  assert.ok(html.includes('const { knowledgeEntryDocumentLabel } = CommunicationContextUtils.createKnowledgeDocumentLabeler({'));
  assert.ok(html.includes('knowledgeDocumentLabels: KNOWLEDGE_DOCUMENT_LABELS,'));
  assert.ok(html.includes('knowledgeEntryDocumentKey,'));
  assert.ok(html.includes('const { knowledgeCategoryLabel } = CommunicationContextUtils.createKnowledgeCategoryLabeler({'));
  assert.ok(html.includes('knowledgeCategoryLabels: KNOWLEDGE_CATEGORY_LABELS,'));
  assert.ok(html.includes('humanize,'));
  assert.ok(html.includes('const { knowledgeContextSummary } = CommunicationContextUtils.create({ canonicalKnowledgeCode });'));
  assert.ok(html.includes('const { formatAddressCode } = CommunicationContextUtils.createAddressFormatter({ normalizeLocalityCode, lookupLocality });'));
  assert.ok(html.includes('const { formatAddressDisplay } = CommunicationContextUtils.createAddressDisplayFormatter({ cleanDisplay, parseAddresses, normalizeLocalityCode, formatAddressCode });'));
  assert.ok(html.includes('const { formatFieldDisplay } = CommunicationContextUtils.createFieldDisplayFormatter({ cleanDisplay, formatAddressCode, formatAddressDisplay, displayValue });'));
});
