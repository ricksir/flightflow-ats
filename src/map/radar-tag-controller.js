(function () {
  'use strict';

  function create(deps = {}) {
    const els = deps.els;
    if (!els || typeof els !== 'object') throw new TypeError('els deve ser objeto.');

    function updateRadarTagPosition(point) {
      if (!els.radarTag || !point || els.radarTag.hidden) return;
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      els.radarTag.style.left = `${Math.max(8, Math.min(92, (x / 1600) * 100))}%`;
      els.radarTag.style.top = `${Math.max(8, Math.min(86, (y / 900) * 100))}%`;
    }

    return Object.freeze({ updateRadarTagPosition });
  }

  window.FlightFlowRadarTagController = Object.freeze({ create });
})();
