(function () {
  'use strict';

  function internalTransitionDetails(event) {
    const normalize = value => String(value == null ? '' : value).trim();
    const s = (event && event.snapshot) || {};
    const raw = String((event && event.rawBlock) || '');
    const previousMatch = /^Estado anterior:\s*([^\n]+)$/mi.exec(raw);
    const currentMatch = /^Estado atual:\s*([^\n]+)$/mi.exec(raw);
    const previous = (previousMatch ? previousMatch[1] : '') || s.previousControlState;
    const current = (currentMatch ? currentMatch[1] : '') || s.groundState || s.authorizationState;
    return { previous: normalize(previous), current: normalize(current) };
  }

  function parseAddresses(value) {
    const text = String(value || '').toUpperCase();
    const matches = text.match(/\b[A-Z]{4}[A-Z0-9]{4}\b/g) || [];
    if (matches.length) return [...new Set(matches)];
    return [...new Set(text.split(/[\s,;|/]+/).map(v => v.replace(/[^A-Z0-9-]/g,'')).filter(v => v.length >= 4))];
  }

  function knowledgeEntryDocumentKey(entry) {
    const source = String(entry?.sourceDocument || entry?.source || '').toUpperCase();
    if (source.includes('SAGITARIO ACC') || source.includes('DISCIPLINA II')) return 'SAGITARIO';
    if (source.includes('MCA 100-27')) return 'MCA';
    return 'CIRCEA';
  }

  function normalizeKnowledgeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[–—]/g,'-').replace(/[^A-Z0-9-]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function createCommunicationContextInferer(options = {}) {
    const parseAddresses = options.parseAddresses;
    const formatAddressCode = options.formatAddressCode;
    const internalTransitionDetails = options.internalTransitionDetails;
    if (typeof parseAddresses !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer parseAddresses para inferir contexto.');
    }
    if (typeof formatAddressCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer formatAddressCode para inferir contexto.');
    }
    if (typeof internalTransitionDetails !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer internalTransitionDetails para inferir contexto.');
    }

  function inferCommunicationContext(event) {
    const s = (event && event.snapshot) || {};
    const originators = parseAddresses(s.originator || event.originator || '');
    const recipients = parseAddresses(s.recipients || event.recipients || '');
    const external = Boolean(originators.length || recipients.length);
    if (external) {
      return {
        external: true,
        originators,
        recipients,
        originLabel: originators.length ? originators.map(formatAddressCode).join(' · ') : 'ORIGEM NÃO INFORMADA',
        destinationLabel: recipients.length ? recipients.map(formatAddressCode).join(' · ') : 'DESTINO NÃO INFORMADO',
        originRaw: originators.join(' · ') || '—',
        destinationRaw: recipients.join(' · ') || '—',
        originHeading: 'Origem ATS',
        destinationHeading: 'Destino ATS',
        flow: 'Fluxo ATS identificado no histórico',
        format: event.protocol || s.protocol || 'Formato inferido'
      };
    }

    const operation = String(event.operation || s.operation || 'Evento interno');
    const upper = operation.toUpperCase();
    const transition = internalTransitionDetails(event);
    const position = String(s.position || '').trim() || 'SAGITÁRIO';
    const environment = String(s.environment || '').trim();
    const callsign = String(s.callsign || '').trim() || 'PLANO DE VOO';
    let originLabel = `${position}${environment ? ` · ${environment}` : ''}`;
    let destinationLabel = callsign;
    let originRaw = `PROCESSAMENTO INTERNO · ${position}`;
    let destinationRaw = `BASE DE DADOS DO PLANO · ${callsign}`;
    let flow = 'Evento interno processado sem emissão de mensagem ATS externa.';

    if (/TRANSI(?:Ç|C)ÃO DE ESTADOS/.test(upper)) {
      originLabel = /COMANDOS DE SOLO/.test(upper) ? 'COMANDOS DE SOLO' : 'GERENCIADOR DE ESTADOS';
      destinationLabel = transition.current ? `ESTADO: ${transition.current}` : 'ESTADO DO PLANO';
      originRaw = `${position}${environment ? ` · AMBIENTE ${environment}` : ''}`;
      destinationRaw = transition.current || 'ATUALIZAÇÃO DO ESTADO OPERACIONAL';
      flow = transition.previous && transition.current
        ? `Transição interna: ${transition.previous} → ${transition.current}`
        : transition.current
          ? `Atualização interna do estado para: ${transition.current}`
          : 'Atualização interna do estado operacional do plano.';
    } else if (/CRIA(?:Ç|C)ÃO/.test(upper)) {
      originLabel = /RPL/.test(upper) ? 'ARQUIVO DE RPL' : 'MÓDULO DE CRIAÇÃO';
      destinationLabel = 'BASE DE DADOS DO ACC';
      originRaw = operation;
      destinationRaw = `${callsign}${s.idPlano ? ` · ID ${s.idPlano}` : ''}`;
      flow = 'Criação e gravação interna do plano na base de dados operacional.';
    } else if (/CORRELA(?:Ç|C)ÃO/.test(upper)) {
      originLabel = 'PROCESSADOR DE CORRELAÇÃO';
      destinationLabel = callsign;
      flow = 'Correlação interna entre o plano de voo e a informação de vigilância.';
    } else if (/ESTIMAD/.test(upper)) {
      originLabel = 'PROCESSADOR DE ESTIMADOS';
      destinationLabel = callsign;
      flow = 'Atualização interna dos horários e pontos estimados do plano.';
    } else if (/SSR/.test(upper)) {
      originLabel = 'GERENCIADOR SSR';
      destinationLabel = callsign;
      flow = 'Atualização interna do código SSR associado ao plano.';
    } else if (/ARQUIV/.test(upper)) {
      originLabel = 'BASE OPERACIONAL';
      destinationLabel = 'ARQUIVO DE PLANOS';
      flow = 'Encerramento e arquivamento interno do registro do plano de voo.';
    }

    return {
      external: false,
      originators: [],
      recipients: [],
      originLabel,
      destinationLabel,
      originRaw,
      destinationRaw,
      originHeading: 'Origem interna',
      destinationHeading: 'Destino interno',
      flow,
      format: `${event.protocol || s.protocol || 'EVENTO INTERNO'} · sem mensagem ATS externa`
    };
  }

    return Object.freeze({ inferCommunicationContext });
  }

  function createCanonicalKnowledgeCode(options = {}) {
    const normalizeKnowledgeText = options.normalizeKnowledgeText;
    if (typeof normalizeKnowledgeText !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer normalizeKnowledgeText para código canônico.');
    }

  function canonicalKnowledgeCode(value) {
    return normalizeKnowledgeText(value).replace(/[^A-Z0-9]/g, '');
  }

    return Object.freeze({ canonicalKnowledgeCode });
  }

  function createEntryMatchesToken(options = {}) {
    const normalizeKnowledgeText = options.normalizeKnowledgeText;
    const canonicalKnowledgeCode = options.canonicalKnowledgeCode;
    if (typeof normalizeKnowledgeText !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer normalizeKnowledgeText para correspondência de token.');
    }
    if (typeof canonicalKnowledgeCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode para correspondência de token.');
    }

  function entryMatchesToken(entry, normalizedText) {
    const candidates = [entry.code, ...(entry.aliases || [])].map(normalizeKnowledgeText).filter(Boolean);
    const normalizedCanonical = canonicalKnowledgeCode(normalizedText);
    return candidates.some(candidate => {
      if (normalizedText === candidate || normalizedCanonical === canonicalKnowledgeCode(candidate)) return true;
      const parts = candidate.split(/[\s\-/]+/).filter(Boolean).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (!parts.length) return false;
      const flexible = parts.join('[\\s\-/]*');
      return new RegExp(`(?:^|[^A-Z0-9])${flexible}(?:$|[^A-Z0-9])`, 'i').test(normalizedText);
    });
  }

    return Object.freeze({ entryMatchesToken });
  }

  function createResolveKnowledgeEntry(options = {}) {
    const normalizeKnowledgeText = options.normalizeKnowledgeText;
    const knowledgeEntries = options.knowledgeEntries;
    const canonicalKnowledgeCode = options.canonicalKnowledgeCode;
    const entryMatchesToken = options.entryMatchesToken;
    if (typeof normalizeKnowledgeText !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer normalizeKnowledgeText para resolver conhecimento.');
    }
    if (typeof knowledgeEntries !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeEntries para resolver conhecimento.');
    }
    if (typeof canonicalKnowledgeCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode para resolver conhecimento.');
    }
    if (typeof entryMatchesToken !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer entryMatchesToken para resolver conhecimento.');
    }

  function resolveKnowledgeEntry(fieldKey, rawValue, event) {
    const textParts = [rawValue];
    if (fieldKey === 'operation' && event) textParts.push(event.messageType, event.operation);
    if (fieldKey === 'protocol' && event) textParts.push(event.messageType, event.protocol);
    const normalized = normalizeKnowledgeText(textParts.filter(Boolean).join(' '));
    if (!normalized) return null;
    let priorities;
    if (fieldKey === 'messageType' || fieldKey === 'operation' || fieldKey === 'protocol') priorities = ['message','status_sagitario','status_tatic','plan_state','term','mca_abbreviation','mca_definition','mca_general'];
    else if (fieldKey === 'status') priorities = ['plan_state','status_sagitario','status_tatic','message','term','mca_abbreviation','mca_definition','mca_general'];
    else priorities = ['status_tatic','status_sagitario','message','plan_state','term','mca_abbreviation','mca_definition','mca_general'];
    const entries = knowledgeEntries().slice().sort((a,b) => String(b.code).length - String(a.code).length);
    if (fieldKey === 'messageType' || fieldKey === 'operation' || fieldKey === 'protocol') {
      const normalizedCanonical = canonicalKnowledgeCode(normalized);
      const exact = entries.filter(entry => canonicalKnowledgeCode(entry.code) === normalizedCanonical || (entry.aliases || []).some(alias => canonicalKnowledgeCode(alias) === normalizedCanonical));
      const preferred = exact.find(entry => entry.category === 'message' && entry.normative !== false)
        || exact.find(entry => entry.category === 'mca_abbreviation')
        || exact.find(entry => entry.category === 'message');
      if (preferred) return preferred;
    }
    for (const category of priorities) {
      const match = entries.find(entry => entry.category === category && entryMatchesToken(entry, normalized));
      if (match) return match;
    }
    return null;
  }

    return Object.freeze({ resolveKnowledgeEntry });
  }

  function createKnowledgeEntryFinder(options = {}) {
    const knowledgeEntries = options.knowledgeEntries;
    if (typeof knowledgeEntries !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeEntries.');
    }

  function findKnowledgeEntryByKey(key) {
    return knowledgeEntries().find(entry => entry.key === key) || null;
  }

    return Object.freeze({ findKnowledgeEntryByKey });
  }

  function createKnowledgeEntriesByCodeFinder(options = {}) {
    const knowledgeEntries = options.knowledgeEntries;
    const canonicalKnowledgeCode = options.canonicalKnowledgeCode;
    if (typeof knowledgeEntries !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeEntries para busca por código.');
    }
    if (typeof canonicalKnowledgeCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode para busca por código.');
    }

  function findKnowledgeEntriesByCode(code) {
    const normalized = canonicalKnowledgeCode(code);
    return knowledgeEntries().filter(entry => canonicalKnowledgeCode(entry.code) === normalized || (entry.aliases || []).some(alias => canonicalKnowledgeCode(alias) === normalized));
  }

    return Object.freeze({ findKnowledgeEntriesByCode });
  }

  function createRelatedKnowledgeButtons(options = {}) {
    const findKnowledgeEntriesByCode = options.findKnowledgeEntriesByCode;
    const escapeHtml = options.escapeHtml;
    if (typeof findKnowledgeEntriesByCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer findKnowledgeEntriesByCode para relacionados.');
    }
    if (typeof escapeHtml !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer escapeHtml para relacionados.');
    }

  function relatedKnowledgeButtons(entry) {
    const codes = Array.isArray(entry.related) ? entry.related : [];
    const matches = [];
    const seen = new Set();
    codes.forEach(code => findKnowledgeEntriesByCode(code).forEach(item => {
      if (item.key === entry.key || seen.has(item.key)) return;
      seen.add(item.key); matches.push(item);
    }));
    if (!matches.length) return '';
    return `<div class="knowledge-related">${matches.slice(0,12).map(item => `<button type="button" data-related-knowledge="${escapeHtml(item.key)}">${escapeHtml(item.code)} · ${escapeHtml(item.title)}</button>`).join('')}</div>`;
  }

    return Object.freeze({ relatedKnowledgeButtons });
  }

  function createKnowledgeDetailMarkup(options = {}) {
    const escapeHtml = options.escapeHtml;
    const knowledgeEntryDocumentLabel = options.knowledgeEntryDocumentLabel;
    const knowledgeCategoryLabel = options.knowledgeCategoryLabel;
    const relatedKnowledgeButtons = options.relatedKnowledgeButtons;
    const KNOWLEDGE_DISCLAIMER = options.knowledgeDisclaimer;
    if (typeof escapeHtml !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer escapeHtml para detalhe de conhecimento.');
    }
    if (typeof knowledgeEntryDocumentLabel !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeEntryDocumentLabel para detalhe de conhecimento.');
    }
    if (typeof knowledgeCategoryLabel !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeCategoryLabel para detalhe de conhecimento.');
    }
    if (typeof relatedKnowledgeButtons !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer relatedKnowledgeButtons para detalhe de conhecimento.');
    }

  function knowledgeDetailMarkup(entry, options = {}) {
    if (!entry) return '<div class="knowledge-empty">Selecione uma mensagem, status ou termo.</div>';
    const context = options.context || null;
    const facts = [
      ['Definição', entry.definition],
      ['Fluxo normativo / geral', entry.direction],
      context && ['Originador neste evento', context.originator],
      context && ['Destinatário(s) neste evento', context.recipients],
      context && ['Fluxo efetivamente registrado', context.direction],
      context && ['Evento / horário', `${context.eventNumber ? `Evento ${context.eventNumber}` : 'Evento'}${context.timestamp ? ` · ${context.timestamp}` : ''}`],
      ['Quando ocorre', entry.when],
      ['Efeito no plano ou na strip', entry.effect],
      ['Resposta ou próximo passo', entry.responses],
      ['Observação', entry.notes]
    ].filter(item => Array.isArray(item) && item[1]);
    return `<section class="knowledge-hero">
      <div class="knowledge-code">${escapeHtml(entry.code)}</div>
      <div><span class="knowledge-category">${escapeHtml(knowledgeEntryDocumentLabel(entry))} · ${escapeHtml(knowledgeCategoryLabel(entry.category))}${entry.normative === false ? ' · COMPLEMENTAR' : ''}</span><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.short || entry.definition)}</p></div>
    </section>
    <dl class="knowledge-facts">${facts.map(([label,value]) => `<div class="knowledge-fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
    ${entry.source ? `<div class="knowledge-source-note"><strong>Referência:</strong> ${escapeHtml(entry.source)}<br>${escapeHtml(KNOWLEDGE_DISCLAIMER)}</div>` : ''}
    ${relatedKnowledgeButtons(entry)}`;
  }

    return Object.freeze({ knowledgeDetailMarkup });
  }

  function createKnowledgeDocumentLabeler(options = {}) {
    const KNOWLEDGE_DOCUMENT_LABELS = options.knowledgeDocumentLabels;
    const knowledgeEntryDocumentKey = options.knowledgeEntryDocumentKey;
    if (!KNOWLEDGE_DOCUMENT_LABELS || typeof KNOWLEDGE_DOCUMENT_LABELS !== 'object') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeDocumentLabels.');
    }
    if (typeof knowledgeEntryDocumentKey !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeEntryDocumentKey para rótulos.');
    }

  function knowledgeEntryDocumentLabel(entry) {
    return KNOWLEDGE_DOCUMENT_LABELS[knowledgeEntryDocumentKey(entry)] || 'Base normativa ATM';
  }

    return Object.freeze({ knowledgeEntryDocumentLabel });
  }

  function createKnowledgeCategoryLabeler(options = {}) {
    const KNOWLEDGE_CATEGORY_LABELS = options.knowledgeCategoryLabels;
    const humanize = options.humanize;
    if (!KNOWLEDGE_CATEGORY_LABELS || typeof KNOWLEDGE_CATEGORY_LABELS !== 'object') {
      throw new Error('FlightFlowCommunicationContextUtils requer knowledgeCategoryLabels.');
    }
    if (typeof humanize !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer humanize para categorias.');
    }

  function knowledgeCategoryLabel(category) {
    return KNOWLEDGE_CATEGORY_LABELS[category] || humanize(category);
  }

    return Object.freeze({ knowledgeCategoryLabel });
  }

  function createCommunicationContextUtils(options = {}) {
    const canonicalKnowledgeCode = options.canonicalKnowledgeCode;
    if (typeof canonicalKnowledgeCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer canonicalKnowledgeCode.');
    }

  function knowledgeContextSummary(entry, context) {
    if (!context) return '';
    const prefix = canonicalKnowledgeCode(entry.code) === 'RQP'
      ? 'Neste RQP, os papéis são obtidos do endereçamento real do histórico, sem presumir que a solicitação partiu de uma TWR.'
      : 'Endereçamento registrado neste evento.';
    return `${prefix}
Originador: ${context.originator}
Destinatário(s): ${context.recipients}`;
  }

    return Object.freeze({ knowledgeContextSummary });
  }

  function createAddressFormatter(options = {}) {
    const normalizeLocalityCode = options.normalizeLocalityCode;
    const lookupLocality = options.lookupLocality;
    if (typeof normalizeLocalityCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer normalizeLocalityCode.');
    }
    if (typeof lookupLocality !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer lookupLocality.');
    }

  function formatAddressCode(code) {
    const normalized = normalizeLocalityCode(code);
    if (!normalized) return '—';
    const locality = lookupLocality(normalized);
    return locality ? `${normalized} — ${locality}` : normalized;
  }

    return Object.freeze({ formatAddressCode });
  }

  function createAddressDisplayFormatter(options = {}) {
    const cleanDisplay = options.cleanDisplay;
    const parseAddresses = options.parseAddresses;
    const normalizeLocalityCode = options.normalizeLocalityCode;
    const formatAddressCode = options.formatAddressCode;
    if (typeof cleanDisplay !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer cleanDisplay.');
    }
    if (typeof parseAddresses !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer parseAddresses.');
    }
    if (typeof normalizeLocalityCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer normalizeLocalityCode para display.');
    }
    if (typeof formatAddressCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer formatAddressCode.');
    }

  function formatAddressDisplay(value) {
    const raw = cleanDisplay(value);
    const addresses = parseAddresses(raw);
    if (!addresses.length) {
      const normalized = normalizeLocalityCode(raw);
      return normalized ? formatAddressCode(normalized) : (raw || '—');
    }
    return [...new Set(addresses)].map(formatAddressCode).join(' · ');
  }

    return Object.freeze({ formatAddressDisplay });
  }

  function createFieldDisplayFormatter(options = {}) {
    const cleanDisplay = options.cleanDisplay;
    const formatAddressCode = options.formatAddressCode;
    const formatAddressDisplay = options.formatAddressDisplay;
    const displayValue = options.displayValue;
    if (typeof cleanDisplay !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer cleanDisplay para campos.');
    }
    if (typeof formatAddressCode !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer formatAddressCode para campos.');
    }
    if (typeof formatAddressDisplay !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer formatAddressDisplay.');
    }
    if (typeof displayValue !== 'function') {
      throw new Error('FlightFlowCommunicationContextUtils requer displayValue.');
    }

  function formatFieldDisplay(key, value) {
    if (['adep','ades'].includes(key)) {
      const code = cleanDisplay(value);
      return code ? formatAddressCode(code) : '—';
    }
    if (key === 'originator' || key === 'recipients') return formatAddressDisplay(value);
    return displayValue(value);
  }

    return Object.freeze({ formatFieldDisplay });
  }

  window.FlightFlowCommunicationContextUtils = Object.freeze({
    internalTransitionDetails,
    parseAddresses,
    knowledgeEntryDocumentKey,
    normalizeKnowledgeText,
    createCommunicationContextInferer,
    createCanonicalKnowledgeCode,
    createEntryMatchesToken,
    createResolveKnowledgeEntry,
    createKnowledgeEntryFinder,
    createKnowledgeEntriesByCodeFinder,
    createRelatedKnowledgeButtons,
    createKnowledgeDetailMarkup,
    createKnowledgeDocumentLabeler,
    createKnowledgeCategoryLabeler,
    create: createCommunicationContextUtils,
    createAddressFormatter,
    createAddressDisplayFormatter,
    createFieldDisplayFormatter,
  });
})();
