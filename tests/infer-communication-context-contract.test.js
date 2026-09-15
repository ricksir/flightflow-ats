'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'inferCommunicationContext';
const EXPECTED_BYTES = 3994;
const EXPECTED_SHA256 = '3aba0a949b32d9e8e42494686d581831ac920ae302e43b4782479fa4fa85cbe9';

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
    parseAddresses: value => String(value || '').split(/[\\s,;|/]+/).filter(Boolean),
    formatAddressCode: value => 'FMT:' + value,
    internalTransitionDetails: () => ({ previous: '', current: '' }),
    ...overrides,
  };

  return Function(
    'parseAddresses',
    'formatAddressCode',
    'internalTransitionDetails',
    source + '\nreturn inferCommunicationContext;'
  )(
    deps.parseAddresses,
    deps.formatAddressCode,
    deps.internalTransitionDetails
  );
}

test('inferCommunicationContext congela exatamente a fronteira selecionada no remapeamento #191', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
  assert.ok(source.startsWith('function inferCommunicationContext(event) {'));
  assert.ok(source.includes("flow: 'Fluxo ATS identificado no histórico'"));
  assert.ok(source.includes("flow = 'Criação e gravação interna do plano na base de dados operacional.';"));
  assert.ok(source.includes("flow = 'Correlação interna entre o plano de voo e a informação de vigilância.';"));
  assert.ok(source.includes("flow = 'Atualização interna dos horários e pontos estimados do plano.';"));
  assert.ok(source.includes("flow = 'Atualização interna do código SSR associado ao plano.';"));
  assert.ok(source.includes("flow = 'Encerramento e arquivamento interno do registro do plano de voo.';"));
});

test('inferCommunicationContext permanece sem acoplamento direto temporal, espacial ou de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.',
    'goTo(', 'renderCurrent(', 'currentEvent(', 'stopPlayback(', 'route', 'planner', 'interpol',
    'aircraft', 'timeline', 'scrubber', 'autoplay', 'realMapState', 'leaflet', 'geometry',
    'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal((source.match(/\bparseAddresses\s*\(/g) || []).length, 2);
  assert.equal((source.match(/\bformatAddressCode\b/g) || []).length, 2);
  assert.equal((source.match(/\binternalTransitionDetails\s*\(/g) || []).length, 1);
});

test('inferCommunicationContext mantém um único consumidor funcional em renderCommunication', () => {
  const kernel = kernelSource();
  assert.equal(kernel.split('inferCommunicationContext').length - 1, 2);
  assert.equal(kernel.split('function inferCommunicationContext(').length - 1, 1);

  const consumer = extractNamedFunction(kernel, 'renderCommunication');
  assert.equal(consumer.split('inferCommunicationContext(').length - 1, 1);
  assert.ok(consumer.includes('const context = inferCommunicationContext(event);'));
});

test('fluxo ATS externo preserva endereços, rótulos, headings e protocolo', () => {
  const parsed = [];
  const formatted = [];
  const fn = loadFunction({
    parseAddresses: value => {
      parsed.push(value);
      if (value === 'ORIG') return ['SBBRZQZX', 'SBBSZQZX'];
      if (value === 'DEST') return ['SBCWZQZX'];
      return [];
    },
    formatAddressCode: value => {
      formatted.push(value);
      return '<' + value + '>';
    },
    internalTransitionDetails: () => { throw new Error('não deve ser chamada em fluxo externo'); },
  });

  const result = fn({
    originator: 'ORIG',
    recipients: 'DEST',
    protocol: 'FPL',
    snapshot: {},
  });

  assert.deepEqual(result, {
    external: true,
    originators: ['SBBRZQZX', 'SBBSZQZX'],
    recipients: ['SBCWZQZX'],
    originLabel: '<SBBRZQZX> · <SBBSZQZX>',
    destinationLabel: '<SBCWZQZX>',
    originRaw: 'SBBRZQZX · SBBSZQZX',
    destinationRaw: 'SBCWZQZX',
    originHeading: 'Origem ATS',
    destinationHeading: 'Destino ATS',
    flow: 'Fluxo ATS identificado no histórico',
    format: 'FPL',
  });
  assert.deepEqual(parsed, ['ORIG', 'DEST']);
  assert.deepEqual(formatted, ['SBBRZQZX', 'SBBSZQZX', 'SBCWZQZX']);
});

test('fluxo externo usa snapshot antes do evento e preserva fallbacks de origem/destino/formato', () => {
  const fn = loadFunction({
    parseAddresses: value => value === 'SNAP-ORIG' ? ['SBBSZQZX'] : [],
  });

  const result = fn({
    originator: 'EVENT-ORIG',
    recipients: 'EVENT-DEST',
    protocol: '',
    snapshot: {
      originator: 'SNAP-ORIG',
      recipients: '',
      protocol: 'SNAP-PROTO',
    },
  });

  assert.equal(result.external, true);
  assert.deepEqual(result.originators, ['SBBSZQZX']);
  assert.deepEqual(result.recipients, []);
  assert.equal(result.originLabel, 'FMT:SBBSZQZX');
  assert.equal(result.destinationLabel, 'DESTINO NÃO INFORMADO');
  assert.equal(result.originRaw, 'SBBSZQZX');
  assert.equal(result.destinationRaw, '—');
  assert.equal(result.format, 'SNAP-PROTO');

  const fallback = loadFunction({
    parseAddresses: value => value === 'ONLY-DEST' ? ['SBCWZQZX'] : [],
  })({
    originator: '',
    recipients: 'ONLY-DEST',
    snapshot: {},
  });
  assert.equal(fallback.originLabel, 'ORIGEM NÃO INFORMADA');
  assert.equal(fallback.format, 'Formato inferido');
});

test('evento interno padrão preserva fallbacks e não expõe fluxo ATS externo', () => {
  let transitionCalls = 0;
  const fn = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: event => {
      transitionCalls += 1;
      assert.equal(event.operation, undefined);
      return { previous: '', current: '' };
    },
  });

  const result = fn({ snapshot: {} });

  assert.deepEqual(result, {
    external: false,
    originators: [],
    recipients: [],
    originLabel: 'SAGITÁRIO',
    destinationLabel: 'PLANO DE VOO',
    originRaw: 'PROCESSAMENTO INTERNO · SAGITÁRIO',
    destinationRaw: 'BASE DE DADOS DO PLANO · PLANO DE VOO',
    originHeading: 'Origem interna',
    destinationHeading: 'Destino interno',
    flow: 'Evento interno processado sem emissão de mensagem ATS externa.',
    format: 'EVENTO INTERNO · sem mensagem ATS externa',
  });
  assert.equal(transitionCalls, 1);
});

test('transição de estados preserva origem, destino e descrição previous → current', () => {
  const event = {
    operation: 'Transição de estados por comandos de solo',
    protocol: 'INT',
    snapshot: { position: 'ACC-BS', environment: 'OPER', callsign: 'TAM1234' },
  };
  const fn = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: actual => {
      assert.equal(actual, event);
      return { previous: 'PENDENTE', current: 'ATIVO' };
    },
  });

  const result = fn(event);
  assert.equal(result.originLabel, 'COMANDOS DE SOLO');
  assert.equal(result.destinationLabel, 'ESTADO: ATIVO');
  assert.equal(result.originRaw, 'ACC-BS · AMBIENTE OPER');
  assert.equal(result.destinationRaw, 'ATIVO');
  assert.equal(result.flow, 'Transição interna: PENDENTE → ATIVO');
  assert.equal(result.format, 'INT · sem mensagem ATS externa');

  const currentOnly = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: () => ({ previous: '', current: 'COORDENADO' }),
  })({ operation: 'TRANSIÇÃO DE ESTADOS', snapshot: {} });
  assert.equal(currentOnly.originLabel, 'GERENCIADOR DE ESTADOS');
  assert.equal(currentOnly.flow, 'Atualização interna do estado para: COORDENADO');

  const noTransition = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: () => ({ previous: '', current: '' }),
  })({ operation: 'TRANSIÇÃO DE ESTADOS', snapshot: {} });
  assert.equal(noTransition.destinationLabel, 'ESTADO DO PLANO');
  assert.equal(noTransition.destinationRaw, 'ATUALIZAÇÃO DO ESTADO OPERACIONAL');
  assert.equal(noTransition.flow, 'Atualização interna do estado operacional do plano.');
});

test('criação preserva distinção RPL, destino ACC e ID do plano', () => {
  const fn = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: () => ({ previous: '', current: '' }),
  });

  const rpl = fn({
    operation: 'Criação via RPL',
    snapshot: { callsign: 'GLO1234', idPlano: 'ABC123' },
  });
  assert.equal(rpl.originLabel, 'ARQUIVO DE RPL');
  assert.equal(rpl.destinationLabel, 'BASE DE DADOS DO ACC');
  assert.equal(rpl.originRaw, 'Criação via RPL');
  assert.equal(rpl.destinationRaw, 'GLO1234 · ID ABC123');
  assert.equal(rpl.flow, 'Criação e gravação interna do plano na base de dados operacional.');

  const manual = fn({
    operation: 'CRIAÇÃO MANUAL',
    snapshot: { callsign: 'AZU5678' },
  });
  assert.equal(manual.originLabel, 'MÓDULO DE CRIAÇÃO');
  assert.equal(manual.destinationRaw, 'AZU5678');
});

test('correlação, estimados, SSR e arquivamento preservam classificação interna', () => {
  const fn = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: () => ({ previous: '', current: '' }),
  });
  const base = { snapshot: { callsign: 'TAM1234' } };

  const correlation = fn({ ...base, operation: 'Correlação radar' });
  assert.equal(correlation.originLabel, 'PROCESSADOR DE CORRELAÇÃO');
  assert.equal(correlation.destinationLabel, 'TAM1234');
  assert.equal(correlation.flow, 'Correlação interna entre o plano de voo e a informação de vigilância.');

  const estimates = fn({ ...base, operation: 'Atualização de estimados' });
  assert.equal(estimates.originLabel, 'PROCESSADOR DE ESTIMADOS');
  assert.equal(estimates.flow, 'Atualização interna dos horários e pontos estimados do plano.');

  const ssr = fn({ ...base, operation: 'Atribuição SSR' });
  assert.equal(ssr.originLabel, 'GERENCIADOR SSR');
  assert.equal(ssr.flow, 'Atualização interna do código SSR associado ao plano.');

  const archive = fn({ ...base, operation: 'Arquivamento' });
  assert.equal(archive.originLabel, 'BASE OPERACIONAL');
  assert.equal(archive.destinationLabel, 'ARQUIVO DE PLANOS');
  assert.equal(archive.flow, 'Encerramento e arquivamento interno do registro do plano de voo.');
});

test('event.operation e event.protocol têm precedência sobre snapshot', () => {
  const fn = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: () => ({ previous: '', current: '' }),
  });

  const result = fn({
    operation: 'Atribuição SSR',
    protocol: 'EVENT-PROTO',
    snapshot: {
      operation: 'Arquivamento',
      protocol: 'SNAP-PROTO',
      callsign: 'AZU1234',
    },
  });

  assert.equal(result.originLabel, 'GERENCIADOR SSR');
  assert.equal(result.format, 'EVENT-PROTO · sem mensagem ATS externa');
});

test('inferCommunicationContext não muta evento/snapshot e propaga erros das dependências', () => {
  const event = {
    operation: 'Evento interno',
    snapshot: { position: 'ACC', callsign: 'TAM0001', nested: { keep: true } },
  };
  const before = JSON.stringify(event);
  const fn = loadFunction({
    parseAddresses: () => [],
    internalTransitionDetails: () => ({ previous: '', current: '' }),
  });
  fn(event);
  assert.equal(JSON.stringify(event), before);

  const parseError = new Error('parse sentinel');
  assert.throws(
    () => loadFunction({ parseAddresses: () => { throw parseError; } })({ snapshot: {} }),
    error => error === parseError
  );

  const formatError = new Error('format sentinel');
  assert.throws(
    () => loadFunction({
      parseAddresses: value => value === 'A' ? ['ADDR'] : [],
      formatAddressCode: () => { throw formatError; },
    })({ originator: 'A', snapshot: {} }),
    error => error === formatError
  );

  const transitionError = new Error('transition sentinel');
  assert.throws(
    () => loadFunction({
      parseAddresses: () => [],
      internalTransitionDetails: () => { throw transitionError; },
    })({ snapshot: {} }),
    error => error === transitionError
  );
});
