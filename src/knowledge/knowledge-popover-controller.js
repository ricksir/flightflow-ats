(function (global) {
  'use strict';

  function createKnowledgePopoverController(options = {}) {
    const els = options.els;
    const state = options.state;
    if (!els || typeof els !== 'object') {
      throw new Error('FlightFlowKnowledgePopoverController requer els.');
    }
    if (!state || typeof state !== 'object') {
      throw new Error('FlightFlowKnowledgePopoverController requer state.');
    }

    function hideKnowledgePopover() {
    if (!els.knowledgePopover) return;
    els.knowledgePopover.hidden = true;
    state.activeKnowledgeAnchor = null;
  }

    return Object.freeze({ hideKnowledgePopover });
  }

  global.FlightFlowKnowledgePopoverController = Object.freeze({ create: createKnowledgePopoverController });
})(window);
