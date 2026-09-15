(function (global) {
  'use strict';

  function createFpvWindowController(options = {}) {
    const state = options.state;
    const setFpvVisible = options.setFpvVisible;
    if (!state || typeof state !== 'object') {
      throw new Error('FlightFlowFpvWindowController requer state.');
    }
    if (typeof setFpvVisible !== 'function') {
      throw new Error('FlightFlowFpvWindowController requer setFpvVisible.');
    }

    function minimizeFpv(){state.fpvMinimized=true;setFpvVisible(false,{minimized:true});}

    return Object.freeze({ minimizeFpv });
  }

  global.FlightFlowFpvWindowController = Object.freeze({ create: createFpvWindowController });
})(window);
