(function () {
  'use strict';

  function extractStandHint(parsed,arrival=false) {
    const events=(parsed&&parsed.events)||[];
    const ordered=arrival?events.slice().reverse():events;
    for(const event of ordered){
      const text=String(event.rawBlock||event.content||'');
      const match=text.match(/(?:POSI(?:Ç|C)[AÃ]O|STAND|BOX|GATE|PATIO|PÁTIO)\s*(?:N[º°O.]*)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{0,7})/i);
      if(match)return match[1].toUpperCase();
    }
    return '';
  }

  window.FlightFlowStandHintUtils = Object.freeze({
    extractStandHint,
  });
})();
