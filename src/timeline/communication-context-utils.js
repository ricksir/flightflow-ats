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
    createCanonicalKnowledgeCode,
    createKnowledgeEntryFinder,
    createKnowledgeEntriesByCodeFinder,
    createKnowledgeDocumentLabeler,
    createKnowledgeCategoryLabeler,
    create: createCommunicationContextUtils,
    createAddressFormatter,
    createAddressDisplayFormatter,
    createFieldDisplayFormatter,
  });
})();
