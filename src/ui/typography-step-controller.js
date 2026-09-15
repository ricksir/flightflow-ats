(function (global) {
  'use strict';

  function createTypographyStepController(options = {}) {
    const state = options.state;
    const applyTypography = options.applyTypography;
    if (!state || typeof state !== 'object') {
      throw new Error('FlightFlowTypographyStepController requer state.');
    }
    if (typeof applyTypography !== 'function') {
      throw new Error('FlightFlowTypographyStepController requer applyTypography.');
    }

    function stepTypography(delta) {
    applyTypography((state.config.fontScale || 1) + delta, { persist: true, notify: false });
  }

    return Object.freeze({ stepTypography });
  }

  global.FlightFlowTypographyStepController = Object.freeze({ create: createTypographyStepController });
})(window);
