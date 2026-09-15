(() => {
  'use strict';
  if (window.FlightFlowRouteProcessedV7412) return;

  const VERSION = '7.4.12';
  const DB_NAME = 'FlightFlowNavDBV743';
  const DB_VERSION = 1;
  const STORE = 'points';
  const OFFICIAL_WFS_JSON = 'https://geoaisweb.decea.gov.br/geoserver/ICA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=ICA%3Awaypoint_aisweb&outputFormat=application%2Fjson';
  const OFFICIAL_WFS_XLS = 'https://geoaisweb.decea.gov.br/geoserver/ICA/wfs?outputFormat=excel2007&request=GetFeature&typeName=ICA%3Awaypoint_aisweb&version=1.1.0';
  const OFFICIAL_WFS_CSV = 'https://geoaisweb.decea.gov.br/geoserver/ICA/wfs?outputFormat=csv&request=GetFeature&typeName=ICA%3Awaypoint_aisweb&version=1.1.0';
  const OFFICIAL_FIXES_PAGE = 'https://aisweb.decea.mil.br/index.cfm?i=espaco-aereo&p=fixos';
  const styleId = 'ff-route-processed-v7412-style';
  const FIXES_STORAGE_KEY = 'flightflow-route-fixes-visible-v1';
  const HANDOFF_STORAGE_KEY = 'flightflow-route-handoffs-visible-v1';


  // Snapshot OFFLINE mínimo, baseado em publicações oficiais AISWEB/GeoAISWEB.
  // GEPMO/ANBIR/IREGU/REINA são coordenadas publicadas na ENR 3.2 (UZ35).
  // SEMDU e ENSIG são posições derivadas geometricamente dos trechos oficiais
  // das cartas/coding tables RNAV, ancoradas em GEPMO e REINA, respectivamente.
  const OFFICIAL_SEED = Object.freeze([
    Object.freeze({ident:'SEMDU',lat:-16.153513999947,lon:-47.844991046248,source:'AISWEB SID RNAV SEMDU 2A (posição derivada WGS84 do trecho oficial)',kind:'waypoint',quality:'derived'}),
    Object.freeze({ident:'GEPMO',lat:-16.8505555556,lon:-47.1272222222,source:'AISWEB AIP ENR 3.2 · UZ35',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ANBIR',lat:-17.1683333333,lon:-46.8202777778,source:'AISWEB AIP ENR 3.2 · UZ35',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'IREGU',lat:-17.9433333333,lon:-46.0611111111,source:'AISWEB AIP ENR 3.2 · UZ35',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'REINA',lat:-18.4380555556,lon:-45.5713888889,source:'AISWEB AIP ENR 3.2 · UZ35',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ENSIG',lat:-19.080448642814,lon:-44.686114460639,source:'AISWEB STAR RNAV ENSIG 1A/1B (posição derivada WGS84 do trecho oficial)',kind:'waypoint',quality:'derived'}),
    // UZ26 / SID Brasília — cobre a segunda rota de regressão GLO1762 sem rede.
    Object.freeze({ident:'ESBUX',lat:-15.6765,lon:-47.8098333333,source:'AISWEB SID RNAV ESBUX 6A / ILKUS 1A · tabela WGS84',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ILKUS',lat:-14.9230555556,lon:-48.1988888889,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'PADIL',lat:-12.4402777778,lon:-48.2675,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'IRISO',lat:-11.6894444444,lon:-48.2880555556,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'LIBEC',lat:-11.2908333333,lon:-48.2988888889,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'EGDOD',lat:-10.9594444444,lon:-48.3205555556,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'IBGAM',lat:-10.335,lon:-48.3558333333,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'PMS',lat:-10.2880555556,lon:-48.3586111111,source:'AISWEB AIP ENR 3.2 · UZ26 · VOR/DME PMS',kind:'navaid',quality:'official'}),
    Object.freeze({ident:'ILVES',lat:-9.7858333333,lon:-48.3658333333,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'MASVA',lat:-9.6213888889,lon:-48.3677777778,source:'AISWEB AIP ENR 3.2 · UZ26',kind:'waypoint',quality:'official'}),
    // TAM3542 / SBGO
    Object.freeze({ident:'UMSUB',lat:-16.2419861111,lon:-48.2932638889,source:'AISWEB SID RNAV UMSUB 1A · tabela WGS84',kind:'waypoint',quality:'official'}),
    // TAM3774 / UZ5 — pontos processados publicados na AIP ENR 3.2.
    // Mantém a rota real resolvível offline quando o WFS é bloqueado por CORS/proxy.
    Object.freeze({ident:'KUKOL',lat:-16.6897222222,lon:-48.4483333333,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'SIRUL',lat:-17.7119444444,lon:-48.5341666667,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'VUDOT',lat:-18.3055555556,lon:-48.5872222222,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'EDMIN',lat:-18.675,lon:-48.6208333333,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'UDIGI',lat:-19.1702777778,lon:-48.6655555556,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'MEVIK',lat:-20.2786111111,lon:-48.7811111111,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ASTOB',lat:-20.68,lon:-48.8230555556,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'VUPOG',lat:-20.7422222222,lon:-48.8330555556,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'UPONA',lat:-21.2108333333,lon:-48.9077777778,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ISISA',lat:-21.6555555556,lon:-48.9791666667,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ENPEG',lat:-21.7608333333,lon:-49.005,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'PALCA',lat:-22.0988888889,lon:-49.0883333333,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'ANSOK',lat:-22.3938888889,lon:-49.1613888889,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'IMTBI',lat:-22.5677777778,lon:-49.2108333333,source:'AISWEB AIP ENR 3.2 · UZ5',kind:'waypoint',quality:'official'}),
    Object.freeze({ident:'SIREM',lat:-16.5501666667,lon:-48.6463333333,source:'AISWEB STAR RNAV SIREM 2B · tabela WGS84',kind:'waypoint',quality:'official'}),
  ]);

  const model = {
    history: null,
    resolvedSnapshots: [],
    currentSnapshotIndex: 0,
    useFinalSnapshot: false,
    syncTimeline: true,
    routeProgress: 0,
    sourceFile: '',
    embedded: new Map(),
    imported: new Map(),
    lastAnalysisToken: 0,
    nativeAppliedSignature: '',
    nativeMapLayer: null,
    nativeFixLayer: null,
    nativeTransferLayer: null,
    nativeMapRef: null,
    nativeFitDone: false,
    fixesVisible: true,
    handoffsVisible: true,
    passiveTimer: 0,
    passiveBusy: false,
    lastNativeIndex: -1,
    pendingOldHistoryFingerprint: '',
    pendingReset: false,
    nationalBaseInstalledAt: '',
    legacyRouteSuppressed: false,
    lastSourceLabel: '',
    lastTransferSignature: '',
    movementProfile: null,
  };

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const esc = (v) => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const norm = (v) => String(v ?? '').trim().toUpperCase();
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toast(message, type='info') {
    let host = qs('#ffrpToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ffrpToastHost';
      host.className = 'ffrp-toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `ffrp-toast ${type}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(()=>el.remove(),220); }, 4300);
  }

  function installStyle() {
    if (document.getElementById(styleId)) return;
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .ffrp-open-btn{position:static;z-index:auto;display:inline-flex;align-items:center;gap:6px;min-height:29px;border:1px solid rgba(13,112,132,.24);background:rgba(13,112,132,.08);color:#07576a;border-radius:999px;padding:5px 9px;font:900 .54rem/1 Inter,system-ui,sans-serif;letter-spacing:.035em;cursor:pointer;box-shadow:none;white-space:nowrap}
      .ffrp-open-btn[hidden]{display:none!important}.ffrp-open-btn:hover{transform:translateY(-1px);background:rgba(13,112,132,.13);box-shadow:0 5px 14px rgba(3,29,57,.09)}
      .ffrp-open-btn .ffrp-count{display:grid;place-items:center;min-width:19px;height:19px;border-radius:10px;background:#0d7084;color:#fff;font-size:.50rem;padding:0 5px}
      .ffrp-open-btn.warn{border-color:#e4a63c;background:#fff7e7;color:#8f5500}.ffrp-open-btn.warn .ffrp-count{background:#c27a00}
      .ffrp-open-btn.ffrp-floating-fallback{position:fixed;right:18px;bottom:96px;z-index:2147482000;padding:9px 12px;box-shadow:0 8px 24px rgba(3,29,57,.18)}
      html[data-theme="light"] .scene-status .ffrp-open-btn{background:rgba(25,94,136,.045);border-color:rgba(35,94,135,.13);color:#0e6487}
      html[data-theme="light"] .scene-status .ffrp-open-btn.warn{background:rgba(255,191,60,.17);border-color:rgba(190,124,0,.28);color:#8a5600}
      .ffrp-modal{position:fixed;inset:0;z-index:2147483000;background:rgba(3,16,28,.62);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}
      .ffrp-modal[hidden]{display:none!important}
      .ffrp-window{width:min(1480px,calc(100vw - 24px));height:min(900px,calc(100vh - 24px));background:#f8fbfd;color:#142c3d;border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.38);overflow:hidden;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto;border:1px solid rgba(17,69,91,.16)}
      .ffrp-head{display:flex;align-items:center;gap:12px;padding:12px 15px;background:#083d5a;color:white}
      .ffrp-head-title{min-width:0;flex:1}.ffrp-head-title strong{display:block;font-size:.86rem;letter-spacing:.01em}.ffrp-head-title span{display:block;margin-top:3px;color:#c9e4ef;font-size:.58rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ffrp-head button,.ffrp-toolbar button{border:0;border-radius:9px;min-height:32px;padding:0 10px;font:800 .59rem/1 Inter,system-ui,sans-serif;cursor:pointer}
      .ffrp-head button{background:rgba(255,255,255,.12);color:#fff}.ffrp-head button:hover{background:rgba(255,255,255,.22)}
      .ffrp-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid #dbe7ed;background:#fff}
      .ffrp-toolbar button{background:#e8f4f8;color:#07576a;border:1px solid #c8e1e9}.ffrp-toolbar button:hover{background:#d8edf4}.ffrp-toolbar button.active{background:#0d7084;color:#fff;border-color:#0d7084}
      .ffrp-toolbar .ffrp-danger{background:#fff2e8;color:#9a4a00;border-color:#ffd2ac}
      .ffrp-stat{display:inline-flex;gap:5px;align-items:center;border:1px solid #d8e4ea;border-radius:999px;padding:5px 8px;background:#f8fbfc;font:800 .54rem/1.1 Inter,system-ui,sans-serif;color:#536b79}.ffrp-stat b{color:#123e54}
      .ffrp-body{min-height:0;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(390px,440px);gap:0}
      .ffrp-map-wrap{position:relative;min-width:0;min-height:0;background:#dceaf0;border-right:1px solid #ccdce3;overflow:hidden}
      .ffrp-map{width:100%;height:100%;display:block;background:linear-gradient(#d9eaf0,#e8f2f5)}
      .ffrp-map .grid{stroke:#527585;stroke-opacity:.13;stroke-width:1;vector-effect:non-scaling-stroke}.ffrp-map .grid-label{fill:#526f7d;font:600 11px ui-monospace,monospace;opacity:.72}
      .ffrp-map .route-line{fill:none;stroke:#e02d25;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 1px 1px rgba(0,0,0,.2))}.ffrp-map .route-line.completed{stroke:#1b75a5}.ffrp-map .route-gap{fill:none;stroke:#a87300;stroke-width:2;stroke-dasharray:8 6;opacity:.75;vector-effect:non-scaling-stroke}
      .ffrp-map .wp circle{fill:#fff;stroke:#0b688a;stroke-width:2.2;vector-effect:non-scaling-stroke}.ffrp-map .wp.coord circle{stroke:#7b4db8}.ffrp-map .wp.airport circle{fill:#ffefb5;stroke:#b87300}.ffrp-map .wp.pseudo circle{fill:#fff7d8;stroke:#6d52c8;stroke-dasharray:4 3}.ffrp-map .wp text{fill:#123b50;font:800 12px Inter,system-ui,sans-serif;paint-order:stroke;stroke:#e9f5f8;stroke-width:4px;stroke-linejoin:round}.ffrp-map .wp .meta{font:700 9px ui-monospace,monospace;fill:#355c70}
      .ffrp-plane{filter:drop-shadow(0 2px 3px rgba(0,0,0,.22))}.ffrp-plane .stem{stroke:#18a0c4;stroke-width:3;stroke-linecap:round;opacity:.82;vector-effect:non-scaling-stroke}.ffrp-plane .body{fill:#083d5a;stroke:white;stroke-width:1.5;vector-effect:non-scaling-stroke}.ffrp-plane .tag{fill:rgba(255,255,255,.97);stroke:#c4d9e3;stroke-width:1.5;vector-effect:non-scaling-stroke}.ffrp-plane text{fill:#083d5a;font:900 11px Inter,system-ui,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:4px}.ffrp-plane .mini{font:900 10px Inter,system-ui,sans-serif;stroke-width:0}
      .ffrp-map-note{position:absolute;left:12px;bottom:12px;max-width:min(620px,calc(100% - 24px));padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.92);border:1px solid rgba(13,112,132,.18);box-shadow:0 8px 25px rgba(3,29,57,.12);font:700 .58rem/1.45 Inter,system-ui,sans-serif;color:#345667}
      .ffrp-side{min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;background:#fff;padding:12px}.ffrp-side h3{position:sticky;top:-12px;z-index:2;margin:-2px -2px 8px;padding:8px 2px 7px;background:rgba(255,255,255,.96);font-size:.72rem;color:#083d5a}.ffrp-route-list{display:grid;gap:6px}.ffrp-point{display:grid;grid-template-columns:30px minmax(0,1fr);gap:5px 7px;align-items:center;padding:8px 9px;border-radius:10px;background:#f4f8fa;border:1px solid #e2edf1;font-size:.58rem;overflow:hidden}.ffrp-point.unresolved{background:#fff8ed;border-color:#f1d7a7}.ffrp-point-index{grid-row:1 / span 2;display:grid;place-items:center;width:24px;height:24px;border-radius:12px;background:#dfeff5;color:#0b6788;font-weight:900}.ffrp-point.unresolved .ffrp-point-index{background:#ffe4b5;color:#995800}.ffrp-point-main{min-width:0}.ffrp-point-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#123e54}.ffrp-point-main span{display:block;margin-top:2px;color:#607684;font-size:.52rem;line-height:1.35}.ffrp-point-source{grid-column:2;min-width:0;font-size:.47rem;line-height:1.35;color:#6b7f89;white-space:normal;overflow-wrap:anywhere;word-break:break-word;border-top:1px dashed rgba(80,115,130,.14);padding-top:4px}
      .ffrp-unresolved{margin-top:12px;padding:9px;border-radius:10px;background:#fff6e7;border:1px solid #f0d29b;font-size:.56rem;line-height:1.45;color:#7b5000}.ffrp-unresolved b{display:block;margin-bottom:4px}.ffrp-unresolved code{display:inline-block;margin:2px 3px 0 0;padding:2px 5px;border-radius:6px;background:#fff;color:#744700}
      .ffrp-footer{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;gap:12px;align-items:center;padding:10px 13px;background:#fff;border-top:1px solid #dbe7ed}.ffrp-play{border:0;border-radius:50%;width:38px;height:38px;background:#0d7084;color:white;font-weight:900;cursor:pointer}.ffrp-range{width:100%;accent-color:#d78a16}.ffrp-time{font:800 .58rem/1 ui-monospace,monospace;color:#4f6874;white-space:nowrap}
      .ffrp-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}
      .ffrp-toast-host{position:fixed;right:14px;bottom:14px;z-index:2147483646;display:grid;gap:8px;pointer-events:none}.ffrp-toast{max-width:420px;padding:10px 12px;border-radius:10px;background:#153d52;color:white;box-shadow:0 12px 35px rgba(0,0,0,.24);font:700 .65rem/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(8px);transition:.2s}.ffrp-toast.show{opacity:1;transform:none}.ffrp-toast.error{background:#8c2d2d}.ffrp-toast.ok{background:#176342}.ffrp-toast.warn{background:#8b5b00}
      .ffrp-main-badge{position:absolute;left:50%;top:54px;transform:translateX(-50%);z-index:2140;display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.94);border:1px solid rgba(10,100,125,.28);box-shadow:0 5px 16px rgba(3,29,57,.12);color:#07576a;font:900 .52rem/1 Inter,system-ui,sans-serif;letter-spacing:.035em;pointer-events:none;white-space:nowrap}.ffrp-main-badge.warn{color:#8b5700;border-color:#e2ad52;background:rgba(255,248,232,.96)}
      .ffrp-fixes-label{white-space:nowrap}.ffrp-fixes-label input{accent-color:#0d7084}
      .leaflet-tooltip.ffrp-native-fix-label{background:rgba(255,255,255,.94);border:1px solid rgba(8,61,90,.22);border-radius:6px;box-shadow:0 2px 7px rgba(3,29,57,.15);padding:3px 5px;color:#073d56;font:800 9px/1.15 Inter,system-ui,sans-serif;white-space:nowrap}.leaflet-tooltip.ffrp-native-fix-label:before{display:none}.ffrp-native-fix-label b{display:block;font-size:9px;letter-spacing:.02em}.ffrp-native-fix-label span{display:block;margin-top:1px;color:#4e6b79;font:700 8px/1.1 ui-monospace,monospace}
      #ffrpVectorFixLayer .ffrp-vfix circle{fill:#fff;stroke:#07576a;stroke-width:2;vector-effect:non-scaling-stroke}#ffrpVectorFixLayer .ffrp-vfix.airport circle{fill:#fff1b9;stroke:#a66b00}#ffrpVectorFixLayer .ffrp-vfix.coord circle{stroke:#754ab2}#ffrpVectorFixLayer .ffrp-vfix text{fill:#0a415c;font:800 13px/1 Inter,system-ui,sans-serif;paint-order:stroke;stroke:rgba(255,255,255,.96);stroke-width:4px;stroke-linejoin:round}#ffrpVectorFixLayer .ffrp-vfix text.meta{font:700 10px/1 ui-monospace,monospace;fill:#3a6175}
      .ffrp-id-card{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(13,112,132,.30);border-radius:11px;padding:6px 10px;background:linear-gradient(135deg,#dff4f8,#fff);font:900 .54rem/1 Inter,system-ui,sans-serif;color:#476a79;box-shadow:0 2px 8px rgba(3,61,90,.07)}.ffrp-id-value{display:inline-flex;gap:1px;align-items:center;font:950 .92rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.07em;color:#064766}.ffrp-id-value .eighth{color:#d11f2e;font-size:1.04rem;font-weight:1000;text-shadow:0 0 0 transparent}.ffrp-id-value .missing{color:#82949d}
      .ffrp-eventbar{position:relative;z-index:12;display:flex;align-items:center;gap:8px;min-height:46px;padding:7px 12px;border-bottom:1px solid #dbe7ed;background:#f6fafb;box-shadow:0 2px 8px rgba(3,29,57,.05)}.ffrp-eventbar button{min-width:32px;width:auto;height:30px;padding:0 9px;border:1px solid #c9dfe7;border-radius:8px;background:#fff;color:#07576a;font-weight:900;cursor:pointer;white-space:nowrap}.ffrp-eventbar label{min-width:0;display:flex;flex:1;align-items:center;gap:7px;font:800 .55rem/1 Inter,system-ui,sans-serif;color:#536d7a}.ffrp-eventbar select{width:min(520px,52vw);max-width:100%;height:30px;border:1px solid #cedfe6;border-radius:8px;background:#fff;color:#123e54;font:700 .56rem/1 Inter,system-ui,sans-serif;padding:0 8px}.ffrp-event-info{margin-left:auto;font:800 .52rem/1.2 Inter,system-ui,sans-serif;color:#55727f;white-space:nowrap}
      .ffrp-point{cursor:pointer}.ffrp-point:hover{border-color:#b9dbe6;background:#eef7fa}.ffrp-point.active-point{box-shadow:inset 3px 0 #0d7084}
      .ffrp-national-note{display:inline-flex;align-items:center;gap:5px;color:#596f79;font:700 .50rem/1.2 Inter,system-ui,sans-serif}

      .ffrp-handoffs-label{white-space:nowrap}.ffrp-handoffs-label input{accent-color:#8a48bd}
      .ffrp-map-hud{position:absolute;left:14px;top:14px;z-index:7;display:grid;gap:7px;max-width:min(390px,calc(100% - 28px));pointer-events:none}.ffrp-map-hud-card{padding:9px 11px;border-radius:11px;background:rgba(255,255,255,.94);border:1px solid rgba(13,112,132,.16);box-shadow:0 7px 22px rgba(3,29,57,.10)}.ffrp-map-hud-card strong{display:block;color:#083d5a;font:900 .66rem/1.25 Inter,system-ui,sans-serif}.ffrp-map-hud-card span{display:block;margin-top:3px;color:#55717e;font:700 .52rem/1.35 ui-monospace,monospace}
      .ffrp-legend{position:absolute;right:14px;bottom:14px;z-index:7;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;max-width:520px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.93);border:1px solid rgba(13,112,132,.15);box-shadow:0 7px 22px rgba(3,29,57,.09);font:750 .49rem/1.2 Inter,system-ui,sans-serif;color:#496572}.ffrp-legend span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}.ffrp-lg-dot{width:8px;height:8px;border-radius:50%;display:inline-block;border:2px solid #07576a;background:#fff}.ffrp-lg-airport{border-color:#a66b00;background:#ffe59a}.ffrp-lg-coord{border-color:#7b4db8}.ffrp-lg-transfer{width:9px;height:9px;border-radius:2px;transform:rotate(45deg);background:#8a48bd;border:1px solid #fff;box-shadow:0 0 0 1px #6e3498}.ffrp-lg-line{width:18px;height:0;border-top:3px solid #e02d25}.ffrp-lg-tail{width:20px;height:0;border-top:2px dashed #7359dd}
      .ffrp-map .route-tail{fill:none;stroke:#7359dd;stroke-width:3;stroke-dasharray:9 7;stroke-linecap:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 1px 1px rgba(0,0,0,.1))}.ffrp-map .route-underlay{fill:none;stroke:#fff;stroke-width:8;stroke-opacity:.65;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.ffrp-map .handoff-marker polygon{fill:#8a48bd;stroke:#fff;stroke-width:2;vector-effect:non-scaling-stroke;filter:drop-shadow(0 1px 2px rgba(0,0,0,.25))}.ffrp-map .handoff-marker text{fill:#65328b;font:900 10px Inter,system-ui,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:4px}.ffrp-map .tail-label{fill:#5a42a6;font:900 9px Inter,system-ui,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:4px;letter-spacing:.04em}
      .ffrp-transfer-marker{width:20px;height:20px;display:grid;place-items:center;transform:rotate(45deg);border-radius:4px;background:#8a48bd;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(66,30,95,.35);font:900 10px/1 Inter,system-ui,sans-serif}.ffrp-transfer-marker span{transform:rotate(-45deg)}.leaflet-tooltip.ffrp-transfer-tip{background:#fff7ff;border:1px solid #c9a8df;color:#55306c;border-radius:7px;box-shadow:0 3px 10px rgba(52,24,70,.18);font:800 9px/1.25 Inter,system-ui,sans-serif}.leaflet-tooltip.ffrp-transfer-tip:before{display:none}
      .ffrp-snap-head{position:sticky;top:-12px;z-index:4;margin:-2px -2px 8px;padding:7px 2px;background:rgba(255,255,255,.97);display:flex;align-items:center;gap:8px;border-bottom:1px solid #edf3f6}.ffrp-snap-head h3{position:static!important;flex:1;margin:0!important;padding:0!important;background:none!important;min-width:0}.ffrp-snap-head button{border:1px solid #c8e1e9;border-radius:8px;background:#e8f4f8;color:#07576a;padding:6px 8px;font:850 .50rem/1 Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
      .ffrp-route-kind{display:inline-flex;margin-left:5px;padding:2px 5px;border-radius:999px;background:#e7f4f8;color:#0d6077;font:900 .43rem/1 Inter,system-ui,sans-serif}.ffrp-route-kind.coord{background:#f1e9fa;color:#7040a0}.ffrp-route-kind.airport{background:#fff1c9;color:#8a5a00}.ffrp-route-kind.transfer{background:#efe3f8;color:#713b98}.ffrp-route-kind.pseudo{background:#ece9ff;color:#5944a1}
      .ffrp-point.transfer-point{border-color:#d8c1e8;background:#fbf7fe}.ffrp-point.transfer-point .ffrp-point-index{background:#eadcf4;color:#6d3794}
      .ffrp-tail-note{margin-top:8px;padding:8px 9px;border-radius:9px;background:#f3f0ff;border:1px dashed #b3a6df;color:#594c82;font:750 .52rem/1.4 Inter,system-ui,sans-serif}.ffrp-tail-note b{color:#4f3e89}
      /* Refinamento visual v1: hierarquia inspirada em WebApps modernos, preservando a identidade cromática FlightFlow. */
      .ffrp-window{--ffrp-navy:#083d5a;--ffrp-cyan:#0d7084;--ffrp-surface:#ffffff;--ffrp-canvas:#edf4f7;--ffrp-border:#d7e4ea;--ffrp-muted:#58717e;width:min(1360px,calc(100vw - 48px));height:min(840px,calc(100vh - 52px));background:var(--ffrp-canvas);border-radius:22px;border:1px solid rgba(17,69,91,.18);box-shadow:0 28px 80px rgba(2,22,38,.34);grid-template-rows:auto auto auto minmax(0,1fr) auto}
      .ffrp-head{min-height:66px;padding:14px 18px;background:linear-gradient(110deg,#073b57 0%,#0a506a 72%,#0d647a 100%);box-shadow:0 8px 24px rgba(3,29,57,.16)}
      .ffrp-head-title{display:grid;gap:3px}.ffrp-head-title .ffrp-eyebrow{margin:0;color:#87d9e8;font:900 .46rem/1 Inter,system-ui,sans-serif;letter-spacing:.13em;text-transform:uppercase}.ffrp-head-title strong{font-size:.92rem;letter-spacing:.005em}.ffrp-head-title .ffrp-head-subtitle{margin:0;color:#d5eaf1;font-size:.56rem}
      .ffrp-close-btn{min-height:34px!important;padding:0 12px!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:10px!important;background:rgba(255,255,255,.10)!important;transition:background .16s ease,transform .16s ease}.ffrp-close-btn:hover{background:rgba(255,255,255,.19)!important;transform:translateY(-1px)}
      .ffrp-toolbar{display:flex;align-items:stretch;gap:9px;flex-wrap:wrap;padding:11px 13px;border-bottom:0;background:#f3f7f9}
      .ffrp-tool-group{display:grid;grid-template-rows:auto 1fr;gap:6px;padding:8px 9px;border:1px solid var(--ffrp-border);border-radius:13px;background:var(--ffrp-surface);box-shadow:0 4px 14px rgba(3,29,57,.05)}
      .ffrp-tool-group-views{flex:0 1 auto}.ffrp-tool-group-data{flex:1 1 500px}.ffrp-tool-group-actions{flex:0 0 auto}
      .ffrp-tool-label{color:#6b818c;font:900 .44rem/1 Inter,system-ui,sans-serif;letter-spacing:.10em;text-transform:uppercase}
      .ffrp-tool-buttons{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ffrp-toolbar button{min-height:31px;border-radius:8px;padding:0 9px;background:#edf6f8;color:#07576a;border:1px solid #c9e1e8;box-shadow:none;transition:background .14s ease,border-color .14s ease,box-shadow .14s ease,transform .14s ease}.ffrp-toolbar button:hover{background:#dff0f4;border-color:#a9d2dd;box-shadow:0 3px 9px rgba(3,61,90,.08);transform:translateY(-1px)}.ffrp-toolbar button.active{background:#0d7084;color:#fff;border-color:#0d7084;box-shadow:0 4px 12px rgba(13,112,132,.20)}.ffrp-toolbar button:disabled{opacity:.48;cursor:not-allowed;transform:none;box-shadow:none}.ffrp-toolbar button:focus-visible,.ffrp-eventbar button:focus-visible,.ffrp-eventbar select:focus-visible,.ffrp-close-btn:focus-visible,.ffrp-play:focus-visible{outline:3px solid rgba(24,160,196,.30);outline-offset:2px}
      .ffrp-tool-status{margin-left:auto;display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;padding:1px 0}.ffrp-id-card{min-height:46px;padding:6px 10px;border-radius:12px;background:linear-gradient(145deg,#def2f6,#fff);box-shadow:0 4px 14px rgba(3,61,90,.07)}.ffrp-stat{min-height:32px;padding:6px 9px;background:#fff;border-color:var(--ffrp-border)}
      .ffrp-eventbar{z-index:12;margin:0 13px 1px;min-height:48px;padding:7px 9px;border:1px solid var(--ffrp-border);border-radius:12px;background:#fff;box-shadow:0 4px 14px rgba(3,29,57,.045)}.ffrp-eventbar button{border-radius:8px;transition:background .14s ease,border-color .14s ease,transform .14s ease}.ffrp-eventbar button:hover{background:#edf6f8;border-color:#afd4de;transform:translateY(-1px)}.ffrp-eventbar select{border-color:#cfdee4;background:#f9fbfc}
      .ffrp-body{grid-template-columns:minmax(0,1fr) minmax(330px,370px);gap:12px;padding:11px 13px 12px;background:var(--ffrp-canvas)}
      .ffrp-map-wrap{border:1px solid #cbdce3;border-radius:16px;background:#dceaf0;box-shadow:0 8px 24px rgba(3,29,57,.08);overflow:hidden}.ffrp-map{background:linear-gradient(180deg,#d8e9ef 0%,#eaf3f6 100%)}
      .ffrp-side{border:1px solid var(--ffrp-border);border-radius:16px;background:#f9fbfc;padding:12px;box-shadow:0 8px 24px rgba(3,29,57,.06)}.ffrp-side h3{background:rgba(249,251,252,.97)}
      .ffrp-snap-head{margin:-2px -2px 10px;padding:7px 2px 9px;background:rgba(249,251,252,.97)}.ffrp-route-list{gap:7px}.ffrp-point{padding:9px 10px;border-radius:11px;background:#fff;border-color:#dde8ed;box-shadow:0 2px 7px rgba(3,29,57,.035);transition:border-color .14s ease,background .14s ease,box-shadow .14s ease,transform .14s ease}.ffrp-point:hover{border-color:#b5d6df;background:#f6fbfc;box-shadow:0 5px 14px rgba(3,61,90,.07);transform:translateY(-1px)}.ffrp-point.active-point{border-color:#9eced9;box-shadow:inset 3px 0 #0d7084,0 5px 14px rgba(3,61,90,.07)}.ffrp-point.unresolved{background:#fff9ef;border-color:#eed49f}.ffrp-point.transfer-point{background:#fcf9fe;border-color:#d9c7e5}
      .ffrp-map-hud-card,.ffrp-legend,.ffrp-map-note{backdrop-filter:blur(8px);box-shadow:0 8px 22px rgba(3,29,57,.10)}.ffrp-map-hud-card{border-radius:12px}.ffrp-map-note{border-radius:12px}.ffrp-legend{border-radius:11px}
      .ffrp-footer{margin:0 13px 12px;padding:8px 10px;border:1px solid var(--ffrp-border);border-radius:12px;background:#fff;box-shadow:0 4px 14px rgba(3,29,57,.045)}.ffrp-play{width:36px;height:36px;box-shadow:0 5px 14px rgba(13,112,132,.20);transition:transform .14s ease,box-shadow .14s ease}.ffrp-play:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(13,112,132,.26)}
      @media(max-width:1180px){.ffrp-window{width:calc(100vw - 30px);height:calc(100vh - 32px)}.ffrp-tool-group-data{flex-basis:420px}.ffrp-tool-status{width:100%;margin-left:0;justify-content:flex-start}.ffrp-body{grid-template-columns:minmax(0,1fr) minmax(305px,340px)}}
      @media(max-width:900px){.ffrp-modal{padding:8px}.ffrp-window{height:calc(100vh - 16px);width:calc(100vw - 16px);border-radius:16px}.ffrp-head{min-height:60px;padding:12px 14px}.ffrp-toolbar{padding:9px}.ffrp-tool-group{flex:1 1 280px}.ffrp-tool-group-data{flex-basis:100%}.ffrp-eventbar{margin:0 9px 1px;flex-wrap:wrap}.ffrp-eventbar label{flex:1 1 360px}.ffrp-eventbar select{width:100%}.ffrp-event-info{margin-left:0}.ffrp-body{grid-template-columns:1fr;grid-template-rows:minmax(320px,1fr) minmax(190px,260px);padding:9px;gap:9px}.ffrp-side{max-height:none;border-top:1px solid var(--ffrp-border)}.ffrp-map-wrap{border-right:1px solid #cbdce3}.ffrp-footer{margin:0 9px 9px}}
      @media(max-width:640px){.ffrp-window{width:100vw;height:100vh;border:0;border-radius:0}.ffrp-modal{padding:0}.ffrp-head-title .ffrp-head-subtitle{display:none}.ffrp-head{padding:10px 12px}.ffrp-toolbar{max-height:226px;overflow:auto}.ffrp-tool-group{flex-basis:100%}.ffrp-tool-buttons button{flex:1 1 132px}.ffrp-tool-status{align-items:stretch}.ffrp-id-card{flex:1 1 auto}.ffrp-eventbar{margin:0 7px}.ffrp-eventbar label{order:5;flex-basis:100%}.ffrp-event-info{order:6;width:100%}.ffrp-body{grid-template-rows:minmax(280px,1fr) minmax(175px,235px);padding:7px}.ffrp-map-hud{left:8px;top:8px;max-width:calc(100% - 16px)}.ffrp-legend{left:8px;right:8px;bottom:8px;justify-content:flex-start;max-width:none}.ffrp-map-note{left:8px;bottom:64px;max-width:calc(100% - 16px)}.ffrp-footer{margin:0 7px 7px;grid-template-columns:auto minmax(120px,1fr) auto;gap:8px}}

    `;
    document.head.appendChild(s);
  }

  function openDb() {
    return new Promise((resolve,reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível.'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const st = db.createObjectStore(STORE, { keyPath: 'ident' });
          st.createIndex('source','source',{unique:false});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Falha ao abrir NAVDB.'));
    });
  }

  async function dbPutMany(records) {
    if (!records.length) return 0;
    const db = await openDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(STORE,'readwrite');
      const st = tx.objectStore(STORE);
      for (const r of records) st.put(r);
      tx.oncomplete = () => { db.close(); resolve(records.length); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Falha ao gravar NAVDB.')); };
    });
  }

  async function dbGet(ident) {
    const db = await openDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(STORE,'readonly');
      const req = tx.objectStore(STORE).get(norm(ident));
      req.onsuccess = () => { const v=req.result||null; db.close(); resolve(v); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }

  async function dbCount() {
    try {
      const db = await openDb();
      return await new Promise((resolve,reject)=>{
        const req=db.transaction(STORE,'readonly').objectStore(STORE).count();
        req.onsuccess=()=>{const v=req.result||0;db.close();resolve(v)};
        req.onerror=()=>{db.close();reject(req.error)};
      });
    } catch (_) { return 0; }
  }

  function seedEmbeddedBase() {
    model.embedded.clear();
    const rows = window.__FLIGHTFLOW_GEO_DATA__?.airports || [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 3) continue;
      const ident=norm(row[0]), lat=Number(row[1]), lon=Number(row[2]);
      if (!ident || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      model.embedded.set(ident,{ident,lat,lon,source:'FlightFlow base geográfica',kind:'airport'});
    }
    try {
      const payload = JSON.parse(localStorage.getItem('flightflow-custom-aerodromes-v1') || '{}');
      const src = payload?.aerodromes || payload || {};
      for (const [k,v] of Object.entries(src)) {
        const ident=norm(v?.code || k), lat=Number(v?.lat), lon=Number(v?.lon);
        if (ident && Number.isFinite(lat) && Number.isFinite(lon)) model.embedded.set(ident,{ident,lat,lon,source:'FlightFlow coordenada confirmada',kind:'airport'});
      }
    } catch (_) {}
    // A base oficial incorporada entra por último para fixos nominais, sem depender de rede/proxy.
    for (const row of OFFICIAL_SEED) {
      model.embedded.set(row.ident,{...row});
    }
    // Importações do operador permanecem em memória mesmo se IndexedDB estiver
    // indisponível (ex.: contexto de arquivo restrito/ambiente corporativo).
    for (const row of model.imported.values()) model.embedded.set(row.ident,{...row});
  }

  function parseCoordinateIdent(ident) {
    const s = norm(ident).replace(/\s+/g,'');
    let m = s.match(/^(\d{2})(\d{2})([NS])(\d{3})(\d{2})([EW])$/);
    if (m) {
      let lat=Number(m[1])+Number(m[2])/60;
      let lon=Number(m[4])+Number(m[5])/60;
      if (m[3]==='S') lat=-lat; if (m[6]==='W') lon=-lon;
      return {ident:s,lat,lon,source:'Coordenada explícita do histórico',kind:'coordinate'};
    }
    m = s.match(/^(\d{2})(\d{2})(\d{2})([NS])(\d{3})(\d{2})(\d{2})([EW])$/);
    if (m) {
      let lat=Number(m[1])+Number(m[2])/60+Number(m[3])/3600;
      let lon=Number(m[5])+Number(m[6])/60+Number(m[7])/3600;
      if (m[4]==='S') lat=-lat; if (m[8]==='W') lon=-lon;
      return {ident:s,lat,lon,source:'Coordenada explícita do histórico',kind:'coordinate'};
    }
    return null;
  }

  function tokenList(value) {
    return String(value || '').trim().split(/\s+/).map(norm).filter(Boolean);
  }

  function cleanEtim(raw) {
    const s=String(raw||'').trim();
    return {raw:s, clean:s.replace(/\*/g,''), passed:s.includes('*')};
  }

  function parseBlockDateTime(block) {
    const m = block.match(/data\s*:\s*(\d{2})\/(\d{2})\/(\d{4}).{0,80}?hora\s*:\s*(\d{2}):(\d{2}):(\d{2})/is);
    if (!m) return null;
    return {day:+m[1],month:+m[2],year:+m[3],hour:+m[4],minute:+m[5],second:+m[6], key:Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6])};
  }

  function parseEtimKey(etim, eventDt) {
    const m=String(etim||'').replace(/\*/g,'').match(/^(\d{2})-(\d{2}):(\d{2})$/);
    if (!m || !eventDt) return null;
    const day=+m[1], hour=+m[2], minute=+m[3];
    let year=eventDt.year, month=eventDt.month;
    // Históricos de voo normalmente ficam no mesmo mês. Trata virada simples de mês.
    if (day < eventDt.day - 15) {
      month += 1; if (month>12){month=1;year+=1;}
    } else if (day > eventDt.day + 15) {
      month -= 1; if (month<1){month=12;year-=1;}
    }
    return Date.UTC(year,month-1,day,hour,minute,0);
  }

  function parsePointRows(block, eventDt) {
    const lines = block.replace(/\r/g,'').split('\n');
    const points=[];
    for (let i=0;i<lines.length;i++) {
      const pm=lines[i].match(/^\s*PONTOS\s*:\s*(.*?)\s*$/i);
      if (!pm) continue;
      const ids=tokenList(pm[1]);
      if (!ids.length) continue;
      let etims=[], levels=[];
      for (let j=i+1;j<Math.min(lines.length,i+7);j++) {
        if (/^\s*PONTOS\s*:/i.test(lines[j])) break;
        const em=lines[j].match(/^\s*ETIM\s*:\s*(.*?)\s*$/i);
        if (em) { etims=String(em[1]).trim().split(/\s+/).filter(Boolean); continue; }
        const cm=lines[j].match(/^\s*(?:CFL\/IFL|CFL|IFL)\s*:\s*(.*?)\s*$/i);
        if (cm) { levels=String(cm[1]).trim().split(/\s+/).filter(Boolean); continue; }
        if (/^\s*(?:MOTIVO|N[ií]vel|Ponto de Autoriza|OPERA|Mensagem|Conteúdo)\s*:/i.test(lines[j])) break;
      }
      ids.forEach((ident,idx)=>{
        const e=cleanEtim(etims[idx]||'');
        points.push({ident,etim:e.clean,etimRaw:e.raw,passed:e.passed,cfl:levels[idx]||'',etimKey:parseEtimKey(e.clean,eventDt)});
      });
    }
    return points;
  }

  function firstMatch(text, patterns) {
    for (const re of patterns) { const m=text.match(re); if (m?.[1]) return norm(m[1]); }
    return '';
  }


  function positionClass(position) {
    const p=norm(position);
    if(!p || p==='NUL')return 'SETOR';
    if(/^CTR/.test(p))return 'ACC';
    if(/APP/.test(p))return 'APP';
    if(/TWR/.test(p))return 'TWR';
    if(/AIDC|OLDI/.test(p))return 'ÓRGÃO';
    if(/AUT/.test(p))return 'TERMINAL';
    return p;
  }

  function parseRouteSegments(raw) {
    const lines=String(raw||'').replace(/\r/g,'').split('\n');
    for(let i=0;i<lines.length;i++){
      if(!/^\s*TRECHOS\s*:/i.test(lines[i]))continue;
      const segs=tokenList(lines[i].replace(/^\s*TRECHOS\s*:\s*/i,''));
      const posLine=lines.slice(i+1,i+4).find(x=>/^\s*Posi.{0,3}o\s*:/i.test(x));
      const primLine=lines.slice(i+1,i+5).find(x=>/^\s*PrimPto\s*:/i.test(x));
      if(!segs.length||!posLine||!primLine)continue;
      const positions=tokenList(posLine.replace(/^\s*Posi.{0,3}o\s*:\s*/i,''));
      const firstPoints=String(primLine.replace(/^\s*PrimPto\s*:\s*/i,'')).trim().split(/\s+/).map(Number).filter(Number.isFinite);
      const transfers=[];
      for(let j=1;j<segs.length;j++){
        const pointIndex=Number(firstPoints[j]); if(!Number.isFinite(pointIndex))continue;
        const fromPosition=positions[j-1]||'',toPosition=positions[j]||'';
        const fromClass=positionClass(fromPosition),toClass=positionClass(toPosition);
        transfers.push({pointIndex,fromSegment:segs[j-1],toSegment:segs[j],fromPosition,toPosition,fromClass,toClass,type:`${fromClass} → ${toClass}`});
      }
      return {segments:segs,positions,firstPoints,transfers};
    }
    return {segments:[],positions:[],firstPoints:[],transfers:[]};
  }

  function transferMarkersForSnapshot(snapshot) {
    const transfers=model.history?.routeSegments?.transfers||[];
    if(!snapshot?.points?.length)return[];
    return transfers.map((t,i)=>{
      const point=snapshot.points[t.pointIndex];
      if(!point?.geo)return null;
      return {...t,index:i,point,label:`${t.fromSegment} → ${t.toSegment}`,detail:`${t.type}${t.fromPosition||t.toPosition?` · ${t.fromPosition||'—'} → ${t.toPosition||'—'}`:''}`};
    }).filter(Boolean);
  }

  function parseHistory(text, sourceFile='') {
    const raw=String(text||'').replace(/\r\n?/g,'\n');
    const callsign=firstMatch(raw,[/Indicativo do plano\s*:\s*([A-Z0-9-]+)/i,/Indicativo\s*:\s*([A-Z0-9-]+)/i,/-ARCID\s+([A-Z0-9-]+)/i]);
    const adep=firstMatch(raw,[/\bADEP\s*:\s*([A-Z0-9]{4})\b/i,/-ADEP\s+([A-Z0-9]{4})\b/i,/\bADEP\s+([A-Z0-9]{4})\b/i]);
    const ades=firstMatch(raw,[/\bADES\s*:\s*([A-Z0-9]{4})\b/i,/-ADES\s+([A-Z0-9]{4})\b/i,/\bADES\s+([A-Z0-9]{4})\b/i]);
    const ids=[...raw.matchAll(/(?:IDPLANO\s*:\s*|-IDPLANO\s+|IDPLANO\s+)([A-Z0-9]{6,14})/gi)].map(m=>norm(m[1]));
    const idPlano=ids.at(-1)||'';
    const routeLines=raw.split('\n');
    let route='';
    for(let i=0;i<routeLines.length;i++){
      const routeMatch=/^\s*Rota\s*:\s*(.*?)\s*$/i.exec(routeLines[i]);
      if(!routeMatch)continue;
      const parts=[String(routeMatch[1]||'').trim()];
      for(let j=i+1;j<routeLines.length;j++){
        const line=routeLines[j];
        if(!/^\s+\S/.test(line))break;
        const trimmed=String(line).trim();
        if(/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .()/_-]{0,48}\s*:/.test(trimmed))break;
        parts.push(trimmed);
      }
      route=parts.filter(Boolean).join(' ');
      break;
    }
    const blocks=raw.split(/\n?#{20,}\n?/).map(x=>x.trim()).filter(Boolean);
    const routeSegments=parseRouteSegments(raw);
    const snapshots=[];
    const events=[];
    let lastSignature='';
    blocks.forEach((block,blockIndex)=>{
      const eventDt=parseBlockDateTime(block);
      const op=(block.match(/^\s*OPERA[^:]*:\s*(.*?)\s*$/im)?.[1]||'').trim();
      const sectorLine=block.match(/Estado:\s*(\S+)\s+Setor anterior:\s*(.*?)\s+atual:\s*(.*?)\s+seguinte:\s*(.*?)\s*$/im);
      events.push({blockIndex,eventDt,operation:op,rawBlock:block,sector:sectorLine?{state:norm(sectorLine[1]),previous:String(sectorLine[2]).trim(),current:String(sectorLine[3]).trim(),next:String(sectorLine[4]).trim()}:null});
      const pts=parsePointRows(block,eventDt);
      if (pts.length>=2) {
        const sig=JSON.stringify(pts.map(p=>[p.ident,p.etimRaw,p.cfl]));
        if (sig!==lastSignature) {
          snapshots.push({blockIndex,eventDt,operation:op||'Quadro de rota processada',points:pts,signature:sig});
          lastSignature=sig;
        }
      }
    });
    return {sourceFile,callsign,adep,ades,idPlano,route,routeSegments,blocksCount:blocks.length,events,snapshots,raw};
  }

  async function resolveIdent(ident) {
    const id=norm(ident);
    const coord=parseCoordinateIdent(id); if (coord) return coord;
    if (model.embedded.has(id)) return model.embedded.get(id);
    try { const rec=await dbGet(id); if (rec) return rec; } catch (_) {}
    return null;
  }

  async function resolveSnapshot(snapshot) {
    const resolved=[];
    for (const p of snapshot.points) {
      const geo=await resolveIdent(p.ident);
      resolved.push({...p,geo});
    }
    return {...snapshot,points:resolved};
  }

  async function resolveAllSnapshots(history) {
    const token=++model.lastAnalysisToken;
    const out=[];
    for (const snap of history.snapshots) {
      out.push(await resolveSnapshot(snap));
      if (token!==model.lastAnalysisToken) return [];
    }
    return out;
  }

  function snapshotIsComplete(snapshot) {
    return !!(snapshot && snapshot.points && snapshot.points.length >= 2 && snapshot.points.every(p=>p.geo && Number.isFinite(Number(p.geo.lat)) && Number.isFinite(Number(p.geo.lon))));
  }


  function destinationGeo() {
    const ades=norm(model.history?.ades||'');
    if(!ades)return null;
    return model.embedded.get(ades)||model.imported.get(ades)||null;
  }

  function terminalEventKeyAfter(key) {
    const events=window.__FlightFlowFirBridge?.state?.parsed?.events||[];
    const candidates=[];
    for(const event of events){
      const k=eventDateTimeKey(event); if(k==null || (Number.isFinite(key)&&k<=key))continue;
      const text=norm(`${event.operation||''} ${event.messageType||''}`);
      const terminal=/(ORDEM TER|ARQUIV|TERMIN|TÉRMIN|POUSO|CHEGADA|ARR\b|ENCERR)/i.test(text);
      candidates.push({key:k,terminal});
    }
    const preferred=candidates.find(x=>x.terminal); if(preferred)return preferred.key;
    return candidates.length?candidates.at(-1).key:null;
  }

  function pseudoDestinationTail(snapshot) {
    if(!snapshotIsComplete(snapshot))return null;
    const actual=snapshot.points||[]; if(!actual.length)return null;
    const last=actual.at(-1),ades=norm(model.history?.ades||'');
    if(!ades || norm(last.ident)===ades)return null;
    const dest=destinationGeo(); if(!dest||!Number.isFinite(Number(dest.lat))||!Number.isFinite(Number(dest.lon)))return null;
    const dx=(Number(dest.lon)-Number(last.geo.lon))*Math.cos(((Number(dest.lat)+Number(last.geo.lat))/2)*Math.PI/180),dy=Number(dest.lat)-Number(last.geo.lat);
    if(Math.hypot(dx,dy)<.025)return null;
    const startKey=Number.isFinite(last.etimKey)?last.etimKey:null;
    let endKey=terminalEventKeyAfter(startKey);
    if(!Number.isFinite(endKey) && Number.isFinite(startKey))endKey=startKey+20*60*1000;
    const d=endKey?new Date(endKey):null;
    const etim=d?`${String(d.getUTCDate()).padStart(2,'0')}-${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`:'';
    return {from:last,to:{ident:ades,etim,etimRaw:etim,passed:false,cfl:last.cfl||'',etimKey:endKey,geo:{...dest,source:'Aproximação gráfica estimada até ADES',kind:'airport'},synthetic:true,pseudo:true},startKey,endKey};
  }

  function movementPoints(snapshot) {
    const actual=(snapshot?.points||[]).slice();
    const tail=pseudoDestinationTail(snapshot);
    return tail?actual.concat([tail.to]):actual;
  }

  function countResolvedGeos(snapshot){return (snapshot?.points||[]).filter(p=>p.geo&&Number.isFinite(Number(p.geo.lat))&&Number.isFinite(Number(p.geo.lon))).length}

  function bestSnapshotForMovement() {
    const list=model.resolvedSnapshots||[];
    if(!list.length)return null;
    const complete=[...list].filter(snapshotIsComplete);
    if(complete.length)return complete.at(-1);
    return [...list].sort((a,b)=>countResolvedGeos(b)-countResolvedGeos(a))[0]||list.at(-1)||null;
  }

  function pointTimelineRatios(points) {
    const keyed=points.map((p,i)=>({i,key:Number.isFinite(p?.etimKey)?p.etimKey:null})).filter(x=>x.key!=null);
    if(keyed.length>=2){
      const min=keyed[0].key,max=keyed.at(-1).key;
      if(max>min){
        return points.map((p,i)=>{
          const key=Number.isFinite(p?.etimKey)?p.etimKey:null;
          if(key!=null)return clamp((key-min)/(max-min),0,1);
          return i/Math.max(1,points.length-1);
        });
      }
    }
    return points.map((_,i)=>i/Math.max(1,points.length-1));
  }

  function movementEventText(event) {
    return norm(`${event?.operation||''} ${event?.rawBlock||event?.content||''} ${event?.messageType||''}`);
  }

  function isReceivedDepEvent(event) {
    const op=norm(event?.operation||'');
    const raw=norm(event?.rawBlock||event?.content||'');
    if(/RECEP(?:Ç|C)[AÃ]O DE MENSAGEM DEP/.test(op))return true;
    if(/OPERA(?:Ç|C)[AÃ]O\s*:\s*RECEP(?:Ç|C)[AÃ]O DE MENSAGEM DEP/.test(raw))return true;
    return false;
  }

  function firstDepartureAnchor() {
    const nativeEvents=window.__FlightFlowFirBridge?.state?.parsed?.events||[];
    let index=nativeEvents.findIndex(isReceivedDepEvent);
    if(index>=0){
      const event=nativeEvents[index];
      return {index,key:eventDateTimeKey(event),event,source:'native'};
    }
    const historyEvents=model.history?.events||[];
    const hIndex=historyEvents.findIndex(isReceivedDepEvent);
    if(hIndex>=0){
      const nativeTotal=nativeEvents.length||historyEvents.length||1;
      const index=nativeTotal<=1||historyEvents.length<=1?0:clamp(Math.round(hIndex*(nativeTotal-1)/(historyEvents.length-1)),0,nativeTotal-1);
      const event=historyEvents[hIndex];
      return {index,key:eventDateTimeKey(event),event,source:'history',historyIndex:hIndex};
    }
    return null;
  }

  function movementWindowForHistory() {
    const events=model.history?.events||[];
    if(!events.length)return {start:0,end:Math.max(1,nativeEventCount()-1)};
    const depIndex=events.findIndex(isReceivedDepEvent);
    let start=depIndex>=0?depIndex:events.findIndex(e=>/(AN[ÚU]NCIO DE MOVIMENTO|DECOL|SAÍDA|SAIDA|ATIVAÇ|ATIVAC)/i.test(movementEventText(e)));
    if(start<0)start=0;
    let end=events.findIndex((e,i)=>i>start&&/(ORDEM TER|TÉRMIN|TERMIN|POUSO|CHEGADA|ARR\b|ARQUIV|ENCERR)/i.test(movementEventText(e)));
    if(end<0)end=events.length-1;
    if(end<=start)end=Math.max(start+1,events.length-1);
    return {start,end};
  }

  function historyIndexToNativeIndex(index,nativeTotal) {
    const histTotal=model.history?.events?.length||0;
    if(!histTotal)return clamp(index,0,Math.max(0,nativeTotal-1));
    if(!nativeTotal)nativeTotal=nativeEventCount()||histTotal;
    if(nativeTotal<=1 || histTotal<=1)return 0;
    return clamp(Math.round(index*(nativeTotal-1)/Math.max(1,histTotal-1)),0,nativeTotal-1);
  }

  function firstPostDepSnapshot(depKey) {
    const list=(model.resolvedSnapshots||[]).filter(snapshotIsComplete);
    if(!list.length)return bestSnapshotForMovement();
    if(!Number.isFinite(depKey))return list.at(-1);
    const atOrAfter=list.find(s=>Number.isFinite(s.eventDt?.key)&&s.eventDt.key>=depKey);
    return atOrAfter||list.at(-1);
  }

  function snapshotForMovementKey(key,depKey,depSnapshot) {
    const list=(model.resolvedSnapshots||[]).filter(snapshotIsComplete);
    if(!list.length)return depSnapshot||bestSnapshotForMovement();
    let chosen=depSnapshot||list[0];
    if(!Number.isFinite(key))return chosen;
    for(const snap of list){
      const sk=snap.eventDt?.key;
      if(!Number.isFinite(sk))continue;
      if(Number.isFinite(depKey)&&sk<depKey)continue;
      if(sk<=key)chosen=snap; else break;
    }
    return chosen;
  }

  function routeDistanceFractions(points) {
    const list=(points||[]).filter(p=>p?.geo&&Number.isFinite(Number(p.geo.lat))&&Number.isFinite(Number(p.geo.lon)));
    if(!list.length)return [];
    const cumulative=[0];let total=0;
    for(let i=1;i<list.length;i++){
      const a=list[i-1].geo,b=list[i].geo;
      const mid=((Number(a.lat)+Number(b.lat))/2)*Math.PI/180;
      const dx=(Number(b.lon)-Number(a.lon))*Math.cos(mid),dy=Number(b.lat)-Number(a.lat);
      const d=Math.hypot(dx,dy);
      total+=Number.isFinite(d)?d:0;
      cumulative.push(total);
    }
    if(total<=1e-12)return cumulative.map((_,i)=>i/Math.max(1,list.length-1));
    return cumulative.map(v=>clamp(v/total,0,1));
  }

  function progressBetweenCanonicalPoints(canonical,fractions,aIndex,bIndex,localFraction=0) {
    if(!canonical?.length)return 0;
    const ai=clamp(Number(aIndex)||0,0,canonical.length-1),bi=clamp(Number(bIndex)||0,0,canonical.length-1);
    const fa=Number.isFinite(fractions?.[ai])?fractions[ai]:ai/Math.max(1,canonical.length-1);
    const fb=Number.isFinite(fractions?.[bi])?fractions[bi]:bi/Math.max(1,canonical.length-1);
    return clamp(fa+(fb-fa)*clamp(Number(localFraction)||0,0,1),0,1);
  }

  function canonicalPointIndex(canonical,ident,fallback=-1) {
    const id=norm(ident);const found=canonical.findIndex(p=>norm(p.ident)===id);return found>=0?found:fallback;
  }

  function snapProgressToEtimMinute(snapshot,eventKey,canonical,depKey,fallback) {
    if(!snapshot||!canonical?.length||!Number.isFinite(eventKey))return fallback;
    const fractions=routeDistanceFractions(canonical);
    const firstRoutePoint=(snapshot.points||[]).find(p=>Number.isFinite(p.etimKey));
    let depShift=0;
    if(Number.isFinite(depKey)&&firstRoutePoint&&norm(firstRoutePoint.ident)===norm(model.history?.adep||'')&&Math.abs(depKey-firstRoutePoint.etimKey)<=5*60*1000){
      depShift=depKey-firstRoutePoint.etimKey;
    }
    const eventMinute=Math.floor(eventKey/60000);
    let best=null;
    (snapshot.points||[]).forEach((p,i)=>{
      if(!Number.isFinite(p.etimKey))return;
      const shifted=p.etimKey+depShift;
      if(Math.floor(shifted/60000)!==eventMinute)return;
      const ci=canonicalPointIndex(canonical,p.ident,i);
      const progress=Number.isFinite(fractions[ci])?fractions[ci]:ci/Math.max(1,canonical.length-1);
      // Se dois pontos tiverem o mesmo ETIM, usa o mais adiante na rota.
      if(!best||progress>best.progress)best={progress,ident:p.ident};
    });
    return best?clamp(best.progress,0,1):fallback;
  }

  function candidateProgressFromSnapshot(snapshot,eventKey,canonical,tail,depKey) {
    if(!snapshot||!canonical?.length)return 0;
    const fractions=routeDistanceFractions(canonical);
    const keyed=[];
    let passedFloor=0;
    const firstRoutePoint=(snapshot.points||[]).find(p=>Number.isFinite(p.etimKey));
    let depShift=0;
    if(Number.isFinite(depKey)&&firstRoutePoint&&norm(firstRoutePoint.ident)===norm(model.history?.adep||'')&&Math.abs(depKey-firstRoutePoint.etimKey)<=5*60*1000){
      depShift=depKey-firstRoutePoint.etimKey;
    }
    (snapshot.points||[]).forEach((p,i)=>{
      const ci=canonicalPointIndex(canonical,p.ident,i);
      const pf=Number.isFinite(fractions[ci])?fractions[ci]:ci/Math.max(1,canonical.length-1);
      if(p.passed)passedFloor=Math.max(passedFloor,pf);
      if(Number.isFinite(p.etimKey))keyed.push({ci,key:p.etimKey+depShift});
    });
    keyed.sort((a,b)=>a.key-b.key||a.ci-b.ci);
    if(!Number.isFinite(eventKey)||!keyed.length)return passedFloor;
    let cand=0;
    if(eventKey<=keyed[0].key){
      cand=Number.isFinite(fractions[keyed[0].ci])?fractions[keyed[0].ci]:0;
    }else{
      let matched=false;
      for(let k=0;k<keyed.length-1;k++){
        const a=keyed[k],b=keyed[k+1];
        if(eventKey>=a.key&&eventKey<=b.key){
          const f=b.key>a.key?(eventKey-a.key)/(b.key-a.key):1;
          cand=progressBetweenCanonicalPoints(canonical,fractions,a.ci,b.ci,f);matched=true;break;
        }
      }
      if(!matched){
        const last=keyed.at(-1),lastP=Number.isFinite(fractions[last.ci])?fractions[last.ci]:1;
        if(tail&&Number.isFinite(tail.endKey)&&tail.endKey>last.key&&eventKey<tail.endKey){
          const destIndex=canonical.length-1;
          const f=clamp((eventKey-last.key)/(tail.endKey-last.key),0,1);
          cand=progressBetweenCanonicalPoints(canonical,fractions,last.ci,destIndex,f);
        }else if(tail&&Number.isFinite(tail.endKey)&&eventKey>=tail.endKey)cand=1;
        else cand=lastP;
      }
    }
    cand=snapProgressToEtimMinute(snapshot,eventKey,canonical,depKey,cand);
    return clamp(Math.max(cand,passedFloor),0,1);
  }

  function nativeEventTimeOrHistory(index,nativeEvents) {
    const direct=eventDateTimeKey(nativeEvents?.[index]);
    if(Number.isFinite(direct))return direct;
    const hist=model.history?.events||[];
    if(!hist.length)return null;
    const h=nativeEvents?.length>1?Math.round(index*(hist.length-1)/(nativeEvents.length-1)):index;
    return eventDateTimeKey(hist[clamp(h,0,hist.length-1)]);
  }

  function buildMovementProfile() {
    const master=bestSnapshotForMovement();
    if(!master)return null;
    const canonical=movementPoints(master).filter(p=>p?.geo&&Number.isFinite(Number(p.geo.lat))&&Number.isFinite(Number(p.geo.lon)));
    if(canonical.length<2)return null;
    const nativeEvents=window.__FlightFlowFirBridge?.state?.parsed?.events||model.history?.events||[];
    const nativeTotal=Math.max(nativeEvents.length,1);
    const dep=firstDepartureAnchor();
    const fallbackWindow=movementWindowForHistory();
    const startNative=dep?clamp(dep.index,0,nativeTotal-1):historyIndexToNativeIndex(fallbackWindow.start,nativeTotal);
    const depKey=Number.isFinite(dep?.key)?dep.key:nativeEventTimeOrHistory(startNative,nativeEvents);
    const depSnapshot=firstPostDepSnapshot(depKey)||master;
    const masterTail=pseudoDestinationTail(master);
    const targets=[];
    let previous=0;
    for(let i=0;i<nativeTotal;i++){
      const key=nativeEventTimeOrHistory(i,nativeEvents);
      let target=0;
      if(i<=startNative){
        target=0; // a primeira DEP é o instante de decolagem: ainda no ADEP.
      }else{
        const snap=snapshotForMovementKey(key,depKey,depSnapshot);
        target=candidateProgressFromSnapshot(snap,key,canonical,masterTail,depKey);
        // Estimados podem ser recalculados após DEP; nunca deixe a aeronave voltar no tempo/rota.
        target=Math.max(previous,target);
      }
      target=clamp(target,0,1);
      targets.push(target);previous=target;
    }
    // Se existir um evento de término posterior ao último fixo/ADES, mantém 100% sem regressão.
    const endNative=targets.findIndex((v,i)=>i>startNative&&v>=.999999);
    const distanceFractions=routeDistanceFractions(canonical);
    const milestones=canonical.map((_,pi)=>{
      const goal=Number.isFinite(distanceFractions[pi])?distanceFractions[pi]:pi/Math.max(1,canonical.length-1);
      let idx=targets.findIndex((v,i)=>i>=startNative&&v+1e-9>=goal);
      if(idx<0)idx=nativeTotal-1;return idx;
    });
    return {snapshot:master,departureSnapshot:depSnapshot,points:canonical,distanceFractions,startNative,departureKey:depKey,departureEvent:dep?.event||null,endNative:endNative>=0?endNative:nativeTotal-1,milestones,targets};
  }

  function rebuildMovementProfile() {
    model.movementProfile=buildMovementProfile();
    return model.movementProfile;
  }

  function progressForNativeEventIndex(index,total) {
    const nativeTotal=Math.max(total||0,nativeEventCount(),model.history?.events?.length||0,1);
    const prof=model.movementProfile||buildMovementProfile();
    if(prof&&Array.isArray(prof.targets)&&prof.targets.length){
      const i=clamp(Number(index)||0,0,prof.targets.length-1);
      const v=prof.targets[i];
      if(Number.isFinite(v))return clamp(v,0,1);
    }
    return nativeTotal>1?clamp((Number(index)||0)/(nativeTotal-1),0,1):0;
  }

  function progressForEvent(snapshot,event,index,total) {
    return progressForNativeEventIndex(index,total||nativeEventCount()||model.history?.events?.length||1);
  }


  function shiftedEtimEntries(snapshot,canonical,depKey) {
    if(!snapshot||!canonical?.length)return [];
    const fractions=routeDistanceFractions(canonical);
    const firstRoutePoint=(snapshot.points||[]).find(p=>Number.isFinite(p.etimKey));
    let depShift=0;
    if(Number.isFinite(depKey)&&firstRoutePoint&&norm(firstRoutePoint.ident)===norm(model.history?.adep||'')&&Math.abs(depKey-firstRoutePoint.etimKey)<=5*60*1000){
      depShift=depKey-firstRoutePoint.etimKey;
    }
    const out=[];
    (snapshot.points||[]).forEach((p,i)=>{
      if(!Number.isFinite(p.etimKey))return;
      const ci=canonicalPointIndex(canonical,p.ident,i);
      const progress=Number.isFinite(fractions[ci])?fractions[ci]:ci/Math.max(1,canonical.length-1);
      out.push({ident:p.ident,etim:p.etim||'',key:p.etimKey+depShift,progress,canonicalIndex:ci,pseudo:false});
    });
    const tail=pseudoDestinationTail(snapshot);
    if(tail&&Number.isFinite(tail.endKey)){
      const ci=canonicalPointIndex(canonical,tail.to.ident,canonical.length-1);
      const progress=Number.isFinite(fractions[ci])?fractions[ci]:1;
      out.push({ident:tail.to.ident,etim:tail.to.etim||'',key:tail.endKey,progress,canonicalIndex:ci,pseudo:true});
    }
    return out.sort((a,b)=>a.progress-b.progress||a.key-b.key||a.canonicalIndex-b.canonicalIndex);
  }

  function transitionPlanForEvents(fromIndex,toIndex) {
    const prof=model.movementProfile||buildMovementProfile();
    const nativeEvents=window.__FlightFlowFirBridge?.state?.parsed?.events||model.history?.events||[];
    if(!prof||!nativeEvents.length)return null;
    const n=nativeEvents.length;
    const from=clamp(Number(fromIndex)||0,0,n-1),to=clamp(Number(toIndex)||0,0,n-1);
    const fromProgress=progressForNativeEventIndex(from,n),toProgress=progressForNativeEventIndex(to,n);
    const fromKey=nativeEventTimeOrHistory(from,nativeEvents),toKey=nativeEventTimeOrHistory(to,nativeEvents);
    const forward=toProgress>=fromProgress;
    const keyForSnapshot=forward?toKey:fromKey;
    const snap=snapshotForMovementKey(keyForSnapshot,prof.departureKey,prof.departureSnapshot)||prof.snapshot;
    const canonical=prof.points||movementPoints(prof.snapshot||snap);
    const entries=shiftedEtimEntries(snap,canonical,prof.departureKey);
    const loKey=Number.isFinite(fromKey)&&Number.isFinite(toKey)?Math.min(fromKey,toKey):null;
    const hiKey=Number.isFinite(fromKey)&&Number.isFinite(toKey)?Math.max(fromKey,toKey):null;
    const eps=1e-7;
    let checkpoints=entries.filter(e=>{
      const inProgress=forward?(e.progress>fromProgress+eps&&e.progress<=toProgress+eps):(e.progress<fromProgress-eps&&e.progress>=toProgress-eps);
      const inTime=loKey==null||hiKey==null||(e.key>loKey&&e.key<=hiKey)||(e.key===loKey&&Math.abs(e.progress-toProgress)<eps);
      return inProgress&&inTime;
    });
    if(!forward)checkpoints=checkpoints.sort((a,b)=>b.progress-a.progress||b.key-a.key);
    else checkpoints=checkpoints.sort((a,b)=>a.progress-b.progress||a.key-b.key||a.canonicalIndex-b.canonicalIndex);
    // Garante que dois fixos com o mesmo ETIM (ex.: IBGAM/PMS 01:30) permaneçam como
    // etapas geográficas distintas, em vez de serem fundidos num único salto.
    const dedup=[];
    for(const cp of checkpoints){
      const prev=dedup.at(-1);
      if(prev&&Math.abs(prev.progress-cp.progress)<1e-8&&prev.ident===cp.ident)continue;
      dedup.push(cp);
    }
    checkpoints=dedup;
    const deltaMinutes=Number.isFinite(fromKey)&&Number.isFinite(toKey)?Math.abs(toKey-fromKey)/60000:null;
    return {fromIndex:from,toIndex:to,fromProgress,toProgress,fromKey,toKey,forward,checkpoints,deltaMinutes};
  }

  function transitionDurations(plan,speed=1,playing=false) {
    if(!plan)return [];
    const steps=[...(plan.checkpoints||[])];
    if(!steps.length||Math.abs((steps.at(-1)?.progress??NaN)-plan.toProgress)>1e-7){steps.push({ident:'EVENTO',progress:plan.toProgress,key:plan.toKey,eventEnd:true});}
    const speedScale=playing?Math.max(.75,Math.sqrt(Math.max(.25,Number(speed)||1))):1;
    const count=steps.length;
    let previous=plan.fromProgress;
    return steps.map((s,i)=>{
      const dp=Math.abs(s.progress-previous);previous=s.progress;
      // Cada fixo recebe tempo visual mínimo. Trechos longos ganham um pouco mais de tempo,
      // mas o total permanece prático para navegação manual.
      let ms=300+Math.min(420,dp*2800);
      if(count>=5)ms=Math.max(ms,340);
      if(s.eventEnd&&count>1)ms=Math.max(220,ms*.65);
      ms=Math.round(clamp(ms/speedScale,playing?120:240,playing?650:820));
      return {...s,duration:ms};
    });
  }

  function eventDateTimeKey(event) {

    const fromBlock=parseBlockDateTime(String(event?.rawBlock||event?.content||''));
    if(fromBlock?.key!=null)return fromBlock.key;
    const s=String(event?.timestamp||event?.receivedAt||'').trim();
    let m=s.match(/(\d{2})\/(\d{2})\/(\d{4})[^0-9]+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if(m)return Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0));
    m=s.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if(m)return Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0));
    return null;
  }

  function snapshotForFlightEvent(event,index,total) {
    const list=model.resolvedSnapshots;
    if(!list.length)return null;
    const key=eventDateTimeKey(event);
    if(key!=null){
      let chosen=list[0];
      for(const snap of list){
        if(snap.eventDt?.key!=null && snap.eventDt.key<=key)chosen=snap;
        else if(snap.eventDt?.key!=null && snap.eventDt.key>key)break;
      }
      return chosen;
    }
    const ratio=total>1?clamp(index/(total-1),0,1):0;
    const target=Math.round(ratio*Math.max(0,(model.history?.blocksCount||1)-1));
    let chosen=list[0];
    for(const snap of list){if(snap.blockIndex<=target)chosen=snap;else break;}
    return chosen;
  }

  function projectedPath(points) {
    if(!points?.length)return '';
    return points.map((p,i)=>`${i?'L':'M'}${Number(p.x).toFixed(2)} ${Number(p.y).toFixed(2)}`).join(' ');
  }

  function loadFixesVisiblePreference() {
    try {
      const raw=localStorage.getItem(FIXES_STORAGE_KEY);
      return raw==null ? true : raw!=='0';
    } catch (_) { return true; }
  }

  function saveFixesVisiblePreference(value) {
    model.fixesVisible=!!value;
    try { localStorage.setItem(FIXES_STORAGE_KEY,model.fixesVisible?'1':'0'); } catch (_) {}
  }


  function loadHandoffsVisiblePreference() {
    try { const raw=localStorage.getItem(HANDOFF_STORAGE_KEY); return raw==null ? true : raw!=='0'; } catch (_) { return true; }
  }

  function saveHandoffsVisiblePreference(value) {
    model.handoffsVisible=!!value;
    try { localStorage.setItem(HANDOFF_STORAGE_KEY,model.handoffsVisible?'1':'0'); } catch (_) {}
  }

  function shortEtim(point) {
    const raw=String(point?.etim||'').trim();
    const m=raw.match(/^\d{2}-(\d{2}:\d{2})(\*)?$/);
    return m ? `${m[1]}${point?.passed?'*':''}` : (raw?`${raw}${point?.passed&&!raw.includes('*')?'*':''}`:'');
  }

  function flightLevelLabel(point) {
    const v=String(point?.cfl||'').replace(/^F/i,'').trim();
    return v ? `FL${v}` : '';
  }

  function mainFixLabelHtml(point,sequence='') {
    const meta=[shortEtim(point),flightLevelLabel(point)].filter(Boolean).join(' · ');
    const prefix=sequence?`${sequence} · `:'';
    return `<b>${esc(prefix+(point?.ident||'—'))}</b>${meta?`<span>${esc(meta)}</span>`:''}`;
  }

  function ensureFixesToggle() {
    const host=qs('.real-map-layer-switches')||qs('#realMapControls');
    if(!host)return null;
    let input=qs('#ffrpFixesToggle',host);
    if(!input){
      const label=document.createElement('label');
      label.className='ffrp-fixes-label';
      label.title='Exibir ou ocultar fixos/coordenadas da rota processada com horário estimado e nível de voo';
      label.innerHTML='<input id="ffrpFixesToggle" type="checkbox"/> Fixos';
      const fir=qs('#realMapFirPicker',host);
      if(fir)host.insertBefore(label,fir);else host.appendChild(label);
      input=qs('#ffrpFixesToggle',label);
      input.addEventListener('change',()=>{
        saveFixesVisiblePreference(input.checked);
        applyProcessedRouteToFlightFlow();
      });
    }
    input.checked=!!model.fixesVisible;
    return input;
  }


  function ensureHandoffsToggle() {
    const host=qs('.real-map-layer-switches')||qs('#realMapControls');
    if(!host)return null;
    let input=qs('#ffrpHandoffsToggle',host);
    if(!input){
      const label=document.createElement('label');
      label.className='ffrp-handoffs-label';
      label.title='Destacar pontos de transferência entre setores, terminais, ACC/APP e órgãos adjacentes';
      label.innerHTML='<input id="ffrpHandoffsToggle" type="checkbox"/> Transferências';
      const fir=qs('#realMapFirPicker',host);
      if(fir)host.insertBefore(label,fir);else host.appendChild(label);
      input=qs('#ffrpHandoffsToggle',label);
      input.addEventListener('change',()=>{saveHandoffsVisiblePreference(input.checked);applyProcessedRouteToFlightFlow()});
    }
    input.checked=!!model.handoffsVisible;
    return input;
  }

  function ensureOpenButtonPlacement() {
    const b=qs('#ffrpOpen'); if(!b)return;
    const status=qs('.scene-status');
    const statusBadge=qs('#statusBadge');
    if(status){
      b.classList.remove('ffrp-floating-fallback');
      if(b.parentElement!==status){
        if(statusBadge && statusBadge.parentElement===status)statusBadge.insertAdjacentElement('afterend',b);
        else status.prepend(b);
      }
    }else{
      b.classList.add('ffrp-floating-fallback');
      if(b.parentElement!==document.body)document.body.appendChild(b);
    }
  }

  function ensureMainBadge() {
    const scene=qs('#dropZone')||qs('.scene-wrap');
    if(!scene)return null;
    let badge=qs('#ffrpMainBadge',scene);
    if(!badge){badge=document.createElement('div');badge.id='ffrpMainBadge';badge.className='ffrp-main-badge';badge.hidden=true;scene.appendChild(badge);}
    return badge;
  }

  function renderProcessedVectorFixes(snapshot) {
    const svg=qs('#sceneSvg');
    if(!svg)return false;
    let group=qs('#ffrpVectorFixLayer',svg);
    if(!group){group=document.createElementNS('http://www.w3.org/2000/svg','g');group.id='ffrpVectorFixLayer';svg.appendChild(group);}
    group.innerHTML='';
    group.style.display=model.fixesVisible?'':'none';
    if(!model.fixesVisible || !snapshotIsComplete(snapshot))return true;
    const bridge=window.__FlightFlowFirBridge;
    if(!bridge?.projectGeo)return false;
    let html='';
    snapshot.points.forEach((p,i)=>{
      if(!p.geo)return;
      const q=bridge.projectGeo(Number(p.geo.lon),Number(p.geo.lat));
      const airport=/^[A-Z]{4}$/.test(p.ident)&&(i===0||i===snapshot.points.length-1);
      const cls=airport?'airport':(p.geo.kind==='coordinate'?'coord':'');
      const meta=[shortEtim(p),flightLevelLabel(p)].filter(Boolean).join(' · ');
      html+=`<g class="ffrp-vfix ${cls}" transform="translate(${Number(q.x).toFixed(2)} ${Number(q.y).toFixed(2)})"><circle r="5"/><text x="8" y="-6">${esc(p.ident)}</text>${meta?`<text class="meta" x="8" y="8">${esc(meta)}</text>`:''}</g>`;
    });
    if(model.handoffsVisible){transferMarkersForSnapshot(snapshot).forEach(t=>{const q=bridge.projectGeo(Number(t.point.geo.lon),Number(t.point.geo.lat));html+=`<g class="ffrp-vfix transfer" transform="translate(${Number(q.x).toFixed(2)} ${Number(q.y).toFixed(2)})"><rect x="-7" y="-7" width="14" height="14" rx="2" transform="rotate(45)" fill="#8a48bd" stroke="#fff" stroke-width="2"/><text x="12" y="4">TRF ${esc(t.label)}</text></g>`;});}
    group.innerHTML=html;
    return true;
  }

  function historyFingerprint(text) {
    const s=String(text||'');
    return `${s.length}|${s.slice(0,120)}|${s.slice(-120)}`;
  }

  function renderIdPlanoMarkup(id) {
    const value=norm(id||'');
    if(!value)return '<span class="missing">—</span>';
    return [...value].map((ch,i)=>`<span class="${i===7?'eighth':''}">${esc(ch)}</span>`).join('');
  }

  function collectMapObstacles(map) {
    const out=[];
    try {
      const container=map?.getContainer?.() || qs('.leaflet-container');
      if(!container)return out;
      const base=container.getBoundingClientRect();
      const selectors='.leaflet-tooltip:not(.ffrp-native-fix-label), .ff-airport-marker, .ff-ats-chip, .leaflet-popup, .leaflet-control:not(.leaflet-control-zoom)';
      qsa(selectors,container).forEach(el=>{
        const r=el.getBoundingClientRect();
        if(!r.width||!r.height)return;
        const x1=r.left-base.left-5,y1=r.top-base.top-5,x2=r.right-base.left+5,y2=r.bottom-base.top+5;
        if(x2>=0&&y2>=0&&x1<=base.width&&y1<=base.height)out.push({x1,y1,x2,y2,external:true});
      });
    } catch(_) {}
    return out;
  }

  function labelPlacementFor(map, point, index, total, occupied) {
    let px=null;
    try{px=map?.latLngToContainerPoint?.([Number(point.geo.lat),Number(point.geo.lon)]);}catch(_){px=null}
    const baseOrder=index===0?['right','left','top','bottom']:index===total-1?['left','right','top','bottom']:(index%2?['right','left','bottom','top']:['left','right','top','bottom']);
    if(!px)return {direction:baseOrder[0],offset:[0,baseOrder[0]==='top'?-8:baseOrder[0]==='bottom'?8:0]};
    const width=Math.max(78,Math.min(138,52+String(point.ident||'').length*7.4));
    const height=34;
    const candidates=[];
    for(const dir of baseOrder){
      candidates.push({dir,far:false});
      candidates.push({dir,far:true});
    }
    const rectFor=({dir,far})=>{
      const gap=far?36:12;
      let x=px.x-width/2,y=px.y-height/2;
      if(dir==='top')y=px.y-height-gap;
      if(dir==='bottom')y=px.y+gap;
      if(dir==='left')x=px.x-width-gap;
      if(dir==='right')x=px.x+gap;
      return {x1:x-3,y1:y-3,x2:x+width+3,y2:y+height+3};
    };
    const overlapArea=(a,b)=>{
      const w=Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1));
      const h=Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
      return w*h;
    };
    let chosen=candidates[0],chosenRect=rectFor(chosen),best=Infinity;
    candidates.forEach((cand,rank)=>{
      const r=rectFor(cand);
      let area=0,hits=0;
      occupied.forEach(o=>{const a=overlapArea(r,o);if(a>0){area+=a;hits++}});
      const score=area*10+hits*1500+(cand.far?80:0)+rank;
      if(score<best){best=score;chosen=cand;chosenRect=r;}
    });
    occupied.push(chosenRect);
    const d=chosen.far?31:8;
    const offset=chosen.dir==='top'?[0,-d]:chosen.dir==='bottom'?[0,d]:chosen.dir==='left'?[-d,0]:[d,0];
    return {direction:chosen.dir,offset};
  }

  function restoreLegacyRouteVisuals() {
    const fp=qs('#flightPath');
    if(fp && fp.dataset.ffrpPrevOpacity!=null){fp.style.opacity=fp.dataset.ffrpPrevOpacity;delete fp.dataset.ffrpPrevOpacity}
    model.legacyRouteSuppressed=false;
  }

  function suppressLegacyRouteVisuals(snapshot) {
    if(!snapshotIsComplete(snapshot)){restoreLegacyRouteVisuals();return false}
    const bridge=window.__FlightFlowFirBridge,rms=bridge?.realMapState;
    try{
      if(rms?.engine==='leaflet'){
        const routeLayer=rms.layers?.route;
        if(routeLayer?.eachLayer){
          const remove=[];routeLayer.eachLayer(layer=>{const o=layer?.options||layer?.data?.opts||{};if(o.dashArray||String(o.color||'').toLowerCase()==='#7359dd')remove.push(layer)});remove.forEach(l=>routeLayer.removeLayer?.(l));
        }
        rms.layers?.routeHistory?.clearLayers?.();
      }else if(rms?.engine==='google'){
        if(rms.googleFutureRoute?.setMap)rms.googleFutureRoute.setMap(null);
      }else{
        const fp=qs('#flightPath');if(fp){if(fp.dataset.ffrpPrevOpacity==null)fp.dataset.ffrpPrevOpacity=fp.style.opacity||'';fp.style.opacity='0'}
      }
      model.legacyRouteSuppressed=true;return true;
    }catch(err){console.warn('[FlightFlow route] supressão rota legada:',err);return false}
  }

  function clearNativeLayers({clearNativeRoute=false}={}) {
    try{model.nativeMapLayer?.clearLayers?.();model.nativeFixLayer?.clearLayers?.();model.nativeTransferLayer?.clearLayers?.();}catch(_){}
    const vg=qs('#ffrpVectorFixLayer');if(vg)vg.innerHTML='';
    restoreLegacyRouteVisuals();
    if(clearNativeRoute){
      try{const rms=window.__FlightFlowFirBridge?.realMapState;rms?.layers?.route?.clearLayers?.();rms?.layers?.routeHistory?.clearLayers?.();if(rms){rms.routeLatLngs=[];rms.routeBounds=null}}catch(_){}
      const fp=qs('#flightPath');if(fp){fp.setAttribute('d','');fp.style.opacity='';delete fp.dataset.ffrpPrevOpacity;}
    }
    model.nativeFitDone=false;
  }

  function nativeEventCount(){return window.__FlightFlowFirBridge?.state?.parsed?.events?.length||0}
  function nativeEventIndex(){const st=window.__FlightFlowFirBridge?.state;return Number.isFinite(Number(st?.index))?Number(st.index):0}
  function nativeEventLabel(index){const e=window.__FlightFlowFirBridge?.state?.parsed?.events?.[index];if(!e)return `Evento ${index+1}`;return `${index+1} · ${e.time||String(e.timestamp||'').split(/\s+/).pop()||'--:--'} · ${e.operation||e.messageType||'Evento'}`}

  function jumpToFlightEvent(index,{snap=true,reveal=false}={}) {
    const st=window.__FlightFlowFirBridge?.state;const total=st?.parsed?.events?.length||0;if(!total)return false;
    const target=clamp(Number(index)||0,0,total-1);
    if(st.motion){st.motion.velocity=0;}
    const scrub=qs('#scrubber');
    if(scrub){scrub.value=String(target);scrub.dispatchEvent(new Event('input',{bubbles:true}));scrub.dispatchEvent(new Event('change',{bubbles:true}));}
    if(Number(st.index)!==target){st.index=target;const item=qs(`.timeline-item[data-event-index="${target}"]`);if(item)item.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
    const item=qs(`.timeline-item[data-event-index="${target}"]`);
    if(item){try{item.scrollIntoView({block:'center',behavior:'smooth'})}catch(_){};try{item.animate([{outline:'3px solid #ffb02e'},{outline:'0 solid transparent'}],{duration:1200})}catch(_){}}
    model.syncTimeline=true;model.useFinalSnapshot=false;model.lastNativeIndex=-1;
    setTimeout(()=>syncFromNativeTimeline({fit:false}),35);
    if(reveal){const m=modal();if(m)m.hidden=true;setTimeout(()=>{const title=qs('#operationTitle')||qs('.scene-caption');try{title?.animate?.([{filter:'brightness(1.25)'},{filter:'none'}],{duration:1100})}catch(_){ }},80);}
    return true;
  }

  function nativeEventIndexForSnapshot(snapshot) {
    const events=window.__FlightFlowFirBridge?.state?.parsed?.events||[];if(!events.length)return 0;
    const key=snapshot?.eventDt?.key;if(!Number.isFinite(key))return clamp(nativeEventIndex(),0,events.length-1);
    let best=0,delta=Infinity;events.forEach((e,i)=>{const k=eventDateTimeKey(e);if(!Number.isFinite(k))return;const d=Math.abs(k-key);if(d<delta){delta=d;best=i}});return best;
  }

  function syncFromNativeTimeline({fit=false}={}) {
    if(!model.history)return;
    model.currentSnapshotIndex=chooseSnapshotIndex();
    applyProcessedRouteToFlightFlow({fit});
    if(!modal()?.hidden)renderModal();else updateOpenBadge();
  }

  function renderProcessedRouteOnNativeMap(snapshot,{fit=false}={}) {
    const bridge=window.__FlightFlowFirBridge;
    const badge=ensureMainBadge();
    ensureFixesToggle();ensureHandoffsToggle();
    if(!snapshot){if(badge)badge.hidden=true;renderProcessedVectorFixes(null);return false;}
    const unresolved=snapshot.points.filter(p=>!p.geo).length,tail=pseudoDestinationTail(snapshot);
    if(badge){badge.hidden=false;badge.classList.toggle('warn',unresolved>0);badge.textContent=unresolved?`ROTA PROCESSADA · ${unresolved} SEM COORD.`:`ROTA PROCESSADA · ${snapshot.points.length}/${snapshot.points.length}${tail?' · + APROX.':''}`;}
    if(!snapshotIsComplete(snapshot))return false;
    const rms=bridge?.realMapState;
    try{
      if(!rms || rms.engine!=='leaflet' || !rms.map || !window.L){renderProcessedVectorFixes(snapshot);return false;}
      if(model.nativeMapRef!==rms.map){
        if(model.nativeMapLayer){try{model.nativeMapLayer.remove()}catch(_){}}
        if(model.nativeFixLayer){try{model.nativeFixLayer.remove()}catch(_){}}
        if(model.nativeTransferLayer){try{model.nativeTransferLayer.remove()}catch(_){}}
        model.nativeMapRef=rms.map;model.nativeMapLayer=L.layerGroup().addTo(rms.map);model.nativeFixLayer=L.layerGroup().addTo(rms.map);model.nativeTransferLayer=L.layerGroup().addTo(rms.map);model.nativeFitDone=false;
      }
      model.nativeMapLayer.clearLayers();model.nativeFixLayer?.clearLayers?.();model.nativeTransferLayer?.clearLayers?.();
      const actualLatLngs=snapshot.points.map(p=>[Number(p.geo.lat),Number(p.geo.lon)]);
      const red=L.polyline(actualLatLngs,{color:'#d23a2d',weight:4,opacity:.94,lineCap:'round',lineJoin:'round',interactive:true});red.bindTooltip('Rota processada do histórico SAGITARIO',{sticky:true});red.addTo(model.nativeMapLayer);
      let movementLatLngs=actualLatLngs.slice();
      if(tail){const tailLatLngs=[[Number(tail.from.geo.lat),Number(tail.from.geo.lon)],[Number(tail.to.geo.lat),Number(tail.to.geo.lon)]];movementLatLngs=actualLatLngs.concat([tailLatLngs[1]]);const dashed=L.polyline(tailLatLngs,{color:'#7359dd',weight:3,opacity:.88,dashArray:'9 8',lineCap:'round',interactive:true});dashed.bindTooltip('Aproximação gráfica estimada: último ponto publicado → ADES',{sticky:true});dashed.addTo(model.nativeMapLayer);}
      if(model.fixesVisible&&model.nativeFixLayer){
        const occupied=collectMapObstacles(rms.map);
        const plotPoints=tail?snapshot.points.concat([tail.to]):snapshot.points;
        plotPoints.forEach((p,i)=>{
          const pseudo=!!p.pseudo;
          const airport=/^[A-Z]{4}$/.test(p.ident)&&(i===0||i===plotPoints.length-1||pseudo);
          const mk=L.circleMarker([Number(p.geo.lat),Number(p.geo.lon)],{radius:airport?5.5:3.5,color:pseudo?'#7258ce':airport?'#a66b00':'#07576a',dashArray:pseudo?'4 3':null,weight:1.8,fillColor:airport?'#ffe59a':'#ffffff',fillOpacity:1,interactive:true});
          const place=labelPlacementFor(rms.map,p,i,plotPoints.length,occupied);
          const meta=[p.etim?`ETIM ${p.etim}${p.passed?'*':''}`:'',p.cfl?`FL ${flightLevelLabel(p).replace(/^FL/,'')}`:'',pseudo?'ADES estimado':''].filter(Boolean).join(' · ');
          mk.bindTooltip(mainFixLabelHtml(p,String(i+1).padStart(2,'0'))+(pseudo?'<br><small>ADES estimado</small>':''),{permanent:true,direction:place.direction,className:'ffrp-native-fix-label',offset:place.offset,opacity:.97,interactive:false});
          if(mk.bindPopup)mk.bindPopup(`<b>${esc(p.ident)}</b><br>${esc(meta||'Sem ETIM/CFL')}<br><small>${esc(p.geo.source||'')}</small>`);
          mk.addTo(model.nativeFixLayer);
        });
      }
      if(model.handoffsVisible&&model.nativeTransferLayer){transferMarkersForSnapshot(snapshot).forEach(t=>{const icon=L.divIcon?L.divIcon({className:'',html:'<div class="ffrp-transfer-marker"><span>⇄</span></div>',iconSize:[20,20],iconAnchor:[10,10]}):null;let mk;if(icon&&L.marker)mk=L.marker([Number(t.point.geo.lat),Number(t.point.geo.lon)],{icon,keyboard:false,zIndexOffset:800});else mk=L.circleMarker([Number(t.point.geo.lat),Number(t.point.geo.lon)],{radius:7,color:'#6e3498',fillColor:'#8a48bd',fillOpacity:1,weight:2});mk.bindTooltip(`<b>TRANSFERÊNCIA ${esc(t.label)}</b><br>${esc(t.detail)}<br>Ponto: ${esc(t.point.ident)}`,{sticky:true,className:'ffrp-transfer-tip'});mk.addTo(model.nativeTransferLayer);});}
      const bounds=L.latLngBounds(movementLatLngs);rms.routeLatLngs=movementLatLngs;rms.routeBounds=bounds;suppressLegacyRouteVisuals(snapshot);if(fit&&!model.nativeFitDone&&bounds.isValid()){rms.map.fitBounds(bounds,{padding:[55,55],maxZoom:8,animate:false});model.nativeFitDone=true;}return true;
    }catch(err){console.warn('[FlightFlow route] camada nativa:',err);renderProcessedVectorFixes(snapshot);return false;}
  }

  function applyProcessedRouteToFlightFlow(options={}) {
    if(!model.history||!model.resolvedSnapshots.length)return false;
    const bridge=window.__FlightFlowFirBridge,state=bridge?.state,events=state?.parsed?.events,routes=state?.geo?.eventRoutes;
    if(!bridge?.projectGeo||!Array.isArray(events)||!Array.isArray(routes)||!events.length)return false;
    const profile=model.movementProfile||buildMovementProfile();
    const routeSnapshot=(profile?.snapshot&&snapshotIsComplete(profile.snapshot))?profile.snapshot:(bestSnapshotForMovement()||model.resolvedSnapshots.at(-1)||model.resolvedSnapshots[0]);
    if(!snapshotIsComplete(routeSnapshot))return false;
    const move=movementPoints(routeSnapshot);
    const points=move.map(p=>bridge.projectGeo(Number(p.geo.lon),Number(p.geo.lat)));
    if(points.length<2)return false;
    let applied=0;
    for(let i=0;i<events.length;i++){
      const existing=routes[i]||{};
      const target=progressForNativeEventIndex(i,events.length);
      routes[i]={...existing,points,path:projectedPath(points),target,ffrpProcessed:true,ffrpVersion:VERSION,ffrpSnapshotBlock:routeSnapshot.blockIndex,ffrpPseudoTail:!!pseudoDestinationTail(routeSnapshot)};
      events[i].syntheticProgress=target;applied++;
    }
    const currentIndex=Number.isFinite(Number(state?.index))?clamp(Number(state.index),0,Math.max(0,events.length-1)):0;
    const currentSnap=snapshotForFlightEvent(events[currentIndex],currentIndex,events.length)||model.resolvedSnapshots[chooseSnapshotIndex()]||routeSnapshot;
    const fp=qs('#flightPath');if(fp&&points.length>1)fp.setAttribute('d',projectedPath(points));
    if(currentSnap){suppressLegacyRouteVisuals(routeSnapshot);renderProcessedRouteOnNativeMap(routeSnapshot,{fit:!!options.fit});}
    if(applied){state.geo.ffrpProcessedRoute={version:VERSION,callsign:model.history.callsign,appliedEvents:applied,updatedAt:new Date().toISOString()};model.nativeAppliedSignature=`${model.history.callsign}|${model.resolvedSnapshots.map(s=>s.signature).join('|')}|${applied}`;}
    return applied>0;
  }

  function activeTimelineRatio() {
    if(model.syncTimeline){
      const count=nativeEventCount(),idx=nativeEventIndex();
      if(count>1)return clamp(idx/(count-1),0,1);
    }
    const items=qsa('.timeline-item');
    if (!items.length) {
      const scrub=qs('#scrubber');
      if (scrub && Number(scrub.max)>0) return clamp(Number(scrub.value)/Number(scrub.max),0,1);
      return model.routeProgress;
    }
    const idx=items.findIndex(x=>x.classList.contains('active'));
    return idx<0?model.routeProgress:clamp(idx/Math.max(1,items.length-1),0,1);
  }

  function targetBlockIndex() {
    if (!model.history) return 0;
    return Math.round(activeTimelineRatio()*Math.max(0,model.history.blocksCount-1));
  }

  function chooseSnapshotIndex() {
    const list=model.resolvedSnapshots;
    if (!list.length) return 0;
    if (model.useFinalSnapshot) return list.length-1;
    if(model.syncTimeline){
      const st=window.__FlightFlowFirBridge?.state,events=st?.parsed?.events;
      if(Array.isArray(events)&&events.length){
        const idx=clamp(nativeEventIndex(),0,events.length-1),snap=snapshotForFlightEvent(events[idx],idx,events.length),found=list.indexOf(snap);
        if(found>=0)return found;
      }
    }
    const target=targetBlockIndex();
    let idx=0;
    for (let i=0;i<list.length;i++) { if (list[i].blockIndex<=target) idx=i; else break; }
    return idx;
  }

  function currentEventTimeKey() {
    if (!model.history) return null;
    if(model.syncTimeline){
      const st=window.__FlightFlowFirBridge?.state,events=st?.parsed?.events;
      if(Array.isArray(events)&&events.length){
        const idx=clamp(nativeEventIndex(),0,events.length-1),key=eventDateTimeKey(events[idx]);
        if(key!=null)return key;
      }
    }
    const target=targetBlockIndex();
    let best=null;
    for (const e of model.history.events) {
      if (e.blockIndex<=target && e.eventDt?.key!=null) best=e.eventDt.key;
      if (e.blockIndex>target) break;
    }
    return best;
  }

  function routePositionProgress(snapshot) {
    const total=nativeEventCount()||model.history?.events?.length||1;
    return progressForNativeEventIndex(nativeEventIndex(),total);
  }

  function interpolateResolvedPoint(points, progress) {
    const usable=points.map((p,i)=>p.geo?{...p,index:i}:null).filter(Boolean);
    if (!usable.length) return null;
    if (usable.length===1) return {lat:usable[0].geo.lat,lon:usable[0].geo.lon,bearing:0};
    const segments=[]; let total=0;
    for (let i=0;i<usable.length-1;i++) {
      const a=usable[i].geo,b=usable[i+1].geo;
      const dx=(b.lon-a.lon)*Math.cos(((a.lat+b.lat)/2)*Math.PI/180),dy=b.lat-a.lat;
      const len=Math.hypot(dx,dy)||1e-9; segments.push({a,b,len}); total+=len;
    }
    let d=clamp(progress,0,1)*total;
    for (const s of segments) {
      if (d<=s.len) {
        const f=d/s.len;
        const lat=s.a.lat+(s.b.lat-s.a.lat)*f, lon=s.a.lon+(s.b.lon-s.a.lon)*f;
        const bearing=Math.atan2((s.b.lon-s.a.lon)*Math.cos(lat*Math.PI/180),(s.b.lat-s.a.lat))*180/Math.PI;
        return {lat,lon,bearing};
      }
      d-=s.len;
    }
    const z=usable.at(-1).geo; return {lat:z.lat,lon:z.lon,bearing:0};
  }

  function modal() { return qs('#ffrpModal'); }

  function ensureUi() {
    installStyle();
    if (!qs('#ffrpOpen')) {
      const b=document.createElement('button');
      b.id='ffrpOpen'; b.type='button'; b.className='ffrp-open-btn warn'; b.hidden=true;
      b.innerHTML='<span>ROTA PROCESSADA</span><span class="ffrp-count">—</span>';
      b.title='Abrir reconstrução geográfica PONTOS / ETIM / CFL';
      b.addEventListener('click',async()=>{
        try {
          if (!model.history) {
            const text=rawHistoryFromApp();
            if (text) await analyzeText(text,sourceNameFromApp());
          }
          if (!model.history) {
            toast('Selecione o histórico TXT para montar a Rota Processada. Esta leitura é isolada e não interfere no FlightFlow.', 'warn');
            qs('#ffrpHistoryInput')?.click();
            return;
          }
          model.syncTimeline=true;model.useFinalSnapshot=false;model.routeProgress=routePositionProgress(model.resolvedSnapshots[chooseSnapshotIndex()]||model.resolvedSnapshots[0]);modal().hidden=false; renderModal();
        } catch (err) { console.warn('[FlightFlow route open]',err); toast('Falha ao abrir Rota Processada: '+(err.message||err),'error'); }
      });
      document.body.appendChild(b);
    }
    ensureOpenButtonPlacement();
    ensureFixesToggle();
    ensureHandoffsToggle();
    if (!modal()) {
      const wrap=document.createElement('div'); wrap.id='ffrpModal'; wrap.className='ffrp-modal'; wrap.hidden=true;
      wrap.innerHTML=`<div class="ffrp-window" role="dialog" aria-modal="true" aria-label="Rota processada">
        <div class="ffrp-head">
          <div class="ffrp-head-title">
            <span class="ffrp-eyebrow">FLIGHTFLOW ATS · ROTA OPERACIONAL</span>
            <strong id="ffrpTitle">Rota processada</strong>
            <span id="ffrpSubtitle" class="ffrp-head-subtitle">PONTOS / ETIM / CFL</span>
          </div>
          <button id="ffrpClose" class="ffrp-close-btn">Fechar ✕</button>
        </div>
        <div class="ffrp-toolbar">
          <section class="ffrp-tool-group ffrp-tool-group-views" aria-label="Visualização da rota">
            <span class="ffrp-tool-label">Visualização</span>
            <div class="ffrp-tool-buttons">
              <button id="ffrpTimelineBtn" class="active">Acompanhar timeline</button>
              <button id="ffrpFinalBtn">Usar quadro final</button>
            </div>
          </section>
          <section class="ffrp-tool-group ffrp-tool-group-data" aria-label="Dados e base geográfica">
            <span class="ffrp-tool-label">Dados da rota</span>
            <div class="ffrp-tool-buttons">
              <button id="ffrpSyncBtn">Atualizar NAVDB AISWEB</button>
              <button id="ffrpHistoryBtn">Carregar histórico</button>
              <button id="ffrpImportBtn">Importar NAVDB</button>
              <button id="ffrpNationalBtn">Base Nacional AISWEB</button>
              <button id="ffrpOfficialBtn">Página Fixos</button>
            </div>
          </section>
          <section class="ffrp-tool-group ffrp-tool-group-actions" aria-label="Ações da rota">
            <span class="ffrp-tool-label">Ações</span>
            <div class="ffrp-tool-buttons"><button id="ffrpExportBtn">Exportar rota</button></div>
          </section>
          <div class="ffrp-tool-status" aria-label="Status da rota">
            <span class="ffrp-id-card">IDPLANO <b id="ffrpIdPlano" class="ffrp-id-value"><span class="missing">—</span></b></span>
            <span class="ffrp-stat">NAVDB <b id="ffrpDbCount">0</b></span>
          </div>
          <input id="ffrpHistoryInput" class="ffrp-file-input" type="file" accept=".txt,.log" />
          <input id="ffrpFileInput" class="ffrp-file-input" type="file" accept=".json,.geojson,.csv,.txt,.xlsx,.xls" />
        </div>
        <div class="ffrp-eventbar"><button id="ffrpPrevEvent" title="Evento anterior">◀</button><label>Evento FlightFlow <select id="ffrpEventSelect"></select></label><button id="ffrpGoEvent" title="Mostrar diretamente o evento selecionado no FlightFlow">Mostrar no FlightFlow</button><button id="ffrpNextEvent" title="Próximo evento">▶</button><span id="ffrpEventInfo" class="ffrp-event-info">Aguardando timeline</span></div>
        <div class="ffrp-body"><div class="ffrp-map-wrap"><svg id="ffrpMap" class="ffrp-map" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet"></svg><div id="ffrpMapHud" class="ffrp-map-hud"></div><div id="ffrpLegend" class="ffrp-legend"><span><i class="ffrp-lg-dot ffrp-lg-airport"></i>Aeródromo</span><span><i class="ffrp-lg-dot"></i>Fixo/Waypoint</span><span><i class="ffrp-lg-dot ffrp-lg-coord"></i>Coordenada</span><span><i class="ffrp-lg-transfer"></i>Transferência</span><span><i class="ffrp-lg-line"></i>Rota processada</span><span><i class="ffrp-lg-tail"></i>Aproximação estimada</span></div><div id="ffrpMapNote" class="ffrp-map-note"></div></div><aside class="ffrp-side"><div class="ffrp-snap-head"><h3 id="ffrpSnapTitle">Quadro da rota</h3><button id="ffrpShowSnapEvent">Mostrar quadro no FlightFlow</button></div><div id="ffrpRouteList" class="ffrp-route-list"></div><div id="ffrpTailNote"></div><div id="ffrpUnresolved"></div></aside></div>
        <div class="ffrp-footer"><button id="ffrpPlay" class="ffrp-play">▶</button><input id="ffrpRange" class="ffrp-range" type="range" min="0" max="1000" value="0"/><span id="ffrpTime" class="ffrp-time">0%</span></div>
      </div>`;
      document.body.appendChild(wrap);
      qs('#ffrpClose').addEventListener('click',()=>wrap.hidden=true);
      wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.hidden=true});
      qs('#ffrpTimelineBtn').addEventListener('click',()=>{model.syncTimeline=true;model.useFinalSnapshot=false;qs('#ffrpTimelineBtn').classList.add('active');qs('#ffrpFinalBtn').classList.remove('active');syncFromNativeTimeline({fit:false});toast(`Rota sincronizada com o evento ${nativeEventIndex()+1} do FlightFlow.`,'ok');});
      qs('#ffrpFinalBtn').addEventListener('click',()=>{model.useFinalSnapshot=!model.useFinalSnapshot;if(model.useFinalSnapshot)model.syncTimeline=false;qs('#ffrpFinalBtn').classList.toggle('active',model.useFinalSnapshot);qs('#ffrpTimelineBtn').classList.toggle('active',model.syncTimeline);renderModal();});
      qs('#ffrpSyncBtn').addEventListener('click',syncAISWEB);
      qs('#ffrpHistoryBtn').addEventListener('click',()=>qs('#ffrpHistoryInput').click());
      qs('#ffrpHistoryInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(f){try{await analyzeText(await readHistoryFile(f),f.name)}catch(err){toast(`Falha ao ler histórico: ${err.message||err}`,'error')}}e.target.value=''});
      qs('#ffrpImportBtn').addEventListener('click',()=>qs('#ffrpFileInput').click());
      qs('#ffrpFileInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await importNavFile(f);e.target.value=''});
      qs('#ffrpNationalBtn').addEventListener('click',()=>{window.open(OFFICIAL_WFS_XLS,'_blank','noopener');toast('A base nacional oficial de Fixos será baixada pelo GeoAISWEB. Depois, use Importar NAVDB e selecione o arquivo XLSX uma única vez por atualização AIRAC.','ok');});
      qs('#ffrpOfficialBtn').addEventListener('click',()=>window.open(OFFICIAL_FIXES_PAGE,'_blank','noopener'));
      qs('#ffrpExportBtn').addEventListener('click',exportCurrentRoute);
      qs('#ffrpPrevEvent').addEventListener('click',()=>jumpToFlightEvent(nativeEventIndex()-1));
      qs('#ffrpNextEvent').addEventListener('click',()=>jumpToFlightEvent(nativeEventIndex()+1));
      qs('#ffrpEventSelect').addEventListener('change',e=>jumpToFlightEvent(Number(e.target.value)));
      qs('#ffrpGoEvent').addEventListener('click',()=>jumpToFlightEvent(Number(qs('#ffrpEventSelect')?.value||0),{reveal:true}));
      qs('#ffrpShowSnapEvent').addEventListener('click',()=>{const snap=model.resolvedSnapshots[chooseSnapshotIndex()];jumpToFlightEvent(nativeEventIndexForSnapshot(snap),{reveal:true});});
      qs('#ffrpRange').addEventListener('input',e=>{model.syncTimeline=false;qs('#ffrpTimelineBtn').classList.remove('active');model.routeProgress=Number(e.target.value)/1000;renderModal(false)});
      let playTimer=0;
      qs('#ffrpPlay').addEventListener('click',()=>{
        if(playTimer){clearInterval(playTimer);playTimer=0;qs('#ffrpPlay').textContent='▶';return;}
        model.syncTimeline=false;qs('#ffrpTimelineBtn').classList.remove('active');qs('#ffrpPlay').textContent='❚❚';
        playTimer=setInterval(()=>{model.routeProgress+=.0025;if(model.routeProgress>=1){model.routeProgress=1;clearInterval(playTimer);playTimer=0;qs('#ffrpPlay').textContent='▶';}renderModal(false)},45);
      });
    }
  }

  function routeBounds(points) {
    const geos=points.map(p=>p.geo).filter(Boolean);
    if (!geos.length) return {minLat:-35,maxLat:6,minLon:-75,maxLon:-33};
    let minLat=Math.min(...geos.map(g=>g.lat)),maxLat=Math.max(...geos.map(g=>g.lat)),minLon=Math.min(...geos.map(g=>g.lon)),maxLon=Math.max(...geos.map(g=>g.lon));
    let dlat=Math.max(.8,maxLat-minLat), dlon=Math.max(.8,maxLon-minLon);
    minLat-=dlat*.18; maxLat+=dlat*.18; minLon-=dlon*.18; maxLon+=dlon*.18;
    return {minLat,maxLat,minLon,maxLon};
  }

  function projector(bounds) {
    const W=1200,H=700,m=62;
    return (lat,lon)=>({x:m+(lon-bounds.minLon)/(bounds.maxLon-bounds.minLon)*(W-2*m),y:m+(bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat)*(H-2*m)});
  }

  function renderMap(snapshot, progress) {
    const svg=qs('#ffrpMap');if(!svg)return;
    const pts=snapshot?.points||[],tail=pseudoDestinationTail(snapshot),move=movementPoints(snapshot),plotPoints=tail?pts.concat([tail.to]):pts,b=routeBounds(move),pxy=projector(b);let html='';
    for(let i=0;i<=5;i++){const x=62+i*(1076/5),y=62+i*(576/5),lon=b.minLon+i*(b.maxLon-b.minLon)/5,lat=b.maxLat-i*(b.maxLat-b.minLat)/5;html+=`<line class="grid" x1="${x}" y1="62" x2="${x}" y2="638"/><text class="grid-label" x="${x+4}" y="655">${Math.abs(lon).toFixed(1)}°${lon<0?'W':'E'}</text>`;html+=`<line class="grid" x1="62" y1="${y}" x2="1138" y2="${y}"/><text class="grid-label" x="67" y="${y-5}">${Math.abs(lat).toFixed(1)}°${lat<0?'S':'N'}</text>`;}
    let current=[];const flush=()=>{if(current.length>=2){const str=current.map(q=>`${q.x},${q.y}`).join(' ');html+=`<polyline class="route-underlay" points="${str}"/><polyline class="route-line" points="${str}"/>`;}current=[]};pts.forEach(pt=>{if(pt.geo)current.push(pxy(pt.geo.lat,pt.geo.lon));else flush()});flush();
    for(let i=0;i<pts.length;i++)if(!pts[i].geo){let l=i-1;while(l>=0&&!pts[l].geo)l--;let r=i+1;while(r<pts.length&&!pts[r].geo)r++;if(l>=0&&r<pts.length){const a=pxy(pts[l].geo.lat,pts[l].geo.lon),c=pxy(pts[r].geo.lat,pts[r].geo.lon);html+=`<line class="route-gap" x1="${a.x}" y1="${a.y}" x2="${c.x}" y2="${c.y}"/>`;i=r-1;}}
    if(tail){const a=pxy(tail.from.geo.lat,tail.from.geo.lon),z=pxy(tail.to.geo.lat,tail.to.geo.lon),mx=(a.x+z.x)/2,my=(a.y+z.y)/2;html+=`<line class="route-tail" x1="${a.x}" y1="${a.y}" x2="${z.x}" y2="${z.y}"/><text class="tail-label" x="${mx+8}" y="${my-7}">APROXIMAÇÃO ESTIMADA → ${esc(tail.to.ident)}</text>`;}
    const occupied=[];
    const overlap=(a,c)=>Math.max(0,Math.min(a.x2,c.x2)-Math.max(a.x1,c.x1))*Math.max(0,Math.min(a.y2,c.y2)-Math.max(a.y1,c.y1));
    const placeLabel=(q,ident,index)=>{const w=Math.max(72,Math.min(150,56+String(ident||'').length*7.4)),h=28;const prefs=index%2?[[12,-13,'start'],[12,23,'start'],[-12,-13,'end'],[-12,23,'end'],[0,-30,'middle'],[0,35,'middle']]:[[12,23,'start'],[12,-13,'start'],[-12,23,'end'],[-12,-13,'end'],[0,35,'middle'],[0,-30,'middle']];let best=null,bestScore=Infinity;for(let rank=0;rank<prefs.length;rank++){const [dx,dy,anchor]=prefs[rank];let x=q.x+dx,y=q.y+dy;let x1=anchor==='start'?x:anchor==='end'?x-w:x-w/2;let y1=y-13;const r={x1,y1,x2:x1+w,y2:y1+h};let score=rank;for(const o of occupied)score+=overlap(r,o)*25;score+=(r.x1<70||r.x2>1130||r.y1<72||r.y2>625)?50000:0;if(score<bestScore){bestScore=score;best={x,y,anchor,rect:r}}}occupied.push(best.rect);return best;};
    plotPoints.forEach((pt,i)=>{if(!pt.geo)return;const q=pxy(pt.geo.lat,pt.geo.lon),cls=[pt.geo.kind==='coordinate'?'coord':'',pt.geo.kind==='airport'?'airport':'',pt.pseudo?'pseudo':''].filter(Boolean).join(' '),meta=[pt.etim?pt.etim+(pt.passed?'*':''):'',pt.cfl?`FL${String(pt.cfl).replace(/^F/i,'')}`:'',pt.pseudo?'ADES estimado':''].filter(Boolean).join(' · '),lp=placeLabel(q,pt.ident,i);const lead=Math.hypot(lp.x-q.x,lp.y-q.y)>15?`<line class="label-leader" x1="${q.x}" y1="${q.y}" x2="${lp.x}" y2="${lp.y-3}"/>`:'';html+=`<g class="wp ${cls}"><title>${esc(pt.ident)} · ${esc(meta||'sem ETIM/FL')} · ${esc(pt.geo.source||'')}</title>${lead}<circle cx="${q.x}" cy="${q.y}" r="${pt.pseudo?7:(pt.geo.kind==='airport'?6.5:6)}"/> <text text-anchor="${lp.anchor}" x="${lp.x}" y="${lp.y-4}">${esc(pt.ident)}</text>${meta?`<text class="meta" text-anchor="${lp.anchor}" x="${lp.x}" y="${lp.y+9}">${esc(meta)}</text>`:''}</g>`;});
    if(model.handoffsVisible)transferMarkersForSnapshot(snapshot).forEach(t=>{const q=pxy(t.point.geo.lat,t.point.geo.lon);html+=`<g class="handoff-marker" transform="translate(${q.x} ${q.y})"><title>Transferência ${esc(t.label)} · ${esc(t.detail)} · ${esc(t.point.ident)}</title><polygon points="0,-10 10,0 0,10 -10,0"/><text x="14" y="4">TRF ${esc(t.label)}</text></g>`;});
    const plane=interpolateResolvedPoint(move,progress);if(plane){const q=pxy(plane.lat,plane.lon),bx=q.x+15,by=q.y-18;html+=`<g class="ffrp-plane"><line class="stem" x1="${q.x}" y1="${q.y}" x2="${bx}" y2="${by+4}"/><g transform="translate(${q.x} ${q.y}) rotate(${plane.bearing})"><path class="body" d="M0,-13 L4,-2 L14,2 L14,5 L4,3 L3,13 L0,15 L-3,13 L-4,3 L-14,5 L-14,2 L-4,-2 Z"/></g><g transform="translate(${bx} ${by})"><rect class="tag" x="0" y="-12" rx="8" ry="8" width="${Math.max(74, String(model.history?.callsign||'AERONAVE').length*8+24)}" height="22"/><text class="mini" x="10" y="3">${esc(model.history?.callsign||'AERONAVE')}</text></g></g>`;}
    svg.innerHTML=html;
  }

  function renderModal(refreshRange=true) {
    ensureUi();if(!model.history||!model.resolvedSnapshots.length)return;
    const idx=chooseSnapshotIndex();model.currentSnapshotIndex=idx;const snap=model.resolvedSnapshots[idx],move=movementPoints(snap),tail=pseudoDestinationTail(snap),timelineProgress=routePositionProgress(snap),progress=model.syncTimeline?timelineProgress:model.routeProgress;if(model.syncTimeline)model.routeProgress=progress;
    qs('#ffrpTitle').textContent=`${model.history.callsign||'Plano'} · ${model.history.adep||'????'} → ${model.history.ades||'????'}`;qs('#ffrpSubtitle').textContent=`${model.sourceFile||'Histórico'} · ${model.history.snapshots.length} quadro(s) de PONTOS · rota declarada: ${model.history.route||'—'}`;qs('#ffrpIdPlano').innerHTML=renderIdPlanoMarkup(model.history.idPlano);qs('#ffrpSnapTitle').textContent=`Quadro ${idx+1}/${model.resolvedSnapshots.length} · ${snap.operation||'rota processada'}`;
    const nev=nativeEventCount(),nei=clamp(nativeEventIndex(),0,Math.max(0,nev-1)),sel=qs('#ffrpEventSelect');if(sel){const sig=`${nev}|${model.history.callsign}`;if(sel.dataset.sig!==sig){sel.innerHTML=Array.from({length:nev},(_,i)=>`<option value="${i}">${esc(nativeEventLabel(i))}</option>`).join('');sel.dataset.sig=sig;}if(nev)sel.value=String(nei)}const evInfo=qs('#ffrpEventInfo');if(evInfo)evInfo.textContent=nev?`Evento ${nei+1}/${nev} · ${model.syncTimeline?'seguindo timeline':'controle manual'}`:'Timeline não disponível';
    const transfers=transferMarkersForSnapshot(snap),transferByPoint=new Map(transfers.map(t=>[t.pointIndex,t]));
    const plotPoints=tail?snap.points.concat([tail.to]):snap.points;
    const list=qs('#ffrpRouteList');list.innerHTML=plotPoints.map((p,i)=>{const actualIndex=i<snap.points.length?i:-1,tr=actualIndex>=0?transferByPoint.get(actualIndex):null,kind=p.pseudo?'<em class="ffrp-route-kind pseudo">APROX.</em>':/^[A-Z]{4}$/.test(p.ident)&&(i===0||i===plotPoints.length-1)?'<em class="ffrp-route-kind airport">AERÓDROMO</em>':p.geo?.kind==='coordinate'?'<em class="ffrp-route-kind coord">COORD.</em>':'<em class="ffrp-route-kind">FIXO</em>';return `<div class="ffrp-point ${p.geo?'':'unresolved'} ${tr?'transfer-point':''}" data-point-index="${actualIndex}" title="Posicionar a aeronave neste ponto"><span class="ffrp-point-index">${i+1}</span><div class="ffrp-point-main"><strong>${esc(p.ident)} ${kind}${tr?'<em class="ffrp-route-kind transfer">TRANSFERÊNCIA</em>':''}</strong><span>${esc([p.etim?`ETIM ${p.etim}${p.passed?'*':''}`:'',p.cfl?`CFL ${p.cfl}`:'',p.pseudo?'ADES estimado':'' ].filter(Boolean).join(' · ')||'Sem ETIM/CFL')}${tr?` · ${esc(tr.type)}`:''}</span></div><span class="ffrp-point-source">${esc(p.geo?.source||'sem coordenada')}${tr?` · limite ${esc(tr.label)}`:''}</span></div>`}).join('');
    qsa('.ffrp-point',list).forEach((card,visualIndex)=>card.addEventListener('click',()=>{const raw=Number(card.dataset.pointIndex),i=Number.isFinite(raw)&&raw>=0?raw:move.length-1;const fractions=routeDistanceFractions(move);model.syncTimeline=false;model.routeProgress=Number.isFinite(fractions[i])?fractions[i]:(i/Math.max(1,move.length-1));qs('#ffrpTimelineBtn')?.classList.remove('active');renderModal(false)}));
    const unresolved=snap.points.filter(p=>!p.geo).map(p=>p.ident);qs('#ffrpUnresolved').innerHTML=unresolved.length?`<div class="ffrp-unresolved"><b>${unresolved.length} ponto(s) ainda sem coordenada</b>${unresolved.map(x=>`<code>${esc(x)}</code>`).join('')}<div style="margin-top:5px">Use <b>Atualizar NAVDB AISWEB</b> ou instale a <b>Base Nacional AISWEB</b> (XLSX/CSV) uma única vez.</div></div>`:'';
    const tailEl=qs('#ffrpTailNote');if(tailEl)tailEl.innerHTML=tail?`<div class="ffrp-tail-note"><b>Aproximação gráfica complementar</b><br>O histórico termina em <b>${esc(tail.from.ident)}</b>. Após esse ponto, a aeronave segue uma linha tracejada aproximada até <b>${esc(tail.to.ident)}</b> apenas para completar a visualização até o ADES. Esse trecho não é apresentado como fixo publicado.</div>`:'';
    qs('#ffrpMapNote').textContent=unresolved.length?`Rota processada do histórico. ${unresolved.length} ponto(s) não foram resolvidos; os trechos correspondentes são mostrados como lacuna tracejada.`:tail?'Rota processada em vermelho. O trecho roxo tracejado do último ponto até o ADES é uma aproximação gráfica complementar, não uma trajetória radar.':'Rota processada do histórico, com coordenadas resolvidas localmente. Esta visualização representa o plano processado/estimado, não uma trajetória radar.';
    const fractions=routeDistanceFractions(move);let seg=0;for(let i=0;i<fractions.length-1;i++){if(progress+1e-9>=fractions[i]&&progress<=fractions[i+1]+1e-9){seg=i;break;}if(progress>fractions[i+1])seg=i+1;}seg=Math.min(seg,Math.max(0,move.length-2));const a=move[seg],z=move[Math.min(move.length-1,seg+1)],fa=Number(fractions[seg]||0),fb=Number(fractions[Math.min(move.length-1,seg+1)]||1),fixProgress=Math.round(fb>fa?clamp((progress-fa)/(fb-fa),0,1)*100:100);const hud=qs('#ffrpMapHud');if(hud){const dep=model.movementProfile?.departureKey,dd=Number.isFinite(dep)?new Date(dep):null,depTxt=dd?`${String(dd.getUTCHours()).padStart(2,'0')}:${String(dd.getUTCMinutes()).padStart(2,'0')}:${String(dd.getUTCSeconds()).padStart(2,'0')}`:'—';hud.innerHTML=`<div class="ffrp-map-hud-card"><strong>${esc(model.history.callsign||'AERONAVE')} · ${Math.round(progress*100)}%</strong><span>${esc(a?.ident||'—')} → ${esc(z?.ident||'—')} · ${esc(flightLevelLabel(a)||'FL —')} · ${fixProgress}% do trecho</span></div><div class="ffrp-map-hud-card"><strong>DEP ${esc(depTxt)} · decolagem confirmada</strong><span>posição interpolada pelos ETIM entre fixos · ${tail?`rota publicada até ${esc(tail.from.ident)} + aproximação estimada até ${esc(tail.to.ident)}`:'rota processada alcança o ADES'} · ${snap.points.length} pontos</span></div>`;}
    renderMap(snap,progress);const range=qs('#ffrpRange');if(range)range.value=Math.round(progress*1000);qs('#ffrpTime').textContent=`${Math.round(progress*100)}% · quadro ${idx+1}/${model.resolvedSnapshots.length}`;updateOpenBadge();
  }

  function updateOpenBadge() {
    const b=qs('#ffrpOpen');if(!b)return;
    ensureOpenButtonPlacement();
    if(!model.history){b.hidden=true;b.classList.add('warn');b.querySelector('.ffrp-count').textContent='—';return;}
    b.hidden=false;
    const snap=model.resolvedSnapshots[chooseSnapshotIndex()]||model.resolvedSnapshots[0];
    const miss=snap?snap.points.filter(p=>!p.geo).length:0;
    b.classList.toggle('warn',miss>0);
    b.querySelector('.ffrp-count').textContent=miss?`${miss}!`:`${snap?.points.length||0}`;
    b.title=miss?`${miss} ponto(s) sem coordenada. Clique para completar a NAVDB.`:`${snap?.points.length||0} ponto(s) da rota processada resolvidos.`;
  }

  async function analyzeText(text, sourceFile='histórico.txt') {
    ensureUi(); seedEmbeddedBase();
    const history=parseHistory(text,sourceFile);
    if(!history.snapshots.length){toast('Não encontrei blocos PONTOS / ETIM no arquivo carregado.', 'warn');return null;}
    clearNativeLayers();model.lastNativeIndex=-1;
    model.history=history;model.sourceFile=sourceFile;model.lastSourceLabel=sourceFile;model.routeProgress=0;model.useFinalSnapshot=false;model.syncTimeline=true;
    model.resolvedSnapshots=await resolveAllSnapshots(history);
    rebuildMovementProfile();
    updateOpenBadge();
    const total=model.resolvedSnapshots[0]?.points.length||0;
    const miss=model.resolvedSnapshots[0]?.points.filter(p=>!p.geo).length||0;
    toast(`Rota processada detectada: ${total} ponto(s)${miss?`, ${miss} sem coordenada`:''}.`, miss?'warn':'ok');
    applyProcessedRouteToFlightFlow({fit:true});
    setTimeout(()=>applyProcessedRouteToFlightFlow({fit:true}),450);
    setTimeout(()=>applyProcessedRouteToFlightFlow(),1300);
    refreshDbCount();
    return history;
  }

  async function refreshDbCount(){const el=qs('#ffrpDbCount');if(el){const persisted=await dbCount();const ids=new Set(OFFICIAL_SEED.map(x=>x.ident));for(const k of model.imported.keys())ids.add(k);el.textContent=String(Math.max(persisted,ids.size))}}

  function featureIdent(props) {
    const p=props||{};
    const names=['ident','IDENT','designator','DESIGNATOR','waypoint','WAYPOINT','code','CODE','codigo','CODIGO','name','NAME','nome','NOME','id','ID'];
    for(const k of names){const v=norm(p[k]);if(v&&/^[A-Z][A-Z0-9-]{1,10}$/.test(v))return v}
    for(const v0 of Object.values(p)){const v=norm(v0);if(v&&/^[A-Z][A-Z0-9]{1,7}$/.test(v)&&!/^POINT|FIXO|WAYPOINT$/i.test(v))return v}
    return '';
  }

  function featuresToRecords(obj, source='AISWEB WFS') {
    const feats=Array.isArray(obj?.features)?obj.features:[];const out=[];
    for(const f of feats){const ident=featureIdent(f?.properties);let c=f?.geometry?.coordinates;if(f?.geometry?.type==='MultiPoint')c=Array.isArray(c?.[0])?c[0]:null;if(!ident||!Array.isArray(c)||c.length<2)continue;const lon=Number(c[0]),lat=Number(c[1]);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;out.push({ident,lat,lon,source,kind:'waypoint',updatedAt:new Date().toISOString()})}
    return [...new Map(out.map(r=>[r.ident,r])).values()];
  }

  async function syncAISWEB() {
    const btn=qs('#ffrpSyncBtn');if(btn){btn.disabled=true;btn.textContent='Atualizando NAVDB…'}
    let embeddedApplied=0;
    try{
      // 1) Sempre aplica primeiro o snapshot oficial incorporado. Esta etapa é 100% local.
      const records=OFFICIAL_SEED.map(r=>({...r,updatedAt:new Date().toISOString()}));
      try{embeddedApplied=await dbPutMany(records)}catch(_){embeddedApplied=0}
      seedEmbeddedBase();
      if(model.history){
        model.resolvedSnapshots=await resolveAllSnapshots(model.history);
        rebuildMovementProfile();
        applyProcessedRouteToFlightFlow({fit:true});
        renderModal();
      }
      const snap=model.resolvedSnapshots[chooseSnapshotIndex()]||model.resolvedSnapshots[0];
      const unresolved=snap?snap.points.filter(p=>!p.geo):[];
      if(!unresolved.length){
        toast(`Base AISWEB incorporada aplicada. Rota atual completa${embeddedApplied?` · ${embeddedApplied} registro(s) gravados`:''}.`, 'ok');
        return;
      }

      // 2) Só tenta o WFS para pontos ainda ausentes. Falha de CORS/proxy nunca bloqueia o FlightFlow.
      const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),12000);
      let res; try { res=await fetch(OFFICIAL_WFS_JSON,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:ctrl.signal}); } finally { clearTimeout(to); }
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const obj=await res.json();const online=featuresToRecords(obj,'AISWEB/GeoAISWEB WFS');
      if(!online.length)throw new Error('O WFS respondeu, mas não encontrei pontos/coordenadas no formato retornado.');
      await dbPutMany(online);seedEmbeddedBase();
      if(model.history){model.resolvedSnapshots=await resolveAllSnapshots(model.history);rebuildMovementProfile();applyProcessedRouteToFlightFlow({fit:true});renderModal();}
      toast(`NAVDB complementada com ${online.length} ponto(s) do GeoAISWEB.`, 'ok');
    }catch(err){
      console.warn('[FlightFlow route] WFS opcional:',err);
      const snap=model.resolvedSnapshots[chooseSnapshotIndex()]||model.resolvedSnapshots[0];
      const remaining=snap?snap.points.filter(p=>!p.geo).length:0;
      toast(`Base local aplicada. ${remaining?`${remaining} ponto(s) continuam sem coordenada; use Base Nacional AISWEB e importe o XLSX/CSV oficial uma única vez.`:'Rota atual completa.'} O bloqueio CORS/proxy do WFS não afeta o FlightFlow.`, remaining?'warn':'ok');
    }finally{if(btn){btn.disabled=false;btn.textContent='Atualizar NAVDB AISWEB'}refreshDbCount()}
  }

  async function unzipXlsxEntries(buffer) {
    const bytes=new Uint8Array(buffer),view=new DataView(buffer);let eocd=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break}}
    if(eocd<0)throw new Error('XLSX inválido: diretório ZIP não encontrado.');
    const total=view.getUint16(eocd+10,true),central=view.getUint32(eocd+16,true),dec=new TextDecoder();let p=central;const entries=new Map();
    for(let n=0;n<total;n++){
      if(view.getUint32(p,true)!==0x02014b50)break;
      const method=view.getUint16(p+10,true),compSize=view.getUint32(p+20,true),nameLen=view.getUint16(p+28,true),extraLen=view.getUint16(p+30,true),commentLen=view.getUint16(p+32,true),local=view.getUint32(p+42,true),name=dec.decode(bytes.slice(p+46,p+46+nameLen));
      const lname=view.getUint16(local+26,true),lextra=view.getUint16(local+28,true),start=local+30+lname+lextra,raw=bytes.slice(start,start+compSize);let data;
      if(method===0)data=raw;
      else if(method===8){if(typeof DecompressionStream!=='function')throw new Error('Seu navegador não oferece descompressão ZIP necessária para XLSX. Use CSV/GeoJSON.');const ds=new DecompressionStream('deflate-raw');data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer());}
      else{p+=46+nameLen+extraLen+commentLen;continue}
      entries.set(name,data);p+=46+nameLen+extraLen+commentLen;
    }
    return entries;
  }

  function xlsxCellColumn(ref){const m=String(ref||'').match(/^([A-Z]+)/i);if(!m)return 0;let n=0;for(const c of m[1].toUpperCase())n=n*26+(c.charCodeAt(0)-64);return n-1}
  function parseDmsText(raw,isLat){const s=String(raw||'').trim().toUpperCase();if(!s)return NaN;const num=Number(s.replace(',','.'));if(Number.isFinite(num)&&Math.abs(num)<=(isLat?90:180))return num;let m=s.match(/([NSWE])?\s*(\d{1,3})[:°\s]+(\d{1,2})[:'\s]+([\d.]+)\s*([NSWE])?/);if(!m)m=s.match(/^([NSWE])?(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)\s*([NSWE])?$/);if(!m)return NaN;const hemi=(m[1]||m[5]||'').toUpperCase(),deg=Number(m[2]),min=Number(m[3]),sec=Number(m[4]);if(![deg,min,sec].every(Number.isFinite))return NaN;let v=deg+min/60+sec/3600;if(hemi==='S'||hemi==='W')v=-v;return Math.abs(v)<=(isLat?90:180)?v:NaN}
  function rowsToNavRecords(rows,source='AISWEB Base Nacional XLSX'){
    if(!rows?.length)return[];let headerRow=0,best=-1;
    for(let r=0;r<Math.min(12,rows.length);r++){const hs=(rows[r]||[]).map(v=>norm(v).replace(/[\s_\-\/]+/g,''));const score=hs.reduce((n,h)=>n+(/IDENT|DESIGN|WAYPOINT|FIXO|LAT|LONG|LON|GEOM|WKT|NOME|NAME/.test(h)?1:0),0);if(score>best){best=score;headerRow=r}}
    const header=(rows[headerRow]||[]).map(v=>norm(v).replace(/[\s_\-\/]+/g,''));const find=patterns=>header.findIndex(h=>patterns.some(p=>h.includes(p)));
    const iIdent=find(['IDENT','DESIGNATOR','WAYPOINT','FIXO','WPT','CODIGO','CODE','NAME','NOME']);const iLat=find(['LATITUDE','LAT']);const iLon=find(['LONGITUDE','LONG','LON']);const iGeom=find(['GEOM','WKT','SHAPE']);const out=[];
    for(const row of rows.slice(headerRow+1)){
      if(!row?.length)continue;let ident=iIdent>=0?norm(row[iIdent]):'';
      if(!ident){ident=(row.map(norm).find(v=>/^[A-Z]{5}$/.test(v))||'')}
      if(!ident||!/^[A-Z][A-Z0-9-]{1,10}$/.test(ident))continue;
      let lat=iLat>=0?parseDmsText(row[iLat],true):NaN,lon=iLon>=0?parseDmsText(row[iLon],false):NaN;
      if((!Number.isFinite(lat)||!Number.isFinite(lon))&&iGeom>=0){const g=String(row[iGeom]||'');const m=g.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);if(m){lon=Number(m[1]);lat=Number(m[2])}}
      if(!Number.isFinite(lat)||!Number.isFinite(lon)){for(const cell of row){const g=String(cell||'');const m=g.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);if(m){lon=Number(m[1]);lat=Number(m[2]);break}}}
      if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)out.push({ident,lat,lon,source,kind:'waypoint',updatedAt:new Date().toISOString()});
    }
    return [...new Map(out.map(r=>[r.ident,r])).values()];
  }

  async function parseXlsxFile(file){
    const entries=await unzipXlsxEntries(await file.arrayBuffer()),dec=new TextDecoder('utf-8');
    const parser=new DOMParser(),shared=[];const ss=entries.get('xl/sharedStrings.xml');if(ss){const doc=parser.parseFromString(dec.decode(ss),'application/xml');doc.querySelectorAll('si').forEach(si=>shared.push([...si.querySelectorAll('t')].map(t=>t.textContent||'').join('')))}
    const sheets=[...entries.keys()].filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(k)).sort();if(!sheets.length)throw new Error('XLSX sem planilha legível.');let all=[];
    for(const name of sheets.slice(0,4)){
      const doc=parser.parseFromString(dec.decode(entries.get(name)),'application/xml'),rows=[];
      doc.querySelectorAll('row').forEach(row=>{const arr=[];row.querySelectorAll('c').forEach(c=>{const col=xlsxCellColumn(c.getAttribute('r'));const t=c.getAttribute('t');let v='';if(t==='inlineStr')v=[...c.querySelectorAll('is t')].map(x=>x.textContent||'').join('');else{v=c.querySelector('v')?.textContent||'';if(t==='s')v=shared[Number(v)]??v}arr[col]=v});rows.push(arr)});
      all.push(...rowsToNavRecords(rows,`AISWEB Base Nacional XLSX · ${name.split('/').pop()}`));
    }
    return [...new Map(all.map(r=>[r.ident,r])).values()];
  }

  function parseCsv(text) {
    const raw=String(text||'').replace(/\r/g,'');const first=raw.split('\n').find(x=>x.trim())||'';const delim=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';
    const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===delim&&!q){out.push(cur);cur='';}else cur+=c}out.push(cur);return out.map(x=>x.trim())};
    const lines=raw.split('\n').filter(x=>x.trim());if(lines.length<2)return[];const rows=lines.map(parseLine);return rowsToNavRecords(rows,'AISWEB Base Nacional CSV / NAVDB importada');
  }

  async function importNavFile(file) {
    try{
      let records=[];
      if(/\.xlsx?$/i.test(file.name))records=await parseXlsxFile(file);else{
        const text=await file.text();
        if(/\.csv$/i.test(file.name))records=parseCsv(text);else{
        const obj=JSON.parse(text);
        if(Array.isArray(obj?.features))records=featuresToRecords(obj,'NAVDB GeoJSON importada');
        else if(Array.isArray(obj?.points))records=obj.points.map(r=>({ident:norm(r.ident||r.code||r.name),lat:Number(r.lat),lon:Number(r.lon),source:r.source||'NAVDB JSON importada',kind:r.kind||'waypoint',updatedAt:new Date().toISOString()})).filter(r=>r.ident&&Number.isFinite(r.lat)&&Number.isFinite(r.lon));
        else if(obj&&typeof obj==='object')records=Object.entries(obj).map(([k,v])=>({ident:norm(v?.ident||k),lat:Number(v?.lat),lon:Number(v?.lon),source:v?.source||'NAVDB JSON importada',kind:v?.kind||'waypoint',updatedAt:new Date().toISOString()})).filter(r=>r.ident&&Number.isFinite(r.lat)&&Number.isFinite(r.lon));
        }
      }
      records=[...new Map(records.map(r=>[r.ident,r])).values()];if(!records.length)throw new Error('Nenhum ponto válido encontrado.');
      records.forEach(r=>model.imported.set(r.ident,{...r}));
      let persisted=true,persistError='';
      try{await dbPutMany(records)}catch(err){persisted=false;persistError=String(err?.message||err||'IndexedDB indisponível')}
      model.nationalBaseInstalledAt=new Date().toISOString();seedEmbeddedBase();
      toast(persisted?`${records.length} ponto(s) importados para a NAVDB e persistidos para os próximos históricos.`:`${records.length} ponto(s) importados e ativos nesta sessão. Persistência local indisponível: ${persistError}` , persisted?'ok':'warn');
      if(model.history){model.resolvedSnapshots=await resolveAllSnapshots(model.history);rebuildMovementProfile();applyProcessedRouteToFlightFlow({fit:true});renderModal();}
    }catch(err){toast(`Falha ao importar NAVDB: ${err.message||err}`, 'error')}
    refreshDbCount();
  }

  function download(name, text, type='application/json') {
    const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function exportCurrentRoute() {
    if(!model.history||!model.resolvedSnapshots.length)return;
    const snap=model.resolvedSnapshots[chooseSnapshotIndex()];
    const payload={schema:'FlightFlow.RouteProcessed/1',version:VERSION,exportedAt:new Date().toISOString(),sourceFile:model.sourceFile,flight:{callsign:model.history.callsign,idPlano:model.history.idPlano,adep:model.history.adep,ades:model.history.ades,routeDeclared:model.history.route},snapshot:{index:chooseSnapshotIndex(),blockIndex:snap.blockIndex,operation:snap.operation,eventDateTime:snap.eventDt,points:snap.points.map(p=>({ident:p.ident,etim:p.etim,passed:p.passed,cfl:p.cfl,lat:p.geo?.lat??null,lon:p.geo?.lon??null,coordinateSource:p.geo?.source??null}))}};
    download(`FlightFlow_${model.history.callsign||'rota'}_rota_processada.json`,JSON.stringify(payload,null,2));
  }

  async function readHistoryFile(file) {
    const buf=await file.arrayBuffer();
    const bytes=new Uint8Array(buf);
    let text='';
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch(_){text=''}
    if(!text || !/OPERA|HIST.RICO DE PLANOS|PONTOS\s*:/i.test(text)){
      try{text=new TextDecoder('windows-1252').decode(bytes)}catch(_){text=new TextDecoder().decode(bytes)}
    }
    return text;
  }

  function rawHistoryFromApp() {
    const candidates=['#originalFullText','#historyOriginalText','#rawHistory','#originalHistory'];
    for(const sel of candidates){
      const el=qs(sel); if(!el) continue;
      const value=('value' in el && typeof el.value==='string' ? el.value : el.textContent)||'';
      if(value && /PONTOS\s*:|HIST.RICO DE PLANOS|OPERA/i.test(value)) return value;
    }
    return '';
  }

  function sourceNameFromApp() {
    const el=qs('#selectedFileLabel');
    const txt=String(el?.textContent||'').trim();
    return txt && !/Nenhum arquivo/i.test(txt) ? txt : (model.sourceFile||'histórico FlightFlow');
  }

  let bridgeTimer=0, bridgeBound=false, lastAppToken='';
  function appHistoryToken(text,name){
    const s=String(text||'');
    return `${name}|${s.length}|${s.slice(0,90)}|${s.slice(-90)}`;
  }
  function scheduleAnalyzeFromApp(delay=180){
    clearTimeout(bridgeTimer);
    bridgeTimer=setTimeout(async()=>{
      const text=rawHistoryFromApp(); if(!text) return;
      if(model.pendingReset && historyFingerprint(text)===model.pendingOldHistoryFingerprint)return;
      model.pendingReset=false;model.pendingOldHistoryFingerprint='';
      const name=sourceNameFromApp(); const token=appHistoryToken(text,name);
      if(token===lastAppToken) return;
      lastAppToken=token;
      try{await analyzeText(text,name)}catch(err){console.warn('[FlightFlow route safe bridge]',err)}
    },delay);
  }
  function clearRouteModel({clearNativeRoute=true}={}){
    model.history=null; model.resolvedSnapshots=[]; model.currentSnapshotIndex=0; model.routeProgress=0; model.sourceFile=''; model.lastNativeIndex=-1; model.movementProfile=null; lastAppToken='';
    clearNativeLayers({clearNativeRoute});
    model.lastSourceLabel='';model.lastTransferSignature='';
    const badge=qs('#ffrpMainBadge');if(badge)badge.hidden=true;
    const open=qs('#ffrpOpen');if(open)open.hidden=true;
    const st=window.__FlightFlowFirBridge?.state;if(st?.geo)delete st.geo.ffrpProcessedRoute;
    updateOpenBadge();
  }
  function bindHistoryBridge() {
    if(bridgeBound) return; bridgeBound=true;
    const bindTargets=()=>{
      const original=qs('#originalFullText');
      if(original && !original.dataset.ffrpSafeObserved749){
        original.dataset.ffrpSafeObserved749='1';
        new MutationObserver(()=>scheduleAnalyzeFromApp()).observe(original,{childList:true,characterData:true,subtree:true});
      }
      const selected=qs('#selectedFileLabel');
      if(selected && !selected.dataset.ffrpSafeObserved749){
        selected.dataset.ffrpSafeObserved749='1';
        new MutationObserver(()=>{
          const newName=sourceNameFromApp();
          // Se o FlightFlow já emitiu 'pending', preserve a impressão digital do
          // histórico ANTERIOR até o texto novo realmente chegar.
          if(!model.pendingReset && model.history && newName && model.sourceFile && newName!==model.sourceFile){
            model.pendingOldHistoryFingerprint=historyFingerprint(rawHistoryFromApp());model.pendingReset=true;clearRouteModel({clearNativeRoute:false});
          }
          scheduleAnalyzeFromApp();
        }).observe(selected,{childList:true,characterData:true,subtree:true});
      }
      const scrub=qs('#scrubber');
      if(scrub && !scrub.dataset.ffrpSafeObserved749){
        scrub.dataset.ffrpSafeObserved749='1';
        const sync=()=>{if(!model.history||!model.syncTimeline)return;model.currentSnapshotIndex=chooseSnapshotIndex();applyProcessedRouteToFlightFlow();if(!modal()?.hidden)renderModal();else updateOpenBadge()};
        scrub.addEventListener('input',sync,{passive:true}); scrub.addEventListener('change',sync,{passive:true});
      }
    };
    bindTargets(); scheduleAnalyzeFromApp(450);
    const discovery=setInterval(()=>{bindTargets(); if(rawHistoryFromApp()) scheduleAnalyzeFromApp(60)},1200);
    setTimeout(()=>clearInterval(discovery),30000);
    document.addEventListener('flightflow:history-session-reset',event=>{
      const mode=event?.detail?.mode||'';
      if(mode==='pending'){
        const old=rawHistoryFromApp();model.pendingOldHistoryFingerprint=historyFingerprint(old);model.pendingReset=true;clearRouteModel({clearNativeRoute:true});return;
      }
      if(mode==='empty'){
        model.pendingReset=false;model.pendingOldHistoryFingerprint='';clearRouteModel({clearNativeRoute:true});return;
      }
      if(mode==='source'||mode==='combined'){
        // 'source' é emitido antes de prepareOriginalHistory() no FlightFlow original.
        // Se houve 'pending', mantemos a fingerprint antiga até #originalFullText mudar.
        // Se o texto novo já estiver presente (ou não houve pending), o agendador o
        // reconhecerá imediatamente pela diferença de fingerprint.
        clearRouteModel({clearNativeRoute:false});setTimeout(()=>scheduleAnalyzeFromApp(80),0);return;
      }
      const old=rawHistoryFromApp();model.pendingOldHistoryFingerprint=historyFingerprint(old);model.pendingReset=true;clearRouteModel({clearNativeRoute:true});
    });
    // v7.4.12: a troca de eventos usa etapas intermediárias nos fixos cujos ETIM
    // ficam entre os dois eventos, garantindo passagem visível e ordenada pelos pontos da rota.
    document.addEventListener('click',event=>{const item=event.target?.closest?.('.timeline-item'),transport=event.target?.closest?.('#prevBtn,#nextBtn,#restartBtn');if(item||transport)setTimeout(()=>syncFromNativeTimeline(),0)},true);
    document.addEventListener('input',event=>{if(event.target?.id==='scrubber')setTimeout(()=>syncFromNativeTimeline(),0)},true);
    document.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight')setTimeout(()=>syncFromNativeTimeline(),0)},true);
  }

  function startPassiveBridge() {
    if(model.passiveTimer)return;
    const tick=async()=>{
      if(model.passiveBusy)return;
      model.passiveBusy=true;
      try{
        const text=rawHistoryFromApp();
        if(text){
          const name=sourceNameFromApp();const token=appHistoryToken(text,name);
          if(model.history && name && model.sourceFile && name!==model.sourceFile){
            model.pendingOldHistoryFingerprint=historyFingerprint(text);model.pendingReset=true;clearRouteModel({clearNativeRoute:false});
          }
          if(model.pendingReset && historyFingerprint(text)===model.pendingOldHistoryFingerprint){/* aguarda o novo histórico */}
          else if(token!==lastAppToken){model.pendingReset=false;model.pendingOldHistoryFingerprint='';lastAppToken=token;await analyzeText(text,name);}
          else if(model.history)applyProcessedRouteToFlightFlow();
        }else if(model.history){applyProcessedRouteToFlightFlow();}
        ensureOpenButtonPlacement(); ensureFixesToggle(); ensureHandoffsToggle();
        const ni=nativeEventIndex();if(model.history&&ni!==model.lastNativeIndex){
          model.lastNativeIndex=ni;model.syncTimeline=true;model.useFinalSnapshot=false;
          const st=window.__FlightFlowFirBridge?.state,route=st?.geo?.eventRoutes?.[ni],target=Number(route?.target);
          if(st?.motion&&Number.isFinite(target)){
            const current=Number.isFinite(Number(st.motion.currentProgress))?Number(st.motion.currentProgress):target;
            const delta=Math.abs(target-current);
            st.motion.ffrpResponse=Math.max(2.1,Math.min(3.4,3.4-delta*4.5));
            st.motion.velocity=0;
            st.motion.targetProgress=target;
            if(!st.motion.initialized){st.motion.currentProgress=target;st.motion.initialized=true;}
          }
          const scrub=qs('#scrubber');if(scrub&&Number(scrub.value)!==ni){scrub.value=String(ni);}
          syncFromNativeTimeline();
        }
        const snap=model.resolvedSnapshots[chooseSnapshotIndex()]||model.resolvedSnapshots[0];if(snap&&snapshotIsComplete(snap))suppressLegacyRouteVisuals(snap);
        if(model.history && !modal()?.hidden && model.syncTimeline)renderModal();
      }catch(err){console.warn('[FlightFlow route] integração passiva:',err)}
      finally{model.passiveBusy=false;}
    };
    setTimeout(tick,600);
    model.passiveTimer=setInterval(tick,500);
    // Apenas escuta a linha do tempo; não substitui nem cancela listeners originais.
    const bindScrub=()=>{
      const scrub=qs('#scrubber');
      if(scrub && !scrub.dataset.ffrpNativeSync7412){
        scrub.dataset.ffrpNativeSync7412='1';
        const sync=()=>setTimeout(()=>applyProcessedRouteToFlightFlow(),0);
        scrub.addEventListener('input',sync,{passive:true});scrub.addEventListener('change',sync,{passive:true});
      }
    };
    bindScrub();setTimeout(bindScrub,1600);setTimeout(bindScrub,4200);
  }

  function publicApi() {
    return Object.freeze({
      version:VERSION,
      parseHistory,
      parseCoordinateIdent,
      analyzeText,
      syncAISWEB,
      importNavFile,
      parseXlsxFile,
      parseCsv,
      jumpToFlightEvent,
      suppressLegacyRouteVisuals,
      applyProcessedRouteToFlightFlow,
      setFixesVisible:(value)=>{saveFixesVisiblePreference(value);const input=ensureFixesToggle();if(input)input.checked=!!model.fixesVisible;applyProcessedRouteToFlightFlow();return model.fixesVisible;},
      setHandoffsVisible:(value)=>{saveHandoffsVisiblePreference(value);const input=ensureHandoffsToggle();if(input)input.checked=!!model.handoffsVisible;applyProcessedRouteToFlightFlow();return model.handoffsVisible;},
      movementPoints, pseudoDestinationTail, transferMarkersForSnapshot, nativeEventIndexForSnapshot, firstDepartureAnchor, buildMovementProfile, progressForNativeEventIndex, routeDistanceFractions, candidateProgressFromSnapshot, transitionPlanForEvents, transitionDurations,
      officialSeed:OFFICIAL_SEED.map(x=>({...x})),
      collectMapObstacles,
      labelPlacementFor,
      snapshotIsComplete,
      getModel:()=>model,
      officialWfsJson:OFFICIAL_WFS_JSON,
      officialWfsXls:OFFICIAL_WFS_XLS,
      officialWfsCsv:OFFICIAL_WFS_CSV,
      officialFixesPage:OFFICIAL_FIXES_PAGE,
    });
  }

  async function init() {
    // Offline-first: a base incorporada e a integração com a rota nativa não precisam de rede/proxy.
    // O WFS oficial permanece apenas como complemento sob ação explícita do operador.
    model.fixesVisible=loadFixesVisiblePreference();model.handoffsVisible=loadHandoffsVisiblePreference();
    installStyle(); ensureUi(); seedEmbeddedBase();
    window.FlightFlowRouteProcessedV7412=publicApi();
    bindHistoryBridge();
    startPassiveBridge();
    console.info(`[FlightFlow] módulo Rota Processada v${VERSION} ativo em modo integrado/offline-first.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();
