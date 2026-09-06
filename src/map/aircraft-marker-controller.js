(function () {
  'use strict';

  const create = ({ realMapState, aircraftPixelSizeForZoom, planeIconHtml, clamp, addGoogleOverlay }) => {
    if (!realMapState || typeof realMapState !== 'object') throw new TypeError('realMapState deve ser objeto.');
    if (typeof aircraftPixelSizeForZoom !== 'function') throw new TypeError('aircraftPixelSizeForZoom deve ser função.');
    if (typeof planeIconHtml !== 'function') throw new TypeError('planeIconHtml deve ser função.');
    if (typeof clamp !== 'function') throw new TypeError('clamp deve ser função.');
    if (typeof addGoogleOverlay !== 'function') throw new TypeError('addGoogleOverlay deve ser função.');

  function updateLeafletAircraftMarker(lat,lng,heading,callsign){
    const layer=realMapState.layers.aircraft;if(!layer)return;
    const size=aircraftPixelSizeForZoom(realMapState.map&&realMapState.map.getZoom());
    const icon=L.divIcon({className:'',html:planeIconHtml(heading,callsign,size),iconSize:[size,size],iconAnchor:[size/2,size/2]});
    realMapState.lastPlaneData={lat,lng,heading,callsign};
    if(!realMapState.planeMarker){realMapState.planeMarker=L.marker([lat,lng],{icon,zIndexOffset:1000,keyboard:false,interactive:false}).addTo(layer);}
    else{realMapState.planeMarker.setLatLng([lat,lng]);realMapState.planeMarker.setIcon(icon);}
  }

  function googlePlaneSymbol(heading){const zoom=realMapState.map&&realMapState.map.getZoom?realMapState.map.getZoom():8;const symbolScale=clamp(.62+(Number(zoom)-5)*.085,.62,1.38);return{path:'M 0 -14 C 1.7 -14 2.5 -12.9 2.8 -11 L 3.8 -4.9 L 12.9 0.2 C 14.2 1 14.3 2.4 13.1 3.1 L 11.9 3.8 L 4.5 1.7 L 5 8.1 L 8.4 10.6 L 7.9 12.4 L 0 10.1 L -7.9 12.4 L -8.4 10.6 L -5 8.1 L -4.5 1.7 L -11.9 3.8 L -13.1 3.1 C -14.3 2.4 -14.2 1 -12.9 0.2 L -3.8 -4.9 L -2.8 -11 C -2.5 -12.9 -1.7 -14 0 -14 Z',fillColor:'#ffd143',fillOpacity:1,strokeColor:'#2b3438',strokeWeight:1.2,scale:symbolScale,rotation:Number(heading||0),anchor:new google.maps.Point(0,0)};}

  function updateGoogleAircraftMarker(lat,lng,heading,callsign){
    if(realMapState.engine!=='google'||!realMapState.map)return;
    const opts={position:{lat,lng},icon:googlePlaneSymbol(heading),label:{text:callsign,color:'#ffffff',fontSize:'10px',fontWeight:'700'},zIndex:1000};
    if(!realMapState.googlePlane){realMapState.googlePlane=new google.maps.Marker({...opts,map:realMapState.map});addGoogleOverlay(realMapState.googlePlane);}else{realMapState.googlePlane.setPosition(opts.position);realMapState.googlePlane.setIcon(opts.icon);realMapState.googlePlane.setLabel(opts.label);}
  }

    return Object.freeze({ updateLeafletAircraftMarker, googlePlaneSymbol, updateGoogleAircraftMarker });
  };

  window.FlightFlowAircraftMarkerController = Object.freeze({ create });
})();
