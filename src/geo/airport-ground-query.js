(function () {
  'use strict';

  function airportGroundQuery(airport) {
    const lat = Number(airport.lat).toFixed(7);
    const lon = Number(airport.lon).toFixed(7);
    const radius = 7000;
    return `[out:json][timeout:28];(
      way(around:${radius},${lat},${lon})["aeroway"~"^(runway|taxiway|taxilane|parking_position|apron|terminal)$"];
      node(around:${radius},${lat},${lon})["aeroway"~"^(holding_position|parking_position|gate|terminal)$"];
    );out body geom;`;
  }

  window.FlightFlowAirportGroundQuery = Object.freeze({
    airportGroundQuery,
  });
})();
