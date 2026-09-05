(function () {
  'use strict';

  const ROUTE_UPDATE_KEYS = new Set(['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);

  function isMeaningfulRouteChange(change) {
    if(!change||!ROUTE_UPDATE_KEYS.has(change.key)) return false;
    const clean=value=>String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
    const before=clean(change.before);
    const after=clean(change.after);
    if(!after||after==='—'||after==='N/A'||before===after) return false;
    if(['sid','star','runwayDeparture','runwayArrival'].includes(change.key)) return true;
    return !!before;
  }

  function isRouteUpdateEvent(event) {
    const type=String(event.messageType||'').toUpperCase();
    const operation=String(event.operation||'').toUpperCase();
    const updateContext=/^(CHG|CRQ|CRP|DLA|INFARC)$/.test(type)||/(MODIFICA|ATUALIZA|RECEPÇÃO DE MENSAGEM (?:CHG|DLA|CRQ|CRP)|ENVIO DE MENSAGEM CRP|INFARC)/.test(operation);
    if(!updateContext) return false;
    return (event.changes||[]).some(change=>isMeaningfulRouteChange(change));
  }

  window.FlightFlowRouteUpdateUtils = Object.freeze({
    isRouteUpdateEvent,
  });
})();
