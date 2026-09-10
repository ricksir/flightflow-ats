(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowCurrentEventSelector = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;

    if (!state) throw new Error('FlightFlowCurrentEventSelector requer state.');

    function currentEvent() {
      return state.parsed && state.parsed.events[state.index] ? state.parsed.events[state.index] : null;
    }

    return Object.freeze({ currentEvent });
  };

  return Object.freeze({ create });
});
