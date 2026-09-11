(function () {
  'use strict';

  const AIRPORT_SURFACE_PRESETS = Object.freeze({
    SBBR: { terminalBearing: 20, standDistanceM: 720, apronDistanceM: 560, thresholdDistanceM: 1420, rolloutDistanceM: 920, approachDistanceM: 5600, climbDistanceM: 3400 },
    SBGO: { terminalBearing: 210, standDistanceM: 620, apronDistanceM: 500, thresholdDistanceM: 1180, rolloutDistanceM: 820, approachDistanceM: 4300, climbDistanceM: 2800 }
  });

  function create(options = {}) {
    const normalizeLocalityCode = options.normalizeLocalityCode;
    if (typeof normalizeLocalityCode !== 'function') {
      throw new Error('FlightFlowAirportSurfaceUtils requer normalizeLocalityCode.');
    }

  function airportSurfacePreset(airport) {
    const code = normalizeLocalityCode(airport && airport.code || '');
    return AIRPORT_SURFACE_PRESETS[code] || {};
  }

    return Object.freeze({ airportSurfacePreset });
  }

  window.FlightFlowAirportSurfaceUtils = Object.freeze({
    create,
    presets: AIRPORT_SURFACE_PRESETS,
  });
})();
