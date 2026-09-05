(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowTransportNavigationController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const getScrubber = options.getScrubber;
    const stopPlayback = options.stopPlayback;
    const snapMotionTo = options.snapMotionTo;
    const goTo = options.goTo;

    if (!state) throw new Error('FlightFlowTransportNavigationController requer state.');
    if (typeof getScrubber !== 'function') throw new Error('FlightFlowTransportNavigationController requer getScrubber().');
    if (typeof stopPlayback !== 'function') throw new Error('FlightFlowTransportNavigationController requer stopPlayback().');
    if (typeof snapMotionTo !== 'function') throw new Error('FlightFlowTransportNavigationController requer snapMotionTo().');
    if (typeof goTo !== 'function') throw new Error('FlightFlowTransportNavigationController requer goTo().');

    function restartTransport() {
      stopPlayback();
      snapMotionTo(0);
      goTo(0, { silent: true });
    }

    function previousTransport() {
      stopPlayback();
      goTo(state.index - 1);
    }

    function nextTransport() {
      stopPlayback();
      goTo(state.index + 1);
    }

    function scrubTransport() {
      stopPlayback();
      const scrubber = getScrubber();
      goTo(Number(scrubber.value));
    }

    return Object.freeze({
      restartTransport,
      previousTransport,
      nextTransport,
      scrubTransport,
    });
  };

  return Object.freeze({ create });
});
