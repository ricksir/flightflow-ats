(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowControlStateController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const CONTROL_IDS = Object.freeze([
    'exportBtn', 'showProtocolBtn', 'exactMessageBtn', 'copySummaryBtn',
    'restartBtn', 'prevBtn', 'playBtn', 'nextBtn', 'scrubber', 'speedSelect',
    'soundBtn', 'fpvToggleBtn', 'stripToggleBtn',
  ]);

  const create = (options = {}) => {
    const state = options.state;
    const getElements = options.getElements;

    if (!state) throw new Error('FlightFlowControlStateController requer state.');
    if (typeof getElements !== 'function') throw new Error('FlightFlowControlStateController requer getElements().');

    function enableControls(enabled) {
      const els = getElements();
      CONTROL_IDS.forEach(id => { els[id].disabled = !enabled; });
      if (enabled && state.parsed) {
        const lastIndex = Math.max(0, state.parsed.events.length - 1);
        els.scrubber.max = String(lastIndex);
        els.endTimeLabel.textContent = state.parsed.events[state.parsed.events.length - 1].time || '--:--:--';
        els.prevBtn.disabled = state.index <= 0;
        els.nextBtn.disabled = state.index >= lastIndex;
      } else {
        els.scrubber.max = '0';
        els.endTimeLabel.textContent = '--:--:--';
      }
    }

    return Object.freeze({ enableControls });
  };

  return Object.freeze({ create });
});
