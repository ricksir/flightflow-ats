(function () {
  'use strict';

  function createFieldLayoutUtils(options = {}) {
    const FIELD_DEFS = options.fieldDefs;
    if (!FIELD_DEFS || typeof FIELD_DEFS !== 'object') {
      throw new Error('FlightFlowFieldLayoutUtils requer fieldDefs.');
    }

  function normalizeFieldLayout(input = {}) {
    const output = {};
    Object.keys(FIELD_DEFS).forEach(key => {
      const saved = input && input[key] ? input[key] : null;
      output[key] = { span: Number(saved && saved.span) === 2 ? 2 : (FIELD_DEFS[key].wide ? 2 : 1) };
    });
    return output;
  }

    return Object.freeze({ normalizeFieldLayout });
  }

  window.FlightFlowFieldLayoutUtils = Object.freeze({
    create: createFieldLayoutUtils,
  });
})();
