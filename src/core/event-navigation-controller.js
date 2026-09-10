(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowEventNavigationController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const planMotionTransition = options.planMotionTransition;
    const renderCurrent = options.renderCurrent;

    if (!state) throw new Error('FlightFlowEventNavigationController requer state.');
    if (typeof planMotionTransition !== 'function') {
      throw new TypeError('FlightFlowEventNavigationController requer planMotionTransition().');
    }
    if (typeof renderCurrent !== 'function') {
      throw new TypeError('FlightFlowEventNavigationController requer renderCurrent().');
    }

    function goTo(index, options = {}) {
      if (!state.parsed) return;
      const max = state.parsed.events.length - 1;
      const nextIndex = Math.max(0, Math.min(max, Number(index) || 0));
      if (state.motion) planMotionTransition(nextIndex);
      state.index = nextIndex;
      renderCurrent(options);
    }

    return Object.freeze({ goTo });
  };

  return Object.freeze({ create });
});
