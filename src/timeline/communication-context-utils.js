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

  window.FlightFlowCommunicationContextUtils = Object.freeze({
    internalTransitionDetails,
  });
})();
