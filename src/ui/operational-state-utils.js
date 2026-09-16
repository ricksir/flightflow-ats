(function () {
  'use strict';

  function themeSwatch(theme){return({'theme-pre-light':'#68ff72','theme-pre-dark':'#00b832','theme-noncontrolled':'#d6d6d6','theme-controlled':'#111111','theme-proposal':'#fff000','theme-donor':'#ff9c2e','theme-receiver':'#3f4cff','theme-finished':'#d0d0d0','theme-nonrvsm':'#954a2c','theme-alert':'#c4151d'})[theme]||'#d6d6d6';}

  function stripTheme(event) {
    const s=(event&&event.snapshot)||{}; const text=`${s.status||''} ${event?.operation||''} ${s.groundState||''}`.toUpperCase();
    if(/ALERTA|EMERG/.test(text))return'theme-alert'; if(s.rvsm==='X')return'theme-nonrvsm';
    if(/PROPOS/.test(text))return'theme-proposal'; if(/DOADOR/.test(text))return'theme-donor'; if(/RECEPTOR/.test(text))return'theme-receiver';
    if(/INAT/.test(String(s.status||'').toUpperCase()))return'theme-noncontrolled';
    if(/ARQUIV|TERMIN|CANCEL/.test(text))return'theme-finished'; if(/PRÉ|PRE-ATIVO|PRÉ-ATIVO/.test(text))return s.authorizationState?'theme-pre-dark':'theme-pre-light';
    if(/ATIVO/.test(text))return'theme-controlled'; return'theme-noncontrolled';
  }

  function statusClass(status) {
    const value = String(status || '').toUpperCase();
    if (value.includes('PRÉ')) return 'status-preactive';
    if (value.includes('INAT')) return 'status-inactive';
    if (value.includes('ATIVO')) return 'status-active';
    if (value.includes('TERMIN')) return 'status-terminated';
    if (value.includes('ARQUIV')) return 'status-archived';
    return 'status-empty';
  }

  function loadCompanionScript(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function bootstrapAcceptanceControllers() {
    loadCompanionScript('flightflow-application-shell-controller', 'src/ui/application-shell-controller.js');
    loadCompanionScript('flightflow-terminal-context-visual', 'src/route/terminal-context-visual.js');
  }

  window.FlightFlowOperationalStateUtils = Object.freeze({
    themeSwatch,
    stripTheme,
    statusClass,
  });

  bootstrapAcceptanceControllers();
})();
