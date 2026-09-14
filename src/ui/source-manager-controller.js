(function () {
  'use strict';

  function createSourceManagerController(options = {}) {
    const renderSourceManager = options.renderSourceManager;
    if (typeof renderSourceManager !== 'function') {
      throw new Error('FlightFlowSourceManagerController requer renderSourceManager.');
    }

  function initSourceManager() {
    renderSourceManager();
  }

    return Object.freeze({ initSourceManager });
  }

  window.FlightFlowSourceManagerController = Object.freeze({
    create: createSourceManagerController,
  });
})();
