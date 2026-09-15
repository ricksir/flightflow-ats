(function (global) {
  'use strict';

  function createStripWindowController(options = {}) {
    const state = options.state;
    const setStripVisible = options.setStripVisible;
    if (!state || typeof state !== 'object') {
      throw new Error('FlightFlowStripWindowController requer state.');
    }
    if (typeof setStripVisible !== 'function') {
      throw new Error('FlightFlowStripWindowController requer setStripVisible.');
    }

    function minimizeStrip(){state.stripMinimized=true;setStripVisible(false,{minimized:true});}

    return Object.freeze({ minimizeStrip });
  }

  global.FlightFlowStripWindowController = Object.freeze({ create: createStripWindowController });
})(window);
