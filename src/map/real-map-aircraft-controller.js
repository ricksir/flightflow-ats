(function () {
  'use strict';

  function createRealMapAircraftController(deps = {}) {
    const realMapState = deps.realMapState;
    const state = deps.state;
    const unprojectGeo = deps.unprojectGeo;
    const updateRealMapCoordinateReadout = deps.updateRealMapCoordinateReadout;
    const currentEvent = deps.currentEvent;
    const updateGoogleAircraftMarker = deps.updateGoogleAircraftMarker;
    const updateGoogleCompletedRoute = deps.updateGoogleCompletedRoute;
    const followRealMapAircraft = deps.followRealMapAircraft;
    const updateLeafletAircraftMarker = deps.updateLeafletAircraftMarker;
    const updateLeafletCompletedRoute = deps.updateLeafletCompletedRoute;

    if (!realMapState || typeof realMapState !== 'object') throw new TypeError('realMapState deve ser objeto.');
    if (!state || typeof state !== 'object') throw new TypeError('state deve ser objeto.');
    for (const [name, value] of Object.entries({
      unprojectGeo,
      updateRealMapCoordinateReadout,
      currentEvent,
      updateGoogleAircraftMarker,
      updateGoogleCompletedRoute,
      followRealMapAircraft,
      updateLeafletAircraftMarker,
      updateLeafletCompletedRoute,
    })) {
      if (typeof value !== 'function') throw new TypeError(`${name} deve ser função.`);
    }

  function updateRealMapAircraft(frame){
    if(!realMapState.ready||!state.parsed||!frame)return;
    if(realMapState.engine==='vector'){const g=unprojectGeo(frame.x,frame.y);updateRealMapCoordinateReadout(g.lat,g.lon);return;}
    const geo=unprojectGeo(frame.x,frame.y);
    const callsign=(currentEvent()&&currentEvent().snapshot.callsign)||state.parsed.meta.callsign||'ACFT';
    if(realMapState.engine==='google'){
      updateGoogleAircraftMarker(geo.lat,geo.lon,frame.heading||0,callsign);
      updateGoogleCompletedRoute();
      followRealMapAircraft(geo.lat,geo.lon);
      return;
    }
    updateLeafletAircraftMarker(geo.lat,geo.lon,frame.heading||0,callsign);
    const route=state.geo.eventRoutes[state.index];if(route)updateLeafletCompletedRoute(route.points,frame.progress||0);
    followRealMapAircraft(geo.lat,geo.lon);
  }

    return Object.freeze({ updateRealMapAircraft });
  }

  window.FlightFlowRealMapAircraftController = Object.freeze({ create: createRealMapAircraftController });
})();
