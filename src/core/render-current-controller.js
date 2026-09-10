(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowRenderCurrentController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const els = options.els;
    const currentEvent = options.currentEvent;
    const statusClass = options.statusClass;
    const renderFields = options.renderFields;
    const renderChanges = options.renderChanges;
    const renderScene = options.renderScene;
    const renderRealMapEvent = options.renderRealMapEvent;
    const renderRadarTag = options.renderRadarTag;
    const renderCommunication = options.renderCommunication;
    const updateTimelineSelection = options.updateTimelineSelection;
    const renderOriginalEvent = options.renderOriginalEvent;
    const renderFpv = options.renderFpv;
    const renderStrip = options.renderStrip;
    const syncDetachedWindows = options.syncDetachedWindows;
    const maybeAutoOpenFpv = options.maybeAutoOpenFpv;
    const maybeAutoOpenStrip = options.maybeAutoOpenStrip;
    const playTransitionSound = options.playTransitionSound;

    if (!state) throw new Error('FlightFlowRenderCurrentController requer state.');
    if (!els) throw new Error('FlightFlowRenderCurrentController requer els.');

    for (const [name, fn] of Object.entries({
      currentEvent,
      statusClass,
      renderFields,
      renderChanges,
      renderScene,
      renderRealMapEvent,
      renderRadarTag,
      renderCommunication,
      updateTimelineSelection,
      renderOriginalEvent,
      renderFpv,
      renderStrip,
      syncDetachedWindows,
      maybeAutoOpenFpv,
      maybeAutoOpenStrip,
      playTransitionSound,
    })) {
      if (typeof fn !== 'function') {
        throw new TypeError(`FlightFlowRenderCurrentController requer ${name}().`);
      }
    }

    function renderCurrent(options = {}) {
      const event = currentEvent();
      if (!event) return;
      const snapshot = event.snapshot;
      const total = state.parsed.events.length;
      els.callsignTitle.textContent = snapshot.callsign || state.parsed.meta.callsign || 'ACFT';
      els.adepTitle.textContent = snapshot.adep || 'ADEP';
      els.adesTitle.textContent = snapshot.ades || 'ADES';
      els.departureCode.textContent = snapshot.adep || 'ADEP';
      els.arrivalCode.textContent = snapshot.ades || 'ADES';
      els.planeLabel.textContent = snapshot.callsign || 'ACFT';
      els.statusBadge.textContent = snapshot.status || 'SEM ESTADO';
      els.statusBadge.className = `status-badge ${statusClass(snapshot.status)}`;
      els.stageBadge.textContent = event.stage.label;
      els.frameCounter.textContent = `${state.index + 1} / ${total}`;
      els.operationTitle.textContent = event.operation;
      els.captionTitle.textContent = `${event.stage.label} · ${event.messageType}`;
      els.captionText.textContent = event.description;
      els.changeCount.textContent = String(event.changes.length);
      els.scrubber.value = String(state.index);
      els.currentTimeLabel.textContent = event.time || '--:--:--';
      els.eventLabel.textContent = `Evento ${state.index + 1} de ${total}`;
      els.prevBtn.disabled = state.index <= 0;
      els.nextBtn.disabled = state.index >= total - 1;
      renderFields(event);
      renderChanges(event);
      renderScene(event);
      renderRealMapEvent(event);
      renderRadarTag(event);
      renderCommunication(event);
      updateTimelineSelection();
      renderOriginalEvent(event);
      renderFpv(event);
      renderStrip(event);
      syncDetachedWindows();
      maybeAutoOpenFpv(event);
      maybeAutoOpenStrip(event);
      if (!options.silent) playTransitionSound(event);
    }

    return Object.freeze({ renderCurrent });
  };

  return Object.freeze({ create });
});
