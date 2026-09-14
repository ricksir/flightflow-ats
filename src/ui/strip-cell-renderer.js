(function () {
  'use strict';

  function createStripCellRenderer(options = {}) {
    const STRIP_FIELD_DEFS = options.stripFieldDefs;
    const escapeHtml = options.escapeHtml;
    const displayValue = options.displayValue;
    if (!STRIP_FIELD_DEFS || typeof escapeHtml !== 'function' || typeof displayValue !== 'function') {
      throw new Error('FlightFlowStripCellRenderer requer stripFieldDefs, escapeHtml e displayValue.');
    }

  function stripCell(code,value,cls='',changed=false){const def=STRIP_FIELD_DEFS[code];return `<button type="button" class="strip-cell ${cls} ${changed?'updated':''}" data-strip-field="${code}" data-strip-value="${escapeHtml(displayValue(value,''))}" data-strip-updated="${changed?'true':'false'}" title="Consultar ${escapeHtml(def?def.label:code)} e o significado da cor"><span class="strip-code">${code}</span><span class="strip-value">${escapeHtml(displayValue(value,''))}</span></button>`;}

    return Object.freeze({ stripCell });
  }

  window.FlightFlowStripCellRenderer = Object.freeze({
    create: createStripCellRenderer,
  });
})();
