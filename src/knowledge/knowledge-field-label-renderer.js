(function () {
  'use strict';

  function createKnowledgeFieldLabelRenderer(options = {}) {
    const KNOWLEDGE_CLICK_FIELDS = options.knowledgeClickFields;
    const escapeHtml = options.escapeHtml;
    const resolveKnowledgeEntry = options.resolveKnowledgeEntry;
    if (!KNOWLEDGE_CLICK_FIELDS || typeof KNOWLEDGE_CLICK_FIELDS.has !== 'function') {
      throw new Error('FlightFlowKnowledgeFieldLabelRenderer requer knowledgeClickFields.');
    }
    if (typeof escapeHtml !== 'function' || typeof resolveKnowledgeEntry !== 'function') {
      throw new Error('FlightFlowKnowledgeFieldLabelRenderer requer escapeHtml e resolveKnowledgeEntry.');
    }

  function renderKnowledgeFieldLabel(key, label, rawValue, event) {
    if (!KNOWLEDGE_CLICK_FIELDS.has(key)) return escapeHtml(label);
    const entry = resolveKnowledgeEntry(key, rawValue, event);
    if (!entry) return escapeHtml(label);
    return `<button type="button" class="field-knowledge-link" data-knowledge-key="${escapeHtml(entry.key)}" data-knowledge-field="${escapeHtml(key)}" title="Consultar ${escapeHtml(entry.code)} na base normativa ATM">${escapeHtml(label)}</button>`;
  }

    return Object.freeze({ renderKnowledgeFieldLabel });
  }

  window.FlightFlowKnowledgeFieldLabelRenderer = Object.freeze({
    create: createKnowledgeFieldLabelRenderer,
  });
})();
