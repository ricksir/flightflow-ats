(function () {
  'use strict';

  function create(deps = {}) {
    const state = deps.state;
    const setMapViewBox = deps.setMapViewBox;
    if (!state || typeof state !== 'object') throw new TypeError('state deve ser objeto.');
    if (typeof setMapViewBox !== 'function') throw new TypeError('setMapViewBox deve ser função.');

    function maybeFollowAircraft(point){if(!state.parsed||state.config.followAircraft===false||state.geo.dragging)return;const v=state.geo.viewBox;if(v.width>900)return;const edge=.22;const minX=v.x+v.width*edge,maxX=v.x+v.width*(1-edge),minY=v.y+v.height*edge,maxY=v.y+v.height*(1-edge);if(point.x<minX||point.x>maxX||point.y<minY||point.y>maxY)setMapViewBox({x:point.x-v.width/2,y:point.y-v.height/2,width:v.width,height:v.height});}

    return Object.freeze({ maybeFollowAircraft });
  }

  window.FlightFlowAircraftFollowController = Object.freeze({ create });
})();
