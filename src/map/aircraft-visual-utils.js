(function () {
  'use strict';

  const create = ({ clamp, escapeHtml }) => {
    if (typeof clamp !== 'function') throw new TypeError('clamp deve ser função.');
    if (typeof escapeHtml !== 'function') throw new TypeError('escapeHtml deve ser função.');

  function aircraftPixelSizeForZoom(zoom) {
    const z=Number.isFinite(Number(zoom))?Number(zoom):8;
    return Math.round(clamp(12+(z-5)*1.85,12,36));
  }

  function planeIconHtml(heading,callsign,size=30){
    const compact=size<19;
    return `<div class="ff-aircraft-icon ${compact?'compact':''}" style="--ff-aircraft-size:${size}px;transform:rotate(${Number(heading||0).toFixed(1)}deg)"><svg viewBox="-16 -16 32 32" aria-hidden="true"><path d="M0-14c1.7 0 2.5 1.1 2.8 3l1 6.1 9.1 5.1c1.3.8 1.4 2.2.2 2.9l-1.2.7-7.4-2.1.5 6.4 3.4 2.5-.5 1.8L0 10.1l-7.9 2.3-.5-1.8L-5 8.1l.5-6.4-7.4 2.1-1.2-.7c-1.2-.7-1.1-2.1.2-2.9l9.1-5.1 1-6.1c.3-1.9 1.1-3 2.8-3Z" fill="#ffd143" stroke="#2b3438" stroke-width="1.2"/></svg><span class="ff-aircraft-label" style="transform:rotate(${-Number(heading||0).toFixed(1)}deg)">${escapeHtml(callsign)}</span></div>`;
  }

    return Object.freeze({ aircraftPixelSizeForZoom, planeIconHtml });
  };

  window.FlightFlowAircraftVisualUtils = Object.freeze({ create });
})();
