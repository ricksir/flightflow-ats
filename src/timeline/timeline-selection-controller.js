(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowTimelineSelectionController = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const state = options.state;
    const getTimelineList = options.getTimelineList;
    const isTimelinePanelActive = options.isTimelinePanelActive;

    if (!state) throw new Error('FlightFlowTimelineSelectionController requer state.');
    if (typeof getTimelineList !== 'function') throw new Error('FlightFlowTimelineSelectionController requer getTimelineList().');
    if (typeof isTimelinePanelActive !== 'function') throw new Error('FlightFlowTimelineSelectionController requer isTimelinePanelActive().');

    function updateTimelineSelection() {
      const timelineList = getTimelineList();
      const items = timelineList.querySelectorAll('.timeline-item');
      items.forEach(item => item.classList.toggle('active', Number(item.dataset.eventIndex) === state.index));
      const active = timelineList.querySelector('.timeline-item.active');
      if (active && isTimelinePanelActive()) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    return Object.freeze({ updateTimelineSelection });
  };

  return Object.freeze({ create });
});
