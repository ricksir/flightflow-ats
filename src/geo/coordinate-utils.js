(function () {
  'use strict';

  function normalizeCoordinateInput(value){
    const normalized=String(value??'').trim().replace(',', '.');
    const number=Number(normalized);
    return Number.isFinite(number)?number:NaN;
  }

  function validAerodromeCoordinate(lat,lon){
    return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  }

  function formatGeoCoord(value,hemis){const pos=hemis[0],neg=hemis[1],h=value>=0?pos:neg;return`${Math.abs(value).toFixed(4)}°${h}`;}

  function atsCoordinateLabel(lat,lon){
    return `LAT ${formatGeoCoord(Number(lat),'NS')} · LONG ${formatGeoCoord(Number(lon),'EW')}`;
  }
  window.FlightFlowCoordinateUtils = Object.freeze({
    normalizeCoordinateInput,
    validAerodromeCoordinate,
    formatGeoCoord,
    atsCoordinateLabel,
  });
})();
