(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowPlaybackController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const getPlayBtn = options.getPlayBtn;
    const currentEvent = options.currentEvent;
    const goTo = options.goTo;
    const setTimer = options.setTimeout;
    const clearTimer = options.clearTimeout;

    if (!state) throw new Error('FlightFlowPlaybackController requer state.');
    if (typeof getPlayBtn !== 'function') throw new Error('FlightFlowPlaybackController requer getPlayBtn().');
    if (typeof currentEvent !== 'function') throw new Error('FlightFlowPlaybackController requer currentEvent().');
    if (typeof goTo !== 'function') throw new Error('FlightFlowPlaybackController requer goTo().');
    if (typeof setTimer !== 'function' || typeof clearTimer !== 'function') {
      throw new Error('FlightFlowPlaybackController requer timers explícitos.');
    }

    function startPlayback() {
      if (!state.parsed) return;
      if (state.index >= state.parsed.events.length - 1) goTo(0, { silent: true });
      state.playing = true;
      const playBtn = getPlayBtn();
      playBtn.textContent = 'Ⅱ';
      playBtn.title = 'Pausar (Espaço)';
      scheduleNext();
    }

    function stopPlayback() {
      state.playing = false;
      if (state.timer) clearTimer(state.timer);
      state.timer = null;
      const playBtn = getPlayBtn();
      if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.title = 'Reproduzir (Espaço)';
      }
    }

    function togglePlayback() {
      if (!state.parsed) return;
      state.playing ? stopPlayback() : startPlayback();
    }

    function scheduleNext() {
      if (state.timer) clearTimer(state.timer);
      if (!state.playing || !state.parsed) return;
      const current = currentEvent();
      const emphasis = current && (/DEP|ARR|CRQ|CRP/.test(current.messageType) || current.changes.length > 5) ? 1.25 : 1;
      const delay = Math.max(350, Number(state.config.baseIntervalMs || 1850) * emphasis / state.speed);
      state.timer = setTimer(() => {
        if (state.index >= state.parsed.events.length - 1) { stopPlayback(); return; }
        goTo(state.index + 1);
        scheduleNext();
      }, delay);
    }

    return Object.freeze({
      startPlayback,
      stopPlayback,
      togglePlayback,
      scheduleNext,
    });
  };

  return Object.freeze({ create });
});
