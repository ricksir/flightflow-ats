(function () {
  'use strict';

  function createLocalityUtils(options = {}) {
    const normalizeLocalityCode = options.normalizeLocalityCode;
    if (typeof normalizeLocalityCode !== 'function') {
      throw new Error('FlightFlowLocalityUtils requer normalizeLocalityCode.');
    }

  function isLocationCode(code){
    return /^[A-Z0-9]{4,16}$/.test(normalizeLocalityCode(code));
  }

    return Object.freeze({ isLocationCode });
  }

  window.FlightFlowLocalityUtils = Object.freeze({
    create: createLocalityUtils,
  });
})();
