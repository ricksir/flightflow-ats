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
  function groundCentroid(points) {
    const valid=(points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
    if(!valid.length)return{lat:0,lon:0};
    return {lat:valid.reduce((s,p)=>s+p.lat,0)/valid.length,lon:valid.reduce((s,p)=>s+p.lon,0)/valid.length};
  }

  function groundMidpoint(points) { return groundCentroid(points); }

  function runwayTokens(value) { return String(value||'').toUpperCase().match(/\b\d{2}[LCR]?\b/g)||[]; }

  function runwayHeading(value,fallback) {
    const token=runwayTokens(value)[0];
    if(!token)return((Number(fallback)||90)+360)%360;
    const n=Number(token.slice(0,2));return Number.isFinite(n)?((n%36)*10)%360:(Number(fallback)||90);
  }

  function runwayHeadingFromCode(code, fallbackHeading = 90) {
    const match = String(code || '').toUpperCase().match(/\b(\d{2})[LCR]?\b/);
    if (!match) return (Number(fallbackHeading) + 360) % 360;
    const num = Number(match[1]);
    if (!Number.isFinite(num)) return (Number(fallbackHeading) + 360) % 360;
    return ((num % 36) * 10 + 360) % 360;
  }

  function polygonGeoCentroid(points){
    if(!Array.isArray(points)||!points.length)return null;
    let lon=0,lat=0,count=0;
    points.forEach(p=>{
      const x=Number(p&&p[0]),y=Number(p&&p[1]);
      if(Number.isFinite(x)&&Number.isFinite(y)){lon+=x;lat+=y;count++;}
    });
    return count?{lon:lon/count,lat:lat/count}:null;
  }

  function geoOffset(lat, lon, distanceMeters, bearingDegrees) {
    const R = 6371000;
    const brng = Number(bearingDegrees || 0) * Math.PI / 180;
    const dByR = Number(distanceMeters || 0) / R;
    const lat1 = Number(lat) * Math.PI / 180;
    const lon1 = Number(lon) * Math.PI / 180;
    const sinLat1 = Math.sin(lat1), cosLat1 = Math.cos(lat1);
    const sinD = Math.sin(dByR), cosD = Math.cos(dByR);
    const lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * sinD * cosLat1, cosD - sinLat1 * Math.sin(lat2));
    return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
  }

  window.FlightFlowCoordinateUtils = Object.freeze({
    normalizeCoordinateInput,
    validAerodromeCoordinate,
    formatGeoCoord,
    atsCoordinateLabel,
    groundCentroid,
    groundMidpoint,
    runwayTokens,
    runwayHeading,
    runwayHeadingFromCode,
    polygonGeoCentroid,
    geoOffset,
  });
})();
