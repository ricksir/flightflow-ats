(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowRouteRevisionReason = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const shortMessageType = options.shortMessageType;

    if (typeof shortMessageType !== 'function') {
      throw new Error('FlightFlowRouteRevisionReason requer shortMessageType.');
    }

    function routeRevisionReason(event, destinationChanged = false) {
      const labels = {
        route: 'ROTA',
        sid: 'SID',
        star: 'STAR',
        adep: 'ADEP',
        ades: 'ADES',
        runwayDeparture: 'PISTA DEP',
        runwayArrival: 'PISTA ARR',
        cfl: 'CFL',
        rfl: 'RFL',
      };
      const changed = [...new Set((event.changes || []).map(change => labels[change.key]).filter(Boolean))];
      if (destinationChanged && !changed.includes('ADES')) changed.unshift('ADES');
      const type = shortMessageType(event.messageType || event.operation || 'ATUALIZAÇÃO');
      return changed.length ? `${type} · ${changed.join(' / ')}` : type;
    }

    return Object.freeze({ routeRevisionReason });
  };

  return Object.freeze({ create });
});
