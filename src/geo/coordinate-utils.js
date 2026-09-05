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

  window.FlightFlowCoordinateUtils = Object.freeze({
    normalizeCoordinateInput,
    validAerodromeCoordinate,
    formatGeoCoord,
    atsCoordinateLabel,
    groundCentroid,
    runwayTokens,
    runwayHeading,
    runwayHeadingFromCode,
    polygonGeoCentroid,
  });
})();
