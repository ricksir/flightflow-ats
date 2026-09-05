(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowTimelineBuilderController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function getSourceClass(sourceName) {
    const lower = sourceName.toLowerCase();
    if (lower.includes('app')) return 'app';
    if (lower.includes('acc')) return 'acc';
    if (lower.includes('twr')) return 'twr';
    if (lower.includes('cpv')) return 'cpv';
    return 'default';
  }

  const create = (options = {}) => {
    const state = options.state;
    const els = options.els;
    const escapeHtml = options.escapeHtml;
    const goTo = options.goTo;
    const stopPlayback = options.stopPlayback;

    if (!state) throw new Error('FlightFlowTimelineBuilderController requer state.');
    if (!els) throw new Error('FlightFlowTimelineBuilderController requer els.');
    if (typeof escapeHtml !== 'function') throw new Error('FlightFlowTimelineBuilderController requer escapeHtml().');
    if (typeof goTo !== 'function') throw new Error('FlightFlowTimelineBuilderController requer goTo().');
    if (typeof stopPlayback !== 'function') throw new Error('FlightFlowTimelineBuilderController requer stopPlayback().');

  function buildTimeline() {
    if (!state.parsed) return;
    els.timelineHeading.textContent = `${state.parsed.events.length} eventos reconhecidos`;
    els.timelineList.innerHTML = state.parsed.events.map((event, index) => {
      const meaningful = event.changes.some(change => !['receivedAt','operation','messageType','originator','recipients','protocol'].includes(change.key));
      const sourceClass = event.source ? `source-chip ${getSourceClass(event.source)}` : '';
      const sourceLabel = event.source ? event.source : '';
      return `<article class="timeline-item ${meaningful ? 'changed' : ''}" data-event-index="${index}" tabindex="0">
        <div class="timeline-time"><span class="timeline-event-number">EVENTO ${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(event.time || '--:--')}</span></div>
        <div class="timeline-body"><div class="timeline-op">${escapeHtml(event.operation)}</div>
          <div class="timeline-meta"><span class="timeline-chip">${escapeHtml(event.messageType)}</span><span class="timeline-chip">${escapeHtml(event.snapshot.status || 'SEM ESTADO')}</span><span class="timeline-chip">${escapeHtml(event.stage.label)}</span>${sourceLabel ? `<span class="source-chip ${sourceClass}">${escapeHtml(sourceLabel)}</span>` : ''}</div>
        </div>
      </article>`;
    }).join('');
    els.timelineList.querySelectorAll('.timeline-item').forEach(item => {
      const activate = () => { stopPlayback(); goTo(Number(item.dataset.eventIndex)); };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
    });
  }

    return Object.freeze({ buildTimeline });
  };

  return Object.freeze({ create });
});
