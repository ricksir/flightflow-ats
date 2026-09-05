(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowKeyboardNavigationController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const isTargetEditable = options.isTargetEditable;
    const hasOpenDialog = options.hasOpenDialog;
    const togglePlayback = options.togglePlayback;
    const stopPlayback = options.stopPlayback;
    const goTo = options.goTo;
    const showExactMessage = options.showExactMessage;
    const toggleFpv = options.toggleFpv;
    const toggleStrip = options.toggleStrip;

    if (!state) throw new Error('FlightFlowKeyboardNavigationController requer state.');
    if (typeof isTargetEditable !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer isTargetEditable().');
    if (typeof hasOpenDialog !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer hasOpenDialog().');
    if (typeof togglePlayback !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer togglePlayback().');
    if (typeof stopPlayback !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer stopPlayback().');
    if (typeof goTo !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer goTo().');
    if (typeof showExactMessage !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer showExactMessage().');
    if (typeof toggleFpv !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer toggleFpv().');
    if (typeof toggleStrip !== 'function') throw new Error('FlightFlowKeyboardNavigationController requer toggleStrip().');

    function handleKeyboard(event) {
      if (isTargetEditable(event.target) || hasOpenDialog()) return;
      if (!state.parsed) return;
      if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); stopPlayback(); goTo(state.index - 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); stopPlayback(); goTo(state.index + 1); }
      else if (event.key === 'Home') { event.preventDefault(); stopPlayback(); goTo(0); }
      else if (event.key === 'End') { event.preventDefault(); stopPlayback(); goTo(state.parsed.events.length - 1); }
      else if (event.key.toLowerCase() === 'm') showExactMessage();
      else if (event.key.toLowerCase() === 'f') toggleFpv();
      else if (event.key.toLowerCase() === 's') toggleStrip();
    }

    return Object.freeze({ handleKeyboard });
  };

  return Object.freeze({ create });
});
