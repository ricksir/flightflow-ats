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

  window.FlightFlowCommunicationContextUtils = Object.freeze({
    internalTransitionDetails,
    create: createCommunicationContextUtils,
    createAddressFormatter,
  });
})();
