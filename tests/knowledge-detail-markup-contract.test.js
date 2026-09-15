'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'knowledgeDetailMarkup';
const EXPECTED_BYTES = 1739;
const EXPECTED_SHA256 = '3a516046ca6d13484c3cb8ad157285cb05566e83a05d434887cee03b82c24285';

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
    escapeHtml: value => String(value),
    knowledgeEntryDocumentLabel: () => 'DOC',
    knowledgeCategoryLabel: value => String(value),
    relatedKnowledgeButtons: () => '',
    KNOWLEDGE_DISCLAIMER: 'DISCLAIMER',
    ...overrides,
  };
  return Function(
    'escapeHtml',
    'knowledgeEntryDocumentLabel',
    'knowledgeCategoryLabel',
    'relatedKnowledgeButtons',
    'KNOWLEDGE_DISCLAIMER',
    source + '\nreturn knowledgeDetailMarkup;'
  )(
    deps.escapeHtml,
    deps.knowledgeEntryDocumentLabel,
    deps.knowledgeCategoryLabel,
    deps.relatedKnowledgeButtons,
    deps.KNOWLEDGE_DISCLAIMER
  );
}

test('knowledgeDetailMarkup congela exatamente a fronteira selecionada no remapeamento #183', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
  assert.ok(source.startsWith('function knowledgeDetailMarkup(entry, options = {}) {'));
  assert.ok(source.includes("if (!entry) return '<div class=\"knowledge-empty\">Selecione uma mensagem, status ou termo.</div>';"));
  assert.ok(source.includes('relatedKnowledgeButtons(entry)'));
});

test('knowledgeDetailMarkup permanece sem acoplamento temporal, espacial ou de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.',
    'goTo(', 'renderCurrent(', 'currentEvent(', 'stopPlayback(', 'planner', 'interpol', 'aircraft',
    'timeline', 'scrubber', 'autoplay', 'realMapState', 'leaflet', 'geometry',
    'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal(source.split('knowledgeEntryDocumentLabel(').length - 1, 1);
  assert.equal(source.split('knowledgeCategoryLabel(').length - 1, 1);
  assert.equal(source.split('relatedKnowledgeButtons(').length - 1, 1);
  assert.equal(source.split('escapeHtml(').length - 1, 9);
  assert.equal(source.split('KNOWLEDGE_DISCLAIMER').length - 1, 1);
});

test('knowledgeDetailMarkup preserva exatamente três consumidores funcionais no núcleo', () => {
  const kernel = kernelSource();
  assert.equal(kernel.split('knowledgeDetailMarkup').length - 1, 4);

  const openDetail = extractNamedFunction(kernel, 'openKnowledgeDetail');
  const relatedClick = extractNamedFunction(kernel, 'handleKnowledgeRelatedClick');
  const browserDetail = extractNamedFunction(kernel, 'renderKnowledgeBrowserDetail');

  assert.equal(openDetail.split('knowledgeDetailMarkup(').length - 1, 1);
  assert.ok(openDetail.includes('knowledgeDetailMarkup(entry, { context })'));

  assert.equal(relatedClick.split('knowledgeDetailMarkup(').length - 1, 1);
  assert.ok(relatedClick.includes('knowledgeDetailMarkup(entry)'));

  assert.equal(browserDetail.split('knowledgeDetailMarkup(').length - 1, 1);
  assert.ok(browserDetail.includes('knowledgeDetailMarkup(entry, { browser:true })'));
});

test('knowledgeDetailMarkup mantém fallback vazio quando não há entrada', () => {
  const calls = [];
  const fn = loadFunction({
    escapeHtml: value => { calls.push(['escape', value]); return String(value); },
    knowledgeEntryDocumentLabel: entry => { calls.push(['document', entry]); return 'DOC'; },
    knowledgeCategoryLabel: category => { calls.push(['category', category]); return 'CAT'; },
    relatedKnowledgeButtons: entry => { calls.push(['related', entry]); return ''; },
  });

  assert.equal(fn(null), '<div class="knowledge-empty">Selecione uma mensagem, status ou termo.</div>');
  assert.deepEqual(calls, []);
});

test('knowledgeDetailMarkup preserva contexto, fatos, complementar, referência e escaping', () => {
  const escaped = [];
  const relatedCalls = [];
  const escapeHtml = value => {
    escaped.push(value);
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  const fn = loadFunction({
    escapeHtml,
    knowledgeEntryDocumentLabel: () => '<DOC>',
    knowledgeCategoryLabel: () => '<CAT>',
    relatedKnowledgeButtons: entry => {
      relatedCalls.push(entry);
      return '<div class="related-sentinel"></div>';
    },
    KNOWLEDGE_DISCLAIMER: '<DISCLAIMER>',
  });

  const entry = {
    key: 'K1',
    code: '<CODE>',
    category: 'message',
    title: '<TITLE>',
    short: '<SHORT>',
    definition: '<DEF>',
    direction: '<DIR>',
    when: '<WHEN>',
    effect: '<EFFECT>',
    responses: '<RESP>',
    notes: '<NOTE>',
    source: '<SOURCE>',
    normative: false,
  };
  const context = {
    originator: '<ORG>',
    recipients: '<REC>',
    direction: '<CTXDIR>',
    eventNumber: 79,
    timestamp: '01:36',
  };

  const html = fn(entry, { context });
  assert.ok(html.includes('&lt;CODE&gt;'));
  assert.ok(html.includes('&lt;DOC&gt; · &lt;CAT&gt; · COMPLEMENTAR'));
  assert.ok(html.includes('<h3>&lt;TITLE&gt;</h3>'));
  assert.ok(html.includes('<p>&lt;SHORT&gt;</p>'));
  assert.ok(html.includes('Evento 79 · 01:36'));
  assert.ok(html.includes('&lt;ORG&gt;'));
  assert.ok(html.includes('&lt;REC&gt;'));
  assert.ok(html.includes('&lt;CTXDIR&gt;'));
  assert.ok(html.includes('<strong>Referência:</strong> &lt;SOURCE&gt;<br>&lt;DISCLAIMER&gt;'));
  assert.ok(html.endsWith('<div class="related-sentinel"></div>'));
  assert.equal((html.match(/class="knowledge-fact"/g) || []).length, 10);
  assert.deepEqual(relatedCalls, [entry]);

  for (const value of [
    '<CODE>', '<DOC>', '<CAT>', '<TITLE>', '<SHORT>', 'Definição', '<DEF>',
    'Fluxo normativo / geral', '<DIR>', 'Originador neste evento', '<ORG>',
    'Destinatário(s) neste evento', '<REC>', 'Fluxo efetivamente registrado', '<CTXDIR>',
    'Evento / horário', 'Evento 79 · 01:36', 'Quando ocorre', '<WHEN>',
    'Efeito no plano ou na strip', '<EFFECT>', 'Resposta ou próximo passo', '<RESP>',
    'Observação', '<NOTE>', '<SOURCE>', '<DISCLAIMER>'
  ]) {
    assert.ok(escaped.includes(value), 'valor deveria passar por escapeHtml: ' + value);
  }
});

test('knowledgeDetailMarkup omite fatos vazios, referência ausente e usa definition quando short falta', () => {
  const fn = loadFunction({
    escapeHtml: value => '[' + String(value) + ']',
    knowledgeEntryDocumentLabel: () => 'DOC',
    knowledgeCategoryLabel: () => 'CAT',
    relatedKnowledgeButtons: () => '<R/>',
  });

  const html = fn({
    code: 'C',
    category: 'message',
    title: 'T',
    short: '',
    definition: 'DEF',
    direction: '',
    when: 'WHEN',
    effect: '',
    responses: 'RESP',
    notes: '',
    source: '',
    normative: true,
  }, { browser: true });

  assert.ok(html.includes('<p>[DEF]</p>'));
  assert.equal(html.includes('COMPLEMENTAR'), false);
  assert.equal(html.includes('Referência:'), false);
  assert.equal(html.includes('Fluxo normativo / geral'), false);
  assert.equal(html.includes('Efeito no plano ou na strip'), false);
  assert.equal(html.includes('Observação'), false);
  assert.equal((html.match(/class="knowledge-fact"/g) || []).length, 3);
  assert.ok(html.endsWith('<R/>'));
});

test('knowledgeDetailMarkup não muta entradas/opções e propaga erros das dependências', () => {
  const entry = Object.freeze({
    code: 'C',
    category: 'message',
    title: 'T',
    short: 'S',
    definition: 'D',
    direction: 'DIR',
    when: 'W',
    effect: 'E',
    responses: 'R',
    notes: 'N',
    source: 'SRC',
    normative: true,
  });
  const context = Object.freeze({
    originator: 'O',
    recipients: 'D',
    direction: 'F',
    eventNumber: 1,
    timestamp: '00:01',
  });
  const options = Object.freeze({ context });

  const fn = loadFunction();
  fn(entry, options);
  assert.equal(options.context, context);

  const sentinels = [
    ['escapeHtml', { escapeHtml: () => { throw new Error('escape sentinel'); } }, 'escape sentinel'],
    ['knowledgeEntryDocumentLabel', { knowledgeEntryDocumentLabel: () => { throw new Error('document sentinel'); } }, 'document sentinel'],
    ['knowledgeCategoryLabel', { knowledgeCategoryLabel: () => { throw new Error('category sentinel'); } }, 'category sentinel'],
    ['relatedKnowledgeButtons', { relatedKnowledgeButtons: () => { throw new Error('related sentinel'); } }, 'related sentinel'],
  ];

  for (const [name, overrides, message] of sentinels) {
    const failing = loadFunction(overrides);
    assert.throws(() => failing(entry, options), new RegExp(message), name + ' deve propagar erro');
  }
});
