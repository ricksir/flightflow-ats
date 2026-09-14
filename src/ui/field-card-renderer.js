(function () {
  'use strict';

  function createFieldCardRenderer(options = {}) {
    const getFieldLayout = options.getFieldLayout;
    const escapeHtml = options.escapeHtml;
    const fieldEditControlsMarkup = options.fieldEditControlsMarkup;
    if (typeof getFieldLayout !== 'function' || typeof escapeHtml !== 'function' || typeof fieldEditControlsMarkup !== 'function') {
      throw new Error('FlightFlowFieldCardRenderer requer getFieldLayout, escapeHtml e fieldEditControlsMarkup.');
    }

  function fieldCardMarkup(key, def, valueHtml, labelHtml, before, changed) {
    const layout = getFieldLayout(key);
    return `<div class="field-card ${changed ? 'changed' : ''}" data-field="${escapeHtml(key)}" data-span="${layout.span}">${fieldEditControlsMarkup(key)}
      ${changed ? '<span class="change-tag">ATUALIZADO</span>' : ''}
      <div class="field-label">${labelHtml}</div>
      <div class="field-value">${valueHtml}</div>
      <div class="field-previous">${escapeHtml(before && before !== '—' ? before : '')}</div>
    </div>`;
  }

    return Object.freeze({ fieldCardMarkup });
  }

  window.FlightFlowFieldCardRenderer = Object.freeze({
    create: createFieldCardRenderer,
  });
})();
