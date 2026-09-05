(function () {
  'use strict';

  const AI_ENGINE_VERSION = '1.3.2';
  const MODEL_SCHEMA_VERSION = 1;
  const MODEL_KEY = 'flightflow-ai-governance-v1';
  const AUDIT_KEY = 'flightflow-ai-audit-v1';
  const SETTINGS_KEY = 'flightflow-ai-settings-v1';
  const MANUAL_DB_NAME = 'FlightFlowAIBrain';
  const MANUAL_DB_VERSION = 1;
  const MANUAL_STORE = 'manuals';
  const MAX_AUDIT = 120;
  const SEVERITY_ORDER = Object.freeze({ info: 0, low: 1, medium: 2, high: 3, critical: 4 });
  const SEVERITY_LABELS = Object.freeze({ info: 'Informativo', low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' });
  const CATEGORY_LABELS = Object.freeze({
    syntax: 'Sintaxe', sequence: 'Sequência', direction: 'Direção', integrity: 'Integridade',
    timing: 'Tempo', duplicate: 'Duplicidade', learned: 'Padrão aprendido', quality: 'Qualidade'
  });
  const AI_FACILITY_LABELS = Object.freeze({
    SBBSZQZX: 'ACC Brasília',
    SBANZAZX: 'APP Anápolis',
    SBBRZXCS: 'APP Brasília',
    SBBRZTZX: 'Torre Brasília',
    SBGOZTZX: 'Torre Goiânia',
    SBRJZPZX: 'SIGMA CPV'
  });

  const DIMENSION_DEFS = Object.freeze([
    { key: 'accuracy', label: 'Acurácia estimada', help: 'Coerência interna com identificadores, rota e valores persistentes. A confirmação real exige uma fonte autoritativa externa.' },
    { key: 'completeness', label: 'Completude', help: 'Presença dos campos necessários ao tipo de mensagem e ao evento.' },
    { key: 'consistency', label: 'Consistência', help: 'Uniformidade entre eventos, estados, identificadores e atributos do mesmo plano.' },
    { key: 'currency', label: 'Atualidade', help: 'Uso da versão mais recente do dado dentro do próprio histórico, incluindo atualização de EOBT/ID.' },
    { key: 'integrity', label: 'Integridade', help: 'Referências válidas, respostas correlatas e ausência de registros órfãos.' },
    { key: 'reasonableness', label: 'Razoabilidade', help: 'Sequência operacional plausível e compatível com o estado do plano.' },
    { key: 'timeliness', label: 'Tempo adequado', help: 'Ordem cronológica e latência das respostas esperadas.' },
    { key: 'uniqueness', label: 'Unicidade', help: 'Ausência de duplicidades indevidas do mesmo evento ou mensagem.' },
    { key: 'validity', label: 'Validade', help: 'Conformidade com formato, domínio, códigos, datas e horários.' }
  ]);

  const MESSAGE_SPECS = Object.freeze({
    FPL: {
      label: 'Plano de voo',
      flow: 'SIGMA/CPV ↔ ACC; em cenários RPL o ACC também pode originar o envio.',
      required: ['callsign', 'adep', 'ades', 'eobt', 'dof', 'route'],
      expected: 'Normalmente gera ACK(FPL); uma resposta a RQP pode reenviar FPL e DEP.'
    },
    ACK: {
      label: 'Confirmação de processamento',
      flow: 'Retorna ao originador da mensagem tratada.',
      required: ['originator', 'recipients', 'relatedType'],
      expected: 'Deve indicar em MSGTYP qual mensagem foi confirmada.'
    },
    DLA: {
      label: 'Atraso do plano',
      flow: 'SIGMA/CPV ↔ ACC.',
      required: ['callsign', 'adep', 'ades', 'eobt', 'dof'],
      expected: 'Deve atualizar estimados e produzir ACK(DLA), podendo gerar CHG/FPL atualizado.'
    },
    CHG: {
      label: 'Modificação do plano',
      flow: 'SIGMA/CPV ↔ ACC; cópias podem seguir para APP/TWR.',
      required: ['callsign'],
      expected: 'Deve identificar o campo alterado ou transportar FPL atualizado e produzir ACK(CHG).'
    },
    CNL: {
      label: 'Cancelamento',
      flow: 'SIGMA/CPV ↔ ACC e distribuição conforme órgãos envolvidos.',
      required: ['callsign', 'adep', 'ades', 'dof'],
      expected: 'Deve conduzir o plano a estado cancelado/terminado, sem eventos operacionais posteriores incompatíveis.'
    },
    DEP: {
      label: 'Decolagem',
      flow: 'TWR/TATIC → ACC; o ACC pode redistribuir a informação ao SIGMA/CPV e a outros órgãos interessados.',
      required: ['callsign', 'adep', 'ades', 'dof', 'depTime'],
      expected: 'Deve ocorrer após ativação/decolagem/correlação, não durante estado puramente inativo.'
    },
    ARR: {
      label: 'Chegada',
      flow: 'TWR/TATIC do destino → ACC; o ACC pode redistribuir à rede ATS/SIGMA conforme a configuração.',
      required: ['callsign', 'adep', 'ades'],
      expected: 'Deve ocorrer após fase ativa e anteceder término/arquivamento; algumas variantes operacionais não transportam DOF.'
    },
    ABI: {
      label: 'Advance Boundary Information',
      flow: 'Órgão doador → órgão receptor (AIDC/OLDI/ADEXP).',
      required: ['callsign', 'adep', 'ades', 'eobt', 'route'],
      expected: 'Normalmente recebe LAM, e pode anteceder ACT/EST conforme o protocolo.'
    },
    ACT: {
      label: 'Activate',
      flow: 'Órgão doador → órgão receptor ou ACC → SIGMA conforme integração.',
      required: ['callsign', 'adep', 'ades', 'eobt', 'route'],
      expected: 'Em enlace AIDC/OLDI deve possuir confirmação/referência coerente.'
    },
    EST: {
      label: 'Estimate',
      flow: 'Órgão doador → órgão receptor.',
      required: ['callsign', 'adep', 'ades'],
      expected: 'Deve conter estimado operacional e ser coerente com a coordenação.'
    },
    CRQ: {
      label: 'Clearance Request',
      flow: 'TWR → ACC.',
      required: ['callsign', 'ssr', 'adep', 'ades', 'eobt', 'runwayDeparture', 'sid', 'idPlano'],
      expected: 'Deve ser seguido por SBY e/ou CRP; o CRP retorna ACC → TWR.'
    },
    CRP: {
      label: 'Clearance Response',
      flow: 'ACC → TWR; cópias INF podem seguir para APP/SIGMA.',
      required: ['callsign', 'ssr', 'adep', 'ades', 'cfl', 'runwayDeparture', 'sid', 'idPlano'],
      expected: 'Deve referenciar CRQ e ser confirmado por LAM quando aplicável.'
    },
    SBY: {
      label: 'Standby',
      flow: 'ACC → TWR.',
      required: ['originator', 'recipients', 'msgRef'],
      expected: 'Resposta transitória a CRQ, antes do CRP definitivo.'
    },
    PAC: {
      label: 'Progress/position aircraft clearance',
      flow: 'TWR → ACC.',
      required: ['callsign', 'adep', 'ades', 'idPlano'],
      expected: 'Deve transportar pelo menos um marco de solo (CLG/PBG/TXC/DCDT) e receber LAM.'
    },
    LAM: {
      label: 'Logical Acknowledgement',
      flow: 'Retorno no sentido inverso da mensagem referenciada.',
      required: ['originator', 'recipients', 'msgRef'],
      expected: 'Confirma positivamente o recebimento e a validação lógica da mensagem integrada.'
    },
    LRM: {
      label: 'Logical Rejection Message',
      flow: 'Retorno no sentido inverso da mensagem rejeitada.',
      required: ['originator', 'recipients'],
      expected: 'Encerra a tentativa com rejeição lógica e deve permitir identificar a mensagem ou o motivo rejeitado.'
    },
    INF: {
      label: 'Cópia informativa',
      flow: 'ACC → APP/TWR/SIGMA conforme o evento.',
      required: ['callsign', 'adep', 'ades', 'relatedType'],
      expected: 'MSGTYP deve identificar a mensagem copiada, por exemplo CRP ou PAC.'
    },
    RQP: {
      label: 'Request Flight Plan',
      flow: 'TWR/TATIC → ACC; integrações específicas também podem requisitar reenvio a partir de outro sistema.',
      required: ['callsign', 'adep', 'ades', 'dof'],
      expected: 'O ACC normalmente fornece o plano por ABI; conforme a integração, pode reenviar FPL e, se já decolado, DEP.'
    },
    FPVD: {
      label: 'Ficha de partida',
      flow: 'ACC → APP/TWR por TTY.',
      required: ['callsign', 'ssr', 'adep', 'ades', 'route'],
      expected: 'Distribuição na pré-ativação/partida, com IDPLANO quando disponível.'
    },
    FPVA: {
      label: 'Ficha de chegada',
      flow: 'ACC → APP/TWR por TTY.',
      required: ['callsign', 'ssr', 'adep', 'ades', 'route'],
      expected: 'Após a distribuição para o órgão de chegada, o APP/TWR destinatário deve retornar LAM (aceite lógico) ou LRM (rejeição lógica) ao ACC.'
    },
    FPVS: {
      label: 'Notificação de sobrevoo ao APP',
      flow: 'ACC → APP.',
      required: ['callsign', 'adep', 'ades', 'route'],
      expected: 'Notifica ao APP o sobrevoo da aeronave. Regra operacional cadastrada: FPVS = Notificação do ACC para o APP de sobrevoo de aeronave.'
    },
    ACP: {
      label: 'Accept',
      flow: 'Órgão receptor → órgão doador.',
      required: ['originator', 'recipients'],
      expected: 'Aceita a coordenação e deve estar ligada a ACT/EST/CDN.'
    },
    CDN: {
      label: 'Coordination',
      flow: 'Órgãos ATS adjacentes.',
      required: ['callsign', 'originator', 'recipients'],
      expected: 'Deve preservar dados-chave do plano e possuir resposta coerente.'
    },
    TOC: {
      label: 'Transfer of Control',
      flow: 'Órgão doador → órgão receptor.',
      required: ['callsign', 'originator', 'recipients'],
      expected: 'Deve ocorrer após coordenação/aceitação.'
    },
    AOC: {
      label: 'Assumption of Control',
      flow: 'Órgão receptor → órgão doador.',
      required: ['callsign', 'originator', 'recipients'],
      expected: 'Confirma a assunção após TOC.'
    },
    MAC: {
      label: 'Message for Abrogation of Coordination',
      flow: 'Órgãos ATS adjacentes.',
      required: ['callsign', 'originator', 'recipients'],
      expected: 'Cancela coordenação anterior e deve possuir contexto/referência.'
    },
    REJ: {
      label: 'Rejection',
      flow: 'Retorno ao originador.',
      required: ['originator', 'recipients'],
      expected: 'Deve indicar motivo/campo rejeitado para permitir correção.'
    }
  });

  const BASE_REQUIRED_FIELDS = Object.freeze({
    callsign: 'indicativo/ARCID', adep: 'ADEP', ades: 'ADES', eobt: 'EOBT', dof: 'DOF/EOBD',
    route: 'rota', originator: 'originador', recipients: 'destinatário', relatedType: 'MSGTYP',
    idPlano: 'IDPLANO', ssr: 'SSR', runwayDeparture: 'pista de decolagem', sid: 'SID', cfl: 'CFL',
    depTime: 'hora de decolagem', msgRef: 'MSGREF/referência'
  });

  const RESPONSE_RULES = Object.freeze([
    { trigger: 'FPL', when: e => e.direction === 'sent' && roleOf(e.recipients) === 'SIGMA', expected: ['ACK:FPL'], within: 6, severity: 'medium', id: 'SEQ_FPL_ACK', text: 'FPL enviado ao SIGMA sem ACK(FPL) próximo.' },
    { trigger: 'DLA', expected: ['ACK:DLA', 'CHG'], within: 7, severity: 'medium', id: 'SEQ_DLA_ACK', text: 'DLA sem ACK(DLA) ou atualização CHG próxima.' },
    { trigger: 'CHG', expected: ['ACK:CHG'], within: 8, severity: 'low', id: 'SEQ_CHG_ACK', text: 'CHG sem ACK(CHG) próximo.' },
    { trigger: 'CRQ', expected: ['SBY', 'CRP'], within: 8, severity: 'high', id: 'SEQ_CRQ_CRP', text: 'CRQ sem SBY/CRP no intervalo esperado.' },
    { trigger: 'ABI', when: e => e.direction === 'sent', expected: ['LAM'], within: 6, requireInverse: true, severity: 'medium', id: 'SEQ_ABI_LAM', text: 'ABI sem LAM de confirmação do órgão destinatário.' },
    { trigger: 'FPVA', when: e => e.direction === 'sent' && roleOf(e.originator) === 'ACC' && ['APP', 'TWR'].includes(roleOf(e.recipients)), expected: ['LAM', 'LRM'], within: 6, requireInverse: true, severity: 'medium', id: 'SEQ_FPVA_LAM_LRM', text: 'FPVA encaminhada pelo ACC sem LAM/LRM do órgão destinatário.' },
    { trigger: 'ACT', when: e => e.direction === 'sent' && ['APP', 'TWR', 'ACC', 'OTHER'].includes(roleOf(e.recipients)), expected: ['LAM', 'ACP'], within: 8, severity: 'low', id: 'SEQ_ACT_CONFIRM', text: 'ACT sem LAM/ACP próximo.' },
    { trigger: 'PAC', expected: ['LAM'], within: 5, requireInverse: true, severity: 'medium', id: 'SEQ_PAC_LAM', text: 'PAC sem LAM de confirmação do órgão destinatário.' },
    { trigger: 'RQP', expected: ['ABI', 'FPL'], within: 8, severity: 'high', id: 'SEQ_RQP_PLAN', text: 'RQP sem fornecimento de plano por ABI/FPL próximo.' },
    { trigger: 'TOC', expected: ['AOC'], within: 8, severity: 'medium', id: 'SEQ_TOC_AOC', text: 'TOC sem AOC próximo.' }
  ]);

  const NEXT_STEP_RULES = Object.freeze({
    FPL: ['ACK', 'DLA', 'CHG'], ACK: ['DLA', 'CHG', 'CRQ'], DLA: ['ACK', 'CHG'], CHG: ['ACK', 'CRQ'],
    CRQ: ['SBY', 'CRP'], SBY: ['CRP'], CRP: ['LAM', 'PAC', 'DEP'], PAC: ['LAM', 'DEP'],
    DEP: ['ABI', 'ACT', 'EST'], ABI: ['LAM', 'ACT'], ACT: ['LAM', 'ACP', 'TOC'], EST: ['ACP', 'CDN'],
    ACP: ['TOC'], CDN: ['ACP', 'TOC'], TOC: ['AOC'], AOC: ['ARR'], ARR: ['TER', 'ARQ'],
    CNL: ['TER', 'ARQ'], FPVD: ['CRQ', 'PAC', 'DEP'], FPVA: ['LAM', 'LRM', 'ARR'], RQP: ['ABI', 'FPL'], FPVS: ['LAM', 'LRM'], REJ: ['CHG', 'FPL']
  });

  const STATUS_LABELS_AI = Object.freeze({ INA: 'Inativo', PRE: 'Pré-ativo', ATV: 'Ativo', TER: 'Terminado', ARQ: 'Arquivado', CNL: 'Cancelado' });

  let currentAnalysis = null;
  let currentSourceHash = '';
  let analysisTimer = 0;
  let model = loadModel();
  let settings = loadSettings();
  let audit = loadAudit();
  let manualBrain = [];
  let manualBrainReady = false;
  let activeAIView = 'errors';
  let aiFocusMode = false;

  const el = id => document.getElementById(id);
  const refs = {};

  function defaultModel() {
    return {
      schemaVersion: MODEL_SCHEMA_VERSION,
      engineVersion: AI_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      historiesObserved: 0,
      historiesApproved: 0,
      messageCounts: {},
      directionCounts: {},
      transitionCounts: {},
      fieldStats: {},
      timingStats: {},
      feedback: {},
      falsePositives: [],
      confirmedErrors: [],
      sources: []
    };
  }

  function loadModel() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MODEL_KEY) || 'null');
      if (parsed && parsed.schemaVersion === MODEL_SCHEMA_VERSION) {
        const merged = Object.assign(defaultModel(), parsed);
        if (!Array.isArray(merged.falsePositives)) merged.falsePositives = [];
        if (!Array.isArray(merged.confirmedErrors)) merged.confirmedErrors = [];
        return merged;
      }
    } catch (_) {}
    return defaultModel();
  }

  function saveModel() {
    model.updatedAt = new Date().toISOString();
    try { localStorage.setItem(MODEL_KEY, JSON.stringify(model)); window.FlightFlowStorage?.scheduleSnapshot('modelo de IA'); } catch (_) {}
  }

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (parsed) return Object.assign({ autoLearn: true }, parsed);
    } catch (_) {}
    return { autoLearn: true };
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); window.FlightFlowStorage?.scheduleSnapshot('configurações da IA'); } catch (_) {}
  }

  function loadAudit() {
    try {
      const parsed = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      if (Array.isArray(parsed)) return parsed.slice(-MAX_AUDIT);
    } catch (_) {}
    return [];
  }

  function saveAudit() {
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(audit.slice(-MAX_AUDIT))); window.FlightFlowStorage?.scheduleSnapshot('auditoria da IA'); } catch (_) {}
  }

  function addAudit(action, details) {
    audit.push({ at: new Date().toISOString(), action, details: String(details || '') });
    audit = audit.slice(-MAX_AUDIT);
    saveAudit();
    renderAudit();
  }

  function normalize(value) {
    return String(value == null ? '' : value).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  }

  function normalizeCode(value) {
    return normalize(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function addressCodes(value) {
    const matches = String(value == null ? '' : value).toUpperCase().match(/\b[A-Z]{4,8}\b/g) || [];
    return Array.from(new Set(matches.map(normalizeCode).filter(Boolean)));
  }

  function primaryAddress(value) {
    return addressCodes(value)[0] || normalizeCode(value);
  }

  function facilityDisplay(value) {
    const code = primaryAddress(value);
    if (!code) return '—';
    let label = AI_FACILITY_LABELS[code] || '';
    try {
      if (!label && typeof DEFAULT_LOCALITIES !== 'undefined' && DEFAULT_LOCALITIES) label = DEFAULT_LOCALITIES[code] || '';
    } catch (_) {}
    return label ? `${label} (${code})` : code;
  }

  function isInverseResponse(triggerEvent, responseEvent) {
    const triggerOrigins = addressCodes(triggerEvent && triggerEvent.originator);
    const triggerRecipients = addressCodes(triggerEvent && triggerEvent.recipients);
    const responseOrigins = addressCodes(responseEvent && responseEvent.originator);
    const responseRecipients = addressCodes(responseEvent && responseEvent.recipients);
    if (!triggerOrigins.length || !triggerRecipients.length || !responseOrigins.length || !responseRecipients.length) return false;
    return triggerRecipients.some(code => responseOrigins.includes(code)) && triggerOrigins.some(code => responseRecipients.includes(code));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function hashText(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function parseClock(value) {
    const match = String(value || '').match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]), m = Number(match[2]), s = Number(match[3]);
    if (h > 23 || m > 59 || s > 59) return null;
    return h * 3600 + m * 60 + s;
  }

  function parseDateKey(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    const d = Number(match[1]), m = Number(match[2]), y = Number(match[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return '';
    return `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function isValidHHMM(value) {
    const match = String(value || '').match(/^(\d{2})(\d{2})$/);
    return !!match && Number(match[1]) <= 23 && Number(match[2]) <= 59;
  }

  function isValidDof(value) {
    const match = String(value || '').match(/^(\d{2})(\d{2})(\d{2})$/);
    if (!match) return false;
    const y = 2000 + Number(match[1]), m = Number(match[2]), d = Number(match[3]);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }

  function roleOf(address) {
    const code = normalizeCode(address);
    if (!code) return 'UNKNOWN';
    if (/ZPZX|SIGMA|CPV/.test(code)) return 'SIGMA';
    if (/ZQZX/.test(code)) return 'ACC';
    if (/ZTZX/.test(code)) return 'TWR';
    if (/ZXCS|ZAZX|ZBZX/.test(code)) return 'APP';
    return 'OTHER';
  }

  function extractFirst(block, patterns) {
    for (const pattern of patterns) {
      const match = block.match(pattern);
      if (match && normalize(match[1])) return normalize(match[1]);
    }
    return '';
  }

  function extractMessageType(operation, content, block) {
    const title = normalizeCode(extractFirst(content, [/-TITLE\s+([A-Z0-9/]+)/i]));
    const relatedType = normalizeCode(extractFirst(content, [/-MSGTYP\s+([A-Z0-9/]+)/i, /-EVENT\s+([A-Z0-9/]+)/i]));
    let type = title;
    if (!type) {
      type = normalizeCode(extractFirst(content, [/^\s*\(([A-Z]{3,5})(?=[\-\/\s])/im, /^\s*\((FPV[ADS])(?=[\s\/])/im]));
    }
    if (!type) type = normalizeCode(extractFirst(operation, [/Mensagem\s+([A-Z0-9/]+)/i]));
    if (!type) type = normalizeCode(extractFirst(block, [/\b(FPVD|FPVA|FPVS)\b/i]));
    if (type === 'ADEXP' && title) type = title;
    if (type === 'TTY') {
      const fpv = normalizeCode(extractFirst(content, [/\((FPV[ADS])/i]));
      if (fpv) type = fpv;
    }
    return { type, title, relatedType };
  }

  function parseEvent(block, index) {
    const operation = extractFirst(block, [/OPERA(?:Ç|C)ÃO\s*:\s*([^\n]+)/i]);
    const dateText = extractFirst(block, [/\bdata\s*:\s*(\d{2}\/\d{2}\/\d{4})/i]);
    const timeText = extractFirst(block, [/\bhora\s*:\s*(\d{2}:\d{2}:\d{2})/i]);
    const status = normalizeCode(extractFirst(block, [/\bEstado\s*:\s*([A-Z]{3})/i]));
    const originator = normalizeCode(extractFirst(block, [/Originador\s*:\s*([^\n]+)/i]));
    const recipients = normalize(extractFirst(block, [/Destinat[aá]rios?\s*:\s*([^\n]+)/i])).toUpperCase();
    const contentIndex = block.search(/Conte[uú]do\s*:/i);
    const content = contentIndex >= 0 ? block.slice(contentIndex).replace(/^.*?Conte[uú]do\s*:\s*/is, '').trim() : '';
    const typeInfo = extractMessageType(operation, content, block);
    const direction = /Recep[cç][aã]o/i.test(operation) ? 'received' : (/Envio|Mensagem enviada\s*:\s*SIM/i.test(block) ? 'sent' : 'internal');

    let callsign = normalizeCode(extractFirst(block, [
      /-ARCID\s+([A-Z0-9]+)/i,
      /Indicativo\s*:\s*([A-Z0-9]+)/i,
      /^\s*\([A-Z]{3,5}-([A-Z0-9]+)/im,
      /^\s*\(FPV[ADS](?:\/CHG)?\s+([A-Z0-9]+)/im
    ]));
    let adep = normalizeCode(extractFirst(block, [/-ADEP\s+([A-Z]{4})/i, /\bADEP\s*:\s*([A-Z]{4})/i]));
    let ades = normalizeCode(extractFirst(block, [/-ADES\s+([A-Z]{4})/i, /\bADES\s*:\s*([A-Z]{4})/i]));
    let eobt = normalizeCode(extractFirst(block, [/-EOBT\s+(\d{4})/i, /\bEOBT\s*:\s*(\d{4})/i]));
    let dof = normalizeCode(extractFirst(block, [/DOF\/(\d{6})/i, /-EOBD\s+(\d{6})/i, /Data do voo\s*:\s*(\d{6})/i]));
    let ssr = normalizeCode(extractFirst(block, [/-SSRCODE\s+A?([0-7]{4})/i, /Alocado c[oó]digo SSR\s*:\s*([0-7]{4})/i, /Código SSR[^\n]*alocado\s*:\s*([0-7]{4})/i]));
    let route = normalize(extractFirst(block, [/-ROUTE\s+([^\n]+)/i, /\bRota\s*:\s*([^\n]+)/i, /RTE\/([^\n\r\)]+)/i, /-N\d{4}F\d{3}\s+([^\n]+)/i]));

    const compactFpl = content.match(/^\s*\((?:FPL|DLA|CNL|DEP|ARR|RQP)-[^\n\r]*/im);
    if (compactFpl) {
      const line = compactFpl[0];
      if (!adep) adep = normalizeCode(extractFirst(line, [/-([A-Z]{4})(?:\d{4})?(?:-|\s)/]));
      if (!ades) {
        const codes = Array.from(line.matchAll(/-([A-Z]{4})(?:\d{4})?(?=-|\s|\))/g)).map(m => m[1]);
        const destinationCode = codes.findLast ? codes.findLast(code => normalizeCode(code) !== adep) : [...codes].reverse().find(code => normalizeCode(code) !== adep);
        if (destinationCode) ades = normalizeCode(destinationCode);
      }
      if (!eobt) eobt = normalizeCode(extractFirst(line, [/-[A-Z]{4}(\d{4})/]));
    }
    if (['FPVD', 'FPVA', 'FPVS'].includes(typeInfo.type)) {
      const fpvHeader = content.match(/^\s*\(FPV[ADS](?:\/CHG)?\s+([A-Z0-9]+)\s+([0-7]{4})\s+[A-Z0-9]+\s+N\d{4}\s+([A-Z]{4})\s*(\d{4})?\s+([A-Z]{4})/im);
      if (fpvHeader) {
        if (!callsign) callsign = normalizeCode(fpvHeader[1]);
        if (!ssr) ssr = normalizeCode(fpvHeader[2]);
        if (!adep) adep = normalizeCode(fpvHeader[3]);
        if (!eobt && fpvHeader[4]) eobt = normalizeCode(fpvHeader[4]);
        if (!ades) ades = normalizeCode(fpvHeader[5]);
      }
      if (!route) {
        const afterHeader = content.replace(/^\s*\(FPV[ADS](?:\/CHG)?[^\n]*\n/im, '');
        route = normalize(extractFirst(afterHeader, [/^\s*([A-Z0-9]{2,})(?:\s+\d{4})?\s+F\d{2,3}/im]));
      }
    }
    if (typeInfo.type === 'ARR') {
      const arrCompact = content.match(/^\s*\(ARR[^-]*-([A-Z0-9]+)-([A-Z]{4})-([A-Z]{4})(\d{4})?\)/im);
      if (arrCompact) {
        if (!callsign) callsign = normalizeCode(arrCompact[1]);
        if (!adep) adep = normalizeCode(arrCompact[2]);
        if (!ades) ades = normalizeCode(arrCompact[3]);
      }
    }

    if (typeInfo.type === 'FPL') {
      const lines = content.split(/\n+/).map(v => v.trim()).filter(Boolean);
      const depLine = lines.find(line => /^-[A-Z]{4}\d{4}$/.test(line));
      const destLine = lines.find(line => /^-[A-Z]{4}\d{4}$/.test(line) && line !== depLine) || lines.find(line => /^-[A-Z]{4}\d{4}/.test(line) && line !== depLine);
      if (depLine) { adep = adep || depLine.slice(1, 5); eobt = eobt || depLine.slice(5, 9); }
      if (destLine) ades = ades || destLine.slice(1, 5);
    }

    const idPlano = normalizeCode(extractFirst(block, [/-IDPLANO\s+([A-Z0-9]+)/i, /IDPLANO\s*:\s*([A-Z0-9]+)/i, /RMK\/IDPLANO\s+([A-Z0-9]+)/i]));
    const runwayDeparture = normalizeCode(extractFirst(block, [/-RWYDEP\s+([A-Z0-9]+)/i, /Pista de decolagem\s*:\s*([A-Z0-9]+)/i]));
    const sid = normalize(extractFirst(block, [/-SID\s+([^\n]+)/i, /\bSID\s*:\s*([^\n]+)/i]));
    const cfl = normalizeCode(extractFirst(block, [/-CFL\s*(?:\n\s*)?-FL\s+F?(\d{2,3})/i, /\bCFL\s*:\s*F?(\d{2,3})/i, /N[ií]vel Autorizado\s*:\s*(\d{2,3})/i]));
    const aircraftType = normalizeCode(extractFirst(block, [/-ARCTYP\s+([A-Z0-9]+)/i, /Tipo de aeronave\s*:\s*([A-Z0-9]+)/i, /^\s*-[A-Z0-9]+\/M-([A-Z0-9]+)/im]));
    const depTime = normalizeCode(extractFirst(content, [
      /^\s*\(DEP-[A-Z0-9]+-[A-Z]{4}(\d{4})-/im,
      /-ATD\s+(\d{4})/i,
      /-DCDT\s+\d{6}(\d{4})/i
    ]));
    const msgRef = /-MSGREF\b/i.test(content) || /\(LAM[A-Z0-9/]+\)/i.test(content) ? 'SIM' : '';
    const seqNum = normalizeCode(extractFirst(content, [/-SEQNUM\s+([A-Z0-9]+)/i]));
    const groundMarkers = ['CLG', 'PBG', 'TXC', 'DCDT', 'ENDHLDT'].filter(key => new RegExp(`-${key}\\s+`, 'i').test(content));

    return {
      index, rawBlock: block, operation, dateText, dateKey: parseDateKey(dateText), timeText,
      secondsOfDay: parseClock(timeText), status, originator, recipients, direction,
      type: typeInfo.type, title: typeInfo.title, relatedType: typeInfo.relatedType,
      callsign, adep, ades, eobt, dof, idPlano, ssr, route, runwayDeparture, sid, cfl,
      aircraftType, depTime, msgRef, seqNum, groundMarkers, content
    };
  }

  function parseHistory(rawText) {
    const raw = String(rawText || '').replace(/\r/g, '');
    const blocks = raw.split(/^\s*#{20,}\s*$/m).map(v => v.trim()).filter(Boolean);
    const events = blocks.filter(block => /OPERA(?:Ç|C)ÃO\s*:/i.test(block)).map((block, index) => parseEvent(block, index));
    return { raw, events };
  }


  function builtinKnowledgeEntriesAI() {
    try {
      if (typeof window.__flightflowKnowledgeEntries === 'function') {
        const entries = window.__flightflowKnowledgeEntries();
        if (Array.isArray(entries)) return entries;
      }
    } catch (_) {}
    return [];
  }

  function normalizeSearchText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function uniqueCodes(values) {
    const known = new Set([...Object.keys(MESSAGE_SPECS), 'LAM', 'LRM', 'ACK', 'SBY']);
    return Array.from(new Set((values || []).map(value => normalizeCode(value)).filter(code => known.has(code))));
  }

  function queryCodesForAlert(alert) {
    const codes = [];
    const text = `${alert?.ruleId || ''} ${alert?.message || ''} ${alert?.evidence || ''}`.toUpperCase();
    for (const code of Object.keys(MESSAGE_SPECS)) if (new RegExp(`(?:^|[^A-Z0-9])${code}(?:$|[^A-Z0-9])`).test(text)) codes.push(code);
    if (/FPVA/.test(text)) codes.push('FPVA', 'LAM', 'LRM');
    if (/FPVS/.test(text)) codes.push('FPVS');
    if (/ABI/.test(text)) codes.push('ABI', 'LAM', 'LRM');
    if (/PAC/.test(text)) codes.push('PAC', 'LAM', 'LRM');
    if (/CRQ/.test(text)) codes.push('CRQ', 'SBY', 'CRP', 'LRM');
    if (/FPL/.test(text)) codes.push('FPL', 'ACK');
    if (/TOC/.test(text)) codes.push('TOC', 'AOC');
    return uniqueCodes(codes);
  }

  function builtInNormativeSupport(alert) {
    const codes = queryCodesForAlert(alert);
    const entries = builtinKnowledgeEntriesAI();
    const selected = [];
    for (const code of codes) {
      const matches = entries.filter(entry => normalizeCode(entry.code) === code || (entry.aliases || []).some(alias => normalizeCode(alias) === code));
      const preferred = matches.find(entry => entry.normative !== false) || matches[0];
      if (preferred && !selected.some(item => item.key === preferred.key)) selected.push(preferred);
    }
    if (alert?.ruleId === 'SEQ_FPVA_LAM_LRM') {
      return {
        reason: 'A FPVA saiu do ACC para um órgão operacional e não houve retorno lógico no sentido inverso. A CIRCEA define a LAM como confirmação positiva de uma mensagem integrada e a LRM como rejeição lógica. Sem LAM ou LRM, o envio fica sem desfecho registrado. A associação específica da FPVA deve ser confrontada também com o manual técnico da versão do SAGITARIO.',
        entries: selected.slice(0, 3)
      };
    }
    if (!selected.length) return { reason: '', entries: [] };
    const first = selected[0];
    const reason = first.responses || first.effect || first.short || first.definition || '';
    return { reason, entries: selected.slice(0, 3) };
  }

  function tokenizeQuery(value) {
    return normalizeSearchText(value).split(' ').filter(token => token.length >= 3);
  }

  function searchManualBrain(query, limit = 4) {
    const tokens = tokenizeQuery(query);
    if (!tokens.length) return [];
    const results = [];
    const sources = [...BUILTIN_AI_MANUALS, ...manualBrain].filter(item => item.enabled !== false);
    for (const manual of sources) {
      for (const chunk of manual.chunks || []) {
        const normalized = chunk.normalized || normalizeSearchText(chunk.text);
        let score = 0;
        for (const token of tokens) {
          if (normalized.includes(token)) score += token.length >= 5 ? 3 : 1;
          if (normalizeCode(chunk.code || '') === normalizeCode(token)) score += 8;
        }
        if (score > 0) results.push({ manual, chunk, score });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function normativeSupportFor(alert) {
    const builtin = builtInNormativeSupport(alert);
    const codes = queryCodesForAlert(alert);
    const query = [alert?.message, alert?.cause, alert?.evidence, ...codes].filter(Boolean).join(' ');
    const custom = searchManualBrain(query, 3);
    const customReason = custom[0]?.chunk?.text ? custom[0].chunk.text.slice(0, 360) : '';
    return {
      reason: customReason || builtin.reason || 'Não foi localizado um trecho documental suficientemente específico. A IA mantém o alerta com base na regra operacional cadastrada e solicita validação do especialista.',
      builtin: builtin.entries,
      custom
    };
  }

  function falsePositiveKey(alert, hash = currentAnalysis?.rawHash || '') {
    return `${hash}|${alert?.id || ''}`;
  }

  function isFalsePositive(alert, hash = currentAnalysis?.rawHash || '') {
    const key = falsePositiveKey(alert, hash);
    return Array.isArray(model.falsePositives) && model.falsePositives.some(item => item.key === key);
  }

  function falsePositivesForCurrent() {
    const hash = currentAnalysis?.rawHash || '';
    return (model.falsePositives || []).filter(item => item.sourceHash === hash);
  }

  function confirmedKey(alert, hash = currentAnalysis?.rawHash || '') {
    return `${hash}|${alert?.id || ''}`;
  }

  function isConfirmed(alert, hash = currentAnalysis?.rawHash || '') {
    const key = confirmedKey(alert, hash);
    return Array.isArray(model.confirmedErrors) && model.confirmedErrors.some(item => item.key === key);
  }

  function confirmedForCurrent() {
    const hash = currentAnalysis?.rawHash || '';
    return (model.confirmedErrors || []).filter(item => item.sourceHash === hash);
  }

  function applyFalsePositiveMask(analysis) {
    if (!analysis) return analysis;
    const allAlerts = Array.isArray(analysis.allAlerts) ? analysis.allAlerts : analysis.alerts.slice();
    analysis.allAlerts = allAlerts;
    analysis.alerts = allAlerts.filter(alert => !isFalsePositive(alert, analysis.rawHash));
    analysis.dismissedAlerts = allAlerts.filter(alert => isFalsePositive(alert, analysis.rawHash));
    analysis.dimensions = calculateDimensions(analysis.alerts, analysis.events);
    analysis.overall = analysis.events.length ? Math.round(DIMENSION_DEFS.reduce((sum, def) => sum + analysis.dimensions[def.key], 0) / DIMENSION_DEFS.length) : 0;
    analysis.counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    analysis.alerts.forEach(alert => { analysis.counts[alert.severity] += 1; });
    analysis.highQualityGate = analysis.events.length > 0 && analysis.overall >= 95 && analysis.counts.critical === 0 && analysis.counts.high === 0;
    return analysis;
  }

  function openManualDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB não está disponível neste navegador.'));
      const request = indexedDB.open(MANUAL_DB_NAME, MANUAL_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MANUAL_STORE)) db.createObjectStore(MANUAL_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha ao abrir a base de manuais.'));
    });
  }

  async function loadManualBrain() {
    try {
      const db = await openManualDatabase();
      manualBrain = await new Promise((resolve, reject) => {
        const tx = db.transaction(MANUAL_STORE, 'readonly');
        const request = tx.objectStore(MANUAL_STORE).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch (_) { manualBrain = []; }
    manualBrainReady = true;
    renderManualBrain();
    updateViewCounters();
    return manualBrain;
  }

  async function saveManualRecord(record) {
    const db = await openManualDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MANUAL_STORE, 'readwrite');
      tx.objectStore(MANUAL_STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function deleteManualRecord(id) {
    const db = await openManualDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MANUAL_STORE, 'readwrite');
      tx.objectStore(MANUAL_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function clearManualDatabase() {
    const db = await openManualDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MANUAL_STORE, 'readwrite');
      tx.objectStore(MANUAL_STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  function decodePdfLiteral(value) {
    return String(value || '').replace(/\\([nrtbf()\\])/g, (_, ch) => ({ n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', '(':'(', ')':')', '\\':'\\' }[ch] || ch))
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\\r?\n/g, '');
  }

  function extractPdfOperatorsText(streamText) {
    const pieces = [];
    const literal = /\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g;
    let match;
    while ((match = literal.exec(streamText))) pieces.push(decodePdfLiteral(match[1]));
    const arrays = /\[((?:.|\n|\r)*?)\]\s*TJ/g;
    while ((match = arrays.exec(streamText))) {
      const inner = match[1];
      const local = [];
      let part;
      const itemRe = /\(((?:\\.|[^\\)])*)\)/g;
      while ((part = itemRe.exec(inner))) local.push(decodePdfLiteral(part[1]));
      if (local.length) pieces.push(local.join(''));
    }
    const hex = /<([0-9A-Fa-f]{4,})>\s*Tj/g;
    while ((match = hex.exec(streamText))) {
      try {
        const bytes = new Uint8Array(match[1].match(/../g).map(v => parseInt(v, 16)));
        let text;
        if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
          text = '';
          for (let i = 2; i + 1 < bytes.length; i += 2) text += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
        } else text = new TextDecoder('latin1').decode(bytes);
        pieces.push(text);
      } catch (_) {}
    }
    return pieces.join('\n');
  }

  async function inflatePdfStream(bytes) {
    if (typeof DecompressionStream === 'undefined') return '';
    for (const format of ['deflate', 'deflate-raw']) {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
        const buffer = await new Response(stream).arrayBuffer();
        return new TextDecoder('latin1').decode(buffer);
      } catch (_) {}
    }
    return '';
  }

  async function extractPdfText(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = new TextDecoder('latin1').decode(bytes);
    const pieces = [];
    let cursor = 0;
    let processed = 0;
    while (processed < 2500) {
      const marker = raw.indexOf('stream', cursor);
      if (marker < 0) break;
      let start = marker + 6;
      if (raw[start] === '\r' && raw[start + 1] === '\n') start += 2;
      else if (raw[start] === '\n' || raw[start] === '\r') start += 1;
      const end = raw.indexOf('endstream', start);
      if (end < 0) break;
      const dictionary = raw.slice(Math.max(0, marker - 900), marker);
      let streamText = '';
      if (/\/FlateDecode/.test(dictionary)) streamText = await inflatePdfStream(bytes.slice(start, end));
      else streamText = new TextDecoder('latin1').decode(bytes.slice(start, end));
      if (streamText) {
        const extracted = extractPdfOperatorsText(streamText);
        if (extracted) pieces.push(extracted);
      }
      cursor = end + 9;
      processed += 1;
    }
    const metadata = [];
    const metaRe = /\(([^()\r\n]{25,500})\)/g;
    let meta;
    while ((meta = metaRe.exec(raw)) && metadata.length < 300) {
      const value = decodePdfLiteral(meta[1]);
      if (/[A-Za-zÀ-ÿ]{4}/.test(value)) metadata.push(value);
    }
    const text = cleanManualText([...pieces, ...metadata].join('\n'));
    const letters = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
    if (text.length < 300 || letters / Math.max(1, text.length) < 0.22) throw new Error('O PDF não possui texto extraível pelo leitor local. Exporte o manual para TXT ou use um PDF com camada de texto.');
    return text;
  }

  function cleanManualText(value) {
    return String(value || '').replace(/\u0000/g, '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  function chunkManualText(text) {
    const paragraphs = cleanManualText(text).split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
    const chunks = [];
    let buffer = '';
    for (const paragraph of paragraphs) {
      if ((buffer + '\n' + paragraph).length > 900 && buffer) {
        chunks.push(buffer);
        buffer = paragraph;
      } else buffer = buffer ? `${buffer}\n${paragraph}` : paragraph;
    }
    if (buffer) chunks.push(buffer);
    return chunks.slice(0, 1800).map((chunk, index) => ({ index, text: chunk.slice(0, 1200), normalized: normalizeSearchText(chunk) }));
  }

  function extractManualRules(text, manualName, manualId) {
    const known = new Set([...Object.keys(MESSAGE_SPECS), 'LAM', 'LRM', 'ACK', 'SBY']);
    const candidates = cleanManualText(text).split(/(?<=[.!?;])\s+|\n+/).filter(sentence => sentence.length >= 25 && sentence.length <= 900);
    const rules = [];
    const add = (trigger, expected, sentence, confidence) => {
      trigger = normalizeCode(trigger);
      expected = uniqueCodes(expected);
      if (!known.has(trigger) || !expected.length || expected.includes(trigger)) return;
      const key = `${trigger}>${expected.join('|')}`;
      if (rules.some(item => item.key === key)) return;
      rules.push({ id:`${manualId}:${hashText(key + sentence)}`, key, trigger, expected, within:8, requireInverse:expected.some(code => ['LAM','LRM','ACK','ACP','AOC'].includes(code)), confidence, source:manualName, snippet:sentence.slice(0, 420), enabled:true });
    };
    const pattern1 = /(?:APÓS|DEPOIS DE|AO RECEBER|AO ENVIAR|EM RESPOSTA A|QUANDO RECEBID[AO])[^A-Z0-9]{0,30}(?:A |O |UMA |UM )?([A-Z]{3,8})[\s\S]{0,220}?(?:ESPERA-SE|AGUARDA-SE|DEVE(?:RÁ)?|SERÁ|RESPONDE(?:RÁ)?|CONFIRMAD[AO] POR)[\s\S]{0,100}?\b([A-Z]{3,8})(?:\s*\/\s*([A-Z]{3,8}))?/gi;
    const pattern2 = /\b([A-Z]{3,8})\b[\s\S]{0,130}?(?:DEVE|DEVERÁ|ESPERA|AGUARDA|RECEBE|RETORNA|RESPONDE|CONFIRMA)[\s\S]{0,90}?\b(LAM|LRM|ACK|CRP|SBY|ACP|AOC|FPL|DEP|ARR)\b/gi;
    for (const sentence of candidates) {
      const upper = normalizeSearchText(sentence);
      let match;
      pattern1.lastIndex = 0;
      while ((match = pattern1.exec(upper))) add(match[1], [match[2], match[3]], sentence, 0.88);
      pattern2.lastIndex = 0;
      while ((match = pattern2.exec(upper))) add(match[1], [match[2]], sentence, 0.78);
      if (/FPVA/.test(upper) && /LAM/.test(upper)) add('FPVA', /LRM/.test(upper) ? ['LAM','LRM'] : ['LAM'], sentence, 0.95);
    }
    return rules.slice(0, 250);
  }

  async function extractManualFile(file) {
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    let text = '';
    if (extension === 'pdf' || file.type === 'application/pdf') text = await extractPdfText(file);
    else if (extension === 'json' || file.type === 'application/json') {
      const raw = await file.text();
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.manuals)) return { importedBrain: parsed.manuals };
        text = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      } catch (_) { text = raw; }
    } else text = await file.text();
    text = cleanManualText(text);
    if (text.length < 80) throw new Error('O arquivo não contém texto suficiente para indexação.');
    const id = `manual-${hashText(file.name + file.size + file.lastModified + text.slice(0, 500))}`;
    const chunks = chunkManualText(text);
    const rules = extractManualRules(text, file.name, id);
    return { id, name:file.name, type:file.type || extension || 'text/plain', size:file.size || text.length, addedAt:new Date().toISOString(), enabled:true, textLength:text.length, chunks, rules };
  }

  async function addManualFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (refs.manualProgress) { refs.manualProgress.hidden = false; refs.manualProgress.textContent = `Processando 0 de ${list.length} manual(is)...`; }
    let added = 0;
    const errors = [];
    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      if (refs.manualProgress) refs.manualProgress.textContent = `Processando ${index + 1} de ${list.length}: ${file.name}`;
      try {
        const record = await extractManualFile(file);
        if (record.importedBrain) {
          for (const imported of record.importedBrain) {
            if (!imported.id || !Array.isArray(imported.chunks)) continue;
            await saveManualRecord(imported);
            manualBrain = manualBrain.filter(item => item.id !== imported.id).concat(imported);
            added += 1;
          }
        } else {
          await saveManualRecord(record);
          manualBrain = manualBrain.filter(item => item.id !== record.id).concat(record);
          added += 1;
          addAudit('Manual adicionado', `${record.name} · ${record.chunks.length} trechos · ${record.rules.length} regras extraídas.`);
        }
      } catch (error) { errors.push(`${file.name}: ${error.message}`); }
    }
    if (refs.manualProgress) {
      refs.manualProgress.textContent = errors.length ? `Concluído com avisos: ${added} adicionado(s). ${errors.join(' | ')}` : `${added} manual(is) incorporado(s) ao cérebro da IA.`;
      window.setTimeout(() => { if (refs.manualProgress) refs.manualProgress.hidden = true; }, 6500);
    }
    renderManualBrain();
    updateViewCounters();
    if (currentAnalysis) analyzeCurrent({ skipAutoLearn:true });
    setStatus(errors.length ? `Manuais processados com ${errors.length} aviso(s).` : 'Manuais incorporados. A IA já usa a nova base documental.', errors.length ? 'warning' : 'success');
    if (refs.manualInput) refs.manualInput.value = '';
  }

  function enabledManualRules() {
    return [...BUILTIN_AI_MANUALS, ...manualBrain].filter(manual => manual.enabled !== false).flatMap(manual => (manual.rules || []).filter(rule => rule.enabled !== false && rule.confidence >= 0.75).map(rule => Object.assign({ manualId:manual.id, manualName:manual.name, builtin:manual.builtin === true }, rule)));
  }

  function validateManualRules(events, alerts, options) {
    if (options?.disableLearningRules || options?.disableManualRules || !manualBrainReady) return;
    const basePairs = new Set(RESPONSE_RULES.map(rule => `${rule.trigger}>${rule.expected.slice().sort().join('|')}`));
    for (const rule of enabledManualRules()) {
      const pair = `${rule.trigger}>${rule.expected.slice().sort().join('|')}`;
      const overlapsBase = RESPONSE_RULES.some(base => base.trigger === rule.trigger && base.expected.some(code => rule.expected.includes(code)));
      for (const event of events) {
        if (event.type !== rule.trigger) continue;
        const matcher = rule.requireInverse ? ((candidate, trigger) => isInverseResponse(trigger, candidate)) : null;
        const windowSize = rule.within || 8;
        const response = hasMessage(events, event.index, rule.expected, windowSize, matcher);
        if (response.found) continue;
        const laterResponse = findMessageAnywhereAfter(events, event.index, rule.expected, matcher);
        if (laterResponse.found) {
          createAlert(alerts, {
            ruleId:`DOC_${hashText(rule.id)}_${rule.trigger}_${rule.expected.join('_')}_LATE`,
            severity:'low', category:'timing', dimension:'timeliness', eventIndex:event.index,
            message:`${rule.trigger} recebeu ${laterResponse.event.type} fora da janela indicada pelo manual.`,
            evidence:`Gatilho no evento ${event.index + 1}; resposta correlacionada no evento ${laterResponse.index + 1}.`,
            cause:`A IA encontrou a resposta ao cruzar todo o histórico posterior, mas ela ocorreu além da janela de ${windowSize} eventos. Fonte: ${rule.manualName}.`,
            manualRuleId:rule.id,
            crossScan:{ from:event.index, to:laterResponse.index, found:true, late:true }
          });
          continue;
        }
        if (overlapsBase && alerts.some(alert => alert.eventIndex === event.index && (alert.category === 'sequence' || alert.category === 'timing') && alert.ruleId.startsWith('SEQ_'))) continue;
        createAlert(alerts, {
          ruleId:`DOC_${hashText(rule.id)}_${rule.trigger}_${rule.expected.join('_')}`,
          severity:'medium', category:'sequence', dimension:'integrity', eventIndex:event.index,
          message:`${rule.trigger} sem ${rule.expected.join('/')} conforme manual adicionado.`,
          evidence:`Evento ${event.index + 1}: ${facilityDisplay(event.originator)} → ${facilityDisplay(event.recipients)}; todos os ${Math.max(0, events.length - event.index - 1)} evento(s) posteriores foram verificados.`,
          cause:`Regra aprendida de ${rule.manualName}: ${rule.snippet}`,
          manualRuleId:rule.id,
          crossScan:{ from:event.index, to:events.length - 1, found:false, late:false }
        });
      }
    }
  }

  function manualCardMarkup(manual) {
    const rules = (manual.rules || []).filter(rule => rule.enabled !== false);
    return `<article class="ai-manual-card" data-manual-id="${escapeHtml(manual.id)}"><div class="ai-manual-icon">DOC</div><div class="ai-manual-copy"><h4>${escapeHtml(manual.name)}</h4><p>${manual.chunks?.length || 0} trechos indexados · ${rules.length} relações aprendidas · ${Math.max(1, Math.round((manual.size || 0)/1024))} KB</p><small>Adicionado em ${new Date(manual.addedAt).toLocaleString('pt-BR')}</small></div><div class="ai-manual-card-actions"><label><input type="checkbox" data-manual-toggle="${escapeHtml(manual.id)}" ${manual.enabled !== false ? 'checked' : ''}> Ativo</label><button type="button" data-manual-delete="${escapeHtml(manual.id)}">Remover</button></div></article>`;
  }

  function renderManualBrain() {
    if (!refs.manualList) return;
    const builtinEntryCount = builtinKnowledgeEntriesAI().length;
    const builtinChunkCount = BUILTIN_AI_MANUALS.reduce((sum,item)=>sum+(item.chunks?.length||0),0);
    const enabledRules = enabledManualRules();
    const protectedCards = `<article class="ai-manual-card builtin"><div class="ai-manual-icon">MCA</div><div class="ai-manual-copy"><h4>MCA 100-27/2025</h4><p>Definições, siglas, disposições gerais e terminologia ATM integradas ao programa.</p><small>Base interna protegida</small></div><span class="ai-manual-status">ATIVO</span></article><article class="ai-manual-card builtin"><div class="ai-manual-icon">CIR</div><div class="ai-manual-copy"><h4>CIRCEA 100-77/2017</h4><p>Mensagens, estados e fluxo TATIC–SAGITARIO usados para explicar os achados.</p><small>Base interna protegida</small></div><span class="ai-manual-status">ATIVO</span></article>${BUILTIN_AI_MANUALS.map(manual => `<article class="ai-manual-card builtin"><div class="ai-manual-icon">ACC</div><div class="ai-manual-copy"><h4>${escapeHtml(manual.name)}</h4><p>${manual.chunks?.length || 0} páginas transcritas · ${(manual.rules || []).length} relações operacionais · tipos de plano, protocolos e centros ATS.</p><small>Base interna protegida · PDF e transcrição incluídos no pacote</small></div><span class="ai-manual-status">ATIVO</span></article>`).join('')}`;
    refs.manualList.innerHTML = `${protectedCards}${manualBrain.length ? manualBrain.map(manualCardMarkup).join('') : '<div class="ai-empty-state">Nenhum manual adicional. Use “Selecionar manuais” para ampliar a base.</div>'}`;
    if (refs.learnedRuleList) refs.learnedRuleList.innerHTML = enabledRules.length ? enabledRules.map(rule => `<article class="ai-learned-rule"><strong>${escapeHtml(rule.trigger)} → ${escapeHtml(rule.expected.join(' / '))}</strong><span>${Math.round(rule.confidence*100)}% de confiança · ${escapeHtml(rule.manualName)}${rule.builtin ? ' · base protegida' : ''}</span><p>${escapeHtml(rule.snippet)}</p></article>`).join('') : '<div class="ai-empty-state">Nenhuma relação documental disponível.</div>';
    if (refs.brainStats) refs.brainStats.textContent = `${2 + BUILTIN_AI_MANUALS.length + manualBrain.length} manuais · ${builtinEntryCount + builtinChunkCount + manualBrain.reduce((sum,item)=>sum+(item.chunks?.length||0),0)} itens pesquisáveis · ${enabledRules.length} relações aprendidas`;
    refs.manualList.querySelectorAll('[data-manual-toggle]').forEach(input => input.addEventListener('change', async () => {
      const manual = manualBrain.find(item => item.id === input.dataset.manualToggle);
      if (!manual) return;
      manual.enabled = input.checked;
      await saveManualRecord(manual);
      renderManualBrain();
      if (currentAnalysis) analyzeCurrent({ skipAutoLearn:true });
    }));
    refs.manualList.querySelectorAll('[data-manual-delete]').forEach(button => button.addEventListener('click', async () => {
      const manual = manualBrain.find(item => item.id === button.dataset.manualDelete);
      if (!manual || !window.confirm(`Remover o manual “${manual.name}” do cérebro da IA?`)) return;
      await deleteManualRecord(manual.id);
      manualBrain = manualBrain.filter(item => item.id !== manual.id);
      addAudit('Manual removido', manual.name);
      renderManualBrain(); updateViewCounters();
      if (currentAnalysis) analyzeCurrent({ skipAutoLearn:true });
    }));
  }

  function renderManualSearch() {
    if (!refs.manualSearchResults) return;
    const query = refs.manualSearchInput?.value || '';
    if (!query.trim()) { refs.manualSearchResults.innerHTML = ''; return; }
    const custom = searchManualBrain(query, 10);
    const builtins = builtinKnowledgeEntriesAI().map(entry => {
      const haystack = normalizeSearchText([entry.code, entry.title, entry.short, entry.definition, entry.responses, entry.source].join(' '));
      const tokens = tokenizeQuery(query);
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 2 : 0), 0) + (tokens.some(token => normalizeCode(entry.code) === normalizeCode(token)) ? 8 : 0);
      return { entry, score };
    }).filter(item => item.score > 0).sort((a,b)=>b.score-a.score).slice(0,6);
    const rows = [];
    for (const item of builtins) rows.push(`<article class="ai-manual-result"><span>BASE INTERNA</span><strong>${escapeHtml(item.entry.code)} — ${escapeHtml(item.entry.title)}</strong><p>${escapeHtml((item.entry.responses || item.entry.short || item.entry.definition || '').slice(0,360))}</p><small>${escapeHtml(item.entry.source || 'MCA/CIRCEA integrada')}</small></article>`);
    for (const item of custom) rows.push(`<article class="ai-manual-result"><span>${item.manual.builtin ? 'BASE INTERNA TRANSCRITA' : 'MANUAL ADICIONADO'}</span><strong>${escapeHtml(item.manual.name)}</strong><p>${escapeHtml(item.chunk.text.slice(0,420))}</p><small>Relevância ${item.score}</small></article>`);
    refs.manualSearchResults.innerHTML = rows.length ? rows.join('') : '<div class="ai-empty-state">Nenhum trecho encontrado no cérebro normativo.</div>';
  }

  function exportBrain() {
    const payload = { product:'FlightFlow ATS - Cérebro normativo', version:AI_ENGINE_VERSION, exportedAt:new Date().toISOString(), embeddedManuals:BUILTIN_AI_MANUALS.map(item => ({ id:item.id, name:item.name, chunks:item.chunks, rules:item.rules, protected:true })), manuals:manualBrain };
    triggerTextDownload(JSON.stringify(payload, null, 2), `FlightFlow_Cerebro_Normativo_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    addAudit('Cérebro exportado', `${manualBrain.length} manual(is) adicional(is).`);
  }

  async function clearAddedManuals() {
    if (!manualBrain.length) return;
    if (!window.confirm('Remover todos os manuais adicionados? A MCA, a CIRCEA e a apresentação SAGITARIO ACC internas permanecerão disponíveis.')) return;
    await clearManualDatabase();
    manualBrain = [];
    addAudit('Manuais removidos', 'Todos os manuais adicionais foram apagados.');
    renderManualBrain(); updateViewCounters();
    if (currentAnalysis) analyzeCurrent({ skipAutoLearn:true });
  }

  function updateViewCounters() {
    const active = activeAlertsBase().length;
    const confirmed = confirmedForCurrent().length;
    const fp = falsePositivesForCurrent().length;
    if (refs.activeIssueCount) refs.activeIssueCount.textContent = String(active);
    if (refs.confirmedCount) refs.confirmedCount.textContent = String(confirmed);
    if (refs.falsePositiveCount) refs.falsePositiveCount.textContent = String(fp);
    if (refs.manualCount) refs.manualCount.textContent = String(2 + BUILTIN_AI_MANUALS.length + manualBrain.length);
    const tabCount = el('aiIssueCount');
    if (tabCount) tabCount.textContent = String(active);
  }

  function switchAIView(name) {
    activeAIView = name || 'errors';
    document.querySelectorAll('[data-ai-view]').forEach(button => {
      const active = button.dataset.aiView === activeAIView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-ai-view-panel]').forEach(panel => { panel.hidden = panel.dataset.aiViewPanel !== activeAIView; });
    if (activeAIView === 'confirmed') renderConfirmedErrors();
    if (activeAIView === 'falsepositives') renderFalsePositives();
    if (activeAIView === 'manuals') renderManualBrain();
  }

  function renderConfirmedErrors() {
    if (!refs.confirmedList) return;
    const records = confirmedForCurrent().slice().reverse();
    refs.confirmedList.innerHTML = records.length ? records.map(record => `<article class="ai-confirmed-card"><div><span>ERRO CONFIRMADO · ${escapeHtml(record.ruleId)}</span><h4>${escapeHtml(record.message)}</h4><p>${escapeHtml(record.evidence || 'Sem evidência registrada.')}</p><small>${record.eventIndex >= 0 ? `Evento ${record.eventIndex + 1} · ` : ''}${escapeHtml(CATEGORY_LABELS[record.category] || record.category || 'Achado')} · confirmado em ${new Date(record.at).toLocaleString('pt-BR')}</small></div><button type="button" data-ai-restore-confirmed="${escapeHtml(record.key)}">Restaurar para revisão</button></article>`).join('') : '<div class="ai-empty-state">Nenhum erro confirmado para este histórico.</div>';
    refs.confirmedList.querySelectorAll('[data-ai-restore-confirmed]').forEach(button => button.addEventListener('click', () => restoreConfirmedError(button.dataset.aiRestoreConfirmed)));
    updateViewCounters();
  }

  function restoreConfirmedError(key) {
    model.confirmedErrors = (model.confirmedErrors || []).filter(item => item.key !== key);
    saveModel();
    addAudit('Erro restaurado para revisão', key.split('|').slice(-1)[0]);
    switchAIView('errors');
    refreshVisibleAIReview('errors');
    setStatus('O erro confirmado voltou para a fila de Erros ativos.', 'success');
    queueAIReviewReanalysis('errors');
  }

  function clearConfirmedForCurrent() {
    const hash = currentAnalysis?.rawHash;
    if (!hash) return;
    model.confirmedErrors = (model.confirmedErrors || []).filter(item => item.sourceHash !== hash);
    saveModel();
    addAudit('Confirmações restauradas', 'Todos os erros confirmados deste histórico voltaram para revisão.');
    switchAIView('errors');
    refreshVisibleAIReview('errors');
    setStatus('Todos os erros confirmados deste histórico voltaram para revisão.', 'success');
    queueAIReviewReanalysis('errors');
  }

  function renderFalsePositives() {
    if (!refs.falsePositiveList) return;
    const records = falsePositivesForCurrent().slice().reverse();
    refs.falsePositiveList.innerHTML = records.length ? records.map(record => `<article class="ai-false-positive-card"><div><span>FALSO POSITIVO · ${escapeHtml(record.ruleId)}</span><h4>${escapeHtml(record.message)}</h4><p>${escapeHtml(record.evidence || 'Sem evidência registrada.')}</p><small>${record.eventIndex >= 0 ? `Evento ${record.eventIndex + 1} · ` : ''}${new Date(record.at).toLocaleString('pt-BR')}</small></div><button type="button" data-ai-restore-fp="${escapeHtml(record.key)}">Restaurar como erro</button></article>`).join('') : '<div class="ai-empty-state">Nenhum falso positivo registrado para este histórico.</div>';
    refs.falsePositiveList.querySelectorAll('[data-ai-restore-fp]').forEach(button => button.addEventListener('click', () => restoreFalsePositive(button.dataset.aiRestoreFp)));
    updateViewCounters();
  }

  function restoreFalsePositive(key) {
    model.falsePositives = (model.falsePositives || []).filter(item => item.key !== key);
    saveModel();
    addAudit('Falso positivo restaurado', key.split('|').slice(-1)[0]);
    switchAIView('errors');
    refreshVisibleAIReview('errors');
    setStatus('O achado voltou para a lista de erros ativos.', 'success');
    queueAIReviewReanalysis('errors');
  }

  function clearFalsePositivesForCurrent() {
    const hash = currentAnalysis?.rawHash;
    if (!hash) return;
    model.falsePositives = (model.falsePositives || []).filter(item => item.sourceHash !== hash);
    saveModel();
    switchAIView('errors');
    refreshVisibleAIReview('errors');
    setStatus('Os falsos positivos deste histórico foram restaurados como erros ativos.', 'success');
    queueAIReviewReanalysis('errors');
  }

  function toggleAIFocus() {
    aiFocusMode = !aiFocusMode;
    const content = document.querySelector('.content');
    content?.classList.toggle('ai-focus-mode', aiFocusMode);
    refs.focus?.setAttribute('aria-pressed', aiFocusMode ? 'true' : 'false');
    if (refs.focus) refs.focus.textContent = aiFocusMode ? 'Restaurar mapa e IA' : 'Ampliar área da IA';
  }

  let aiReviewRefreshFrame = 0;

  function safeRenderAIStep(label, renderer) {
    try {
      renderer();
      return true;
    } catch (error) {
      console.error(`[FlightFlow IA] Falha ao atualizar ${label}:`, error);
      return false;
    }
  }

  function refreshVisibleAIReview(view = activeAIView) {
    safeRenderAIStep('contadores da revisão', updateViewCounters);
    if (view === 'errors') safeRenderAIStep('erros ativos', renderAlerts);
    if (view === 'confirmed') safeRenderAIStep('erros confirmados', renderConfirmedErrors);
    if (view === 'falsepositives') safeRenderAIStep('falsos positivos', renderFalsePositives);
    if (view === 'manuals') safeRenderAIStep('cérebro normativo', renderManualBrain);
    const panel = document.querySelector(`[data-ai-view-panel="${view}"]`);
    if (panel) void panel.offsetHeight;
  }

  function queueAIReviewReanalysis(view = activeAIView) {
    if (aiReviewRefreshFrame) window.cancelAnimationFrame(aiReviewRefreshFrame);
    aiReviewRefreshFrame = window.requestAnimationFrame(() => {
      aiReviewRefreshFrame = 0;
      refreshVisibleAIReview(view);
      window.setTimeout(() => {
        try {
          const raw = getRawHistory();
          if (raw) {
            currentAnalysis = applyFalsePositiveMask(analyzeRaw(raw));
            currentSourceHash = currentAnalysis.rawHash;
          }
          renderAllAI({ view });
        } catch (error) {
          console.error('[FlightFlow IA] Falha na atualização posterior da revisão:', error);
          refreshVisibleAIReview(view);
        }
      }, 0);
    });
  }

  function renderAllAI(options = {}) {
    const view = options.view || activeAIView;

    // A revisão humana é atualizada primeiro. Assim, confirmar/restaurar um
    // achado continua visível mesmo que um painel secundário apresente falha.
    safeRenderAIStep('contadores da revisão', updateViewCounters);
    safeRenderAIStep('erros ativos', renderAlerts);
    safeRenderAIStep('erros confirmados', renderConfirmedErrors);
    safeRenderAIStep('falsos positivos', renderFalsePositives);
    safeRenderAIStep('aba de revisão', () => switchAIView(view));

    safeRenderAIStep('resumo', renderSummary);
    safeRenderAIStep('dimensões', renderDimensions);
    safeRenderAIStep('leitura geral', renderAIInsights);
    safeRenderAIStep('previsões', renderPredictions);
    safeRenderAIStep('diagnóstico por evento', renderEventDiagnostics);
    safeRenderAIStep('padrões', renderPatterns);
    safeRenderAIStep('rastreabilidade', () => renderLineage(sourceName()));
    safeRenderAIStep('contadores finais', updateViewCounters);
  }

  function adjustedSeverity(ruleId, severity) {
    const feedback = model.feedback[ruleId] || { confirmed: 0, rejected: 0 };
    let level = SEVERITY_ORDER[severity] == null ? 1 : SEVERITY_ORDER[severity];
    if (feedback.rejected >= 3 && feedback.rejected >= feedback.confirmed * 2) level = Math.max(0, level - 1);
    if (feedback.confirmed >= 4 && feedback.confirmed > feedback.rejected * 2) level = Math.min(4, level + 1);
    return Object.keys(SEVERITY_ORDER).find(key => SEVERITY_ORDER[key] === level) || severity;
  }

  function createAlert(alerts, data) {
    const severity = adjustedSeverity(data.ruleId, data.severity || 'medium');
    const eventIndex = Number.isInteger(data.eventIndex) ? data.eventIndex : -1;
    const signature = `${data.ruleId}|${eventIndex}|${data.message || ''}|${data.evidence || ''}`;
    alerts.push(Object.assign({}, data, {
      severity,
      eventIndex,
      id: `${data.ruleId}:${eventIndex}:${hashText(signature)}`,
      category: data.category || 'quality',
      dimension: data.dimension || 'validity'
    }));
  }

  function hasMessage(events, startIndex, expectedTokens, within, matcher) {
    const safeWithin = Number.isFinite(within) ? Math.max(0, within) : 0;
    const end = Math.min(events.length, startIndex + safeWithin + 1);
    const triggerEvent = events[startIndex];
    for (let i = startIndex + 1; i < end; i += 1) {
      const event = events[i];
      const token = event.type === 'ACK' && event.relatedType ? `ACK:${event.relatedType}` : event.type;
      const typeMatches = expectedTokens.includes(token) || expectedTokens.includes(event.type);
      if (!typeMatches) continue;
      if (typeof matcher === 'function' && !matcher(event, triggerEvent)) continue;
      return { found: true, index: i, event, searchedUntil: end - 1 };
    }
    return { found: false, index: -1, event: null, searchedUntil: end - 1 };
  }

  function findMessageAnywhereAfter(events, startIndex, expectedTokens, matcher) {
    return hasMessage(events, startIndex, expectedTokens, Math.max(0, events.length - startIndex - 1), matcher);
  }

  function lowerSeverity(severity) {
    const order = ['info','low','medium','high','critical'];
    const index = Math.max(0, order.indexOf(severity));
    return order[Math.max(1, index - 1)] || 'low';
  }

  function responseDelayDescription(triggerEvent, responseEvent, eventDistance, normalWindow) {
    const triggerTime = eventAbsoluteTime(triggerEvent);
    const responseTime = eventAbsoluteTime(responseEvent);
    const elapsed = triggerTime != null && responseTime != null && responseTime >= triggerTime ? ` · intervalo ${formatDuration(responseTime - triggerTime)}` : '';
    return `${eventDistance} evento(s) depois, ${Math.max(1, eventDistance - normalWindow)} além da janela configurada${elapsed}`;
  }

  function validateDirections(events, alerts) {
    for (const event of events) {
      if (!event.type) continue;
      const fromRole = roleOf(event.originator), toRole = roleOf(event.recipients);
      if (event.type === 'CRQ' && !(event.direction === 'received' && fromRole === 'TWR' && toRole === 'ACC')) {
        createAlert(alerts, { ruleId: 'DIR_CRQ', severity: 'high', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: 'Direção inesperada para CRQ.', evidence: `${event.direction}: ${event.originator || '—'} (${fromRole}) → ${event.recipients || '—'} (${toRole})`,
          cause: 'CRQ é esperado da TWR para o ACC.' });
      }
      if (event.type === 'CRP' && !(event.direction === 'sent' && fromRole === 'ACC' && toRole === 'TWR')) {
        createAlert(alerts, { ruleId: 'DIR_CRP', severity: 'high', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: 'Direção inesperada para CRP.', evidence: `${event.direction}: ${event.originator || '—'} (${fromRole}) → ${event.recipients || '—'} (${toRole})`,
          cause: 'CRP é esperado do ACC para a TWR; cópias para outros órgãos devem ser INF/MSGTYP CRP.' });
      }
      if (event.type === 'SBY' && !(event.direction === 'sent' && fromRole === 'ACC' && toRole === 'TWR')) {
        createAlert(alerts, { ruleId: 'DIR_SBY', severity: 'medium', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: 'Direção inesperada para SBY.', evidence: `${event.originator || '—'} → ${event.recipients || '—'}`, cause: 'SBY responde temporariamente a uma CRQ da TWR.' });
      }
      if (event.type === 'PAC' && !(event.direction === 'received' && fromRole === 'TWR' && toRole === 'ACC')) {
        createAlert(alerts, { ruleId: 'DIR_PAC', severity: 'medium', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: 'Direção inesperada para PAC.', evidence: `${event.direction}: ${event.originator || '—'} → ${event.recipients || '—'}`, cause: 'No fluxo analisado, PAC é recebido da TWR pelo ACC.' });
      }
      if (event.type === 'RQP' && !(event.direction === 'received' && ['TWR','SIGMA'].includes(fromRole) && toRole === 'ACC')) {
        createAlert(alerts, { ruleId: 'DIR_RQP', severity: 'medium', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: 'Direção inesperada para RQP.', evidence: `${event.direction}: ${event.originator || '—'} (${fromRole}) → ${event.recipients || '—'} (${toRole})`, cause: 'A apresentação SAGITARIO ACC descreve RQP da TWR/TATIC para o ACC; integrações específicas também podem requisitar reenvio a partir do SIGMA.' });
      }
      if ((['FPVD','FPVA','FPVS'].includes(event.type)) && event.direction !== 'sent') {
        createAlert(alerts, { ruleId: `DIR_${event.type}`, severity: 'medium', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: `${event.type} aparece como recebida/interna.`, evidence: event.operation, cause: 'FPVD/FPVA/FPVS são esperadas como distribuição do ACC para APP/TWR, conforme a finalidade de partida, chegada ou sobrevoo.' });
      }
      if (event.type === 'FPVS' && !(event.direction === 'sent' && fromRole === 'ACC' && toRole === 'APP')) {
        createAlert(alerts, { ruleId: 'DIR_FPVS_ACC_APP', severity: 'medium', category: 'direction', dimension: 'reasonableness', eventIndex: event.index,
          message: 'FPVS fora do fluxo ACC → APP.', evidence: `${event.direction}: ${event.originator || '—'} (${fromRole}) → ${event.recipients || '—'} (${toRole})`, cause: 'Regra operacional cadastrada: FPVS é a notificação do ACC para o APP de sobrevoo de aeronave.' });
      }
    }
  }

  function validateRequiredFields(events, alerts) {
    for (const event of events) {
      if (!event.type || !MESSAGE_SPECS[event.type]) continue;
      const spec = MESSAGE_SPECS[event.type];
      const missing = spec.required.filter(field => !event[field]);
      if (event.type === 'PAC' && !event.groundMarkers.length) missing.push('groundMarker');
      if (!missing.length) continue;
      const names = missing.map(field => field === 'groundMarker' ? 'CLG/PBG/TXC/DCDT' : (BASE_REQUIRED_FIELDS[field] || field));
      const coreMissing = missing.some(field => ['callsign', 'adep', 'ades', 'originator', 'recipients'].includes(field));
      createAlert(alerts, {
        ruleId: `REQ_${event.type}_${missing.join('_').toUpperCase()}`,
        severity: coreMissing ? 'high' : 'medium', category: 'syntax', dimension: 'completeness', eventIndex: event.index,
        message: `${event.type}: campos esperados não encontrados.`,
        evidence: `Ausentes: ${names.join(', ')}`,
        cause: 'Mensagem incompleta, parser sem campo reconhecível ou variação de formato ainda não cadastrada.'
      });
    }
  }

  function validateFormats(events, alerts) {
    for (const event of events) {
      if (event.eobt && !isValidHHMM(event.eobt)) {
        createAlert(alerts, { ruleId: 'FMT_EOBT', severity: 'critical', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'EOBT fora do domínio HHMM.', evidence: `EOBT=${event.eobt}`, cause: 'Hora deve ter quatro dígitos, horas 00-23 e minutos 00-59.' });
      }
      if (event.depTime && !isValidHHMM(event.depTime)) {
        createAlert(alerts, { ruleId: 'FMT_DEPTIME', severity: 'critical', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'Hora de decolagem inválida.', evidence: `DEP=${event.depTime}`, cause: 'Hora deve obedecer ao domínio HHMM.' });
      }
      if (event.dof && !isValidDof(event.dof)) {
        createAlert(alerts, { ruleId: 'FMT_DOF', severity: 'critical', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'DOF/EOBD inválido.', evidence: `DOF=${event.dof}`, cause: 'Data esperada no formato YYMMDD e deve representar uma data existente.' });
      }
      if (event.adep && !/^[A-Z]{4}$/.test(event.adep)) {
        createAlert(alerts, { ruleId: 'FMT_ADEP', severity: 'high', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'ADEP fora do formato esperado.', evidence: `ADEP=${event.adep}`, cause: 'Designador ICAO normalmente possui quatro letras.' });
      }
      if (event.ades && !/^[A-Z]{4}$/.test(event.ades)) {
        createAlert(alerts, { ruleId: 'FMT_ADES', severity: 'high', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'ADES fora do formato esperado.', evidence: `ADES=${event.ades}`, cause: 'Designador ICAO normalmente possui quatro letras.' });
      }
      if (event.idPlano && !/^[A-Z0-9]{7,8}$/.test(event.idPlano)) {
        createAlert(alerts, { ruleId: 'FMT_IDPLANO', severity: 'high', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'IDPLANO fora do padrão de 7 ou 8 caracteres.', evidence: `IDPLANO=${event.idPlano}`, cause: 'O fluxo modelado admite ID inicial de 7 caracteres e ID consolidado de 8.' });
      }
      if (event.ssr && !/^[0-7]{4}$/.test(event.ssr)) {
        createAlert(alerts, { ruleId: 'FMT_SSR', severity: 'high', category: 'syntax', dimension: 'validity', eventIndex: event.index,
          message: 'Código SSR fora do domínio octal.', evidence: `SSR=${event.ssr}`, cause: 'Os quatro dígitos do SSR devem estar entre 0 e 7.' });
      }
    }
  }

  function validateSequence(events, alerts) {
    for (const rule of RESPONSE_RULES) {
      for (const event of events) {
        if (event.type !== rule.trigger) continue;
        if (rule.when && !rule.when(event)) continue;
        const windowSize = rule.within || 8;
        const matcher = rule.requireInverse ? ((candidate, trigger) => isInverseResponse(trigger, candidate)) : null;
        const response = hasMessage(events, event.index, rule.expected, windowSize, matcher);
        if (response.found) continue;

        /* Segunda passagem: cruza o gatilho com TODOS os eventos posteriores.
           Assim, uma LAM/LRM tardia não é tratada como totalmente ausente. */
        const laterResponse = findMessageAnywhereAfter(events, event.index, rule.expected, matcher);
        const expectedFlow = rule.requireInverse
          ? `${rule.expected.join(' ou ')} de ${facilityDisplay(event.recipients)} → ${facilityDisplay(event.originator)}`
          : rule.expected.join(' ou ');

        if (laterResponse.found) {
          const eventDistance = laterResponse.index - event.index;
          const delay = responseDelayDescription(event, laterResponse.event, eventDistance, windowSize);
          createAlert(alerts, {
            ruleId: `${rule.id}_LATE`, severity: lowerSeverity(rule.severity), category: 'timing', dimension: 'timeliness', eventIndex: event.index,
            message: `${event.type} teve confirmação/resposta localizada somente mais adiante no histórico.`,
            evidence: `${event.type} no evento ${event.index + 1}: ${facilityDisplay(event.originator)} → ${facilityDisplay(event.recipients)}; ${laterResponse.event.type} correspondente no evento ${laterResponse.index + 1} (${delay}).`,
            cause: `A IA cruzou todos os eventos posteriores e encontrou ${laterResponse.event.type} com o fluxo correto. A resposta existe, porém ocorreu fora da janela operacional de ${windowSize} eventos.`,
            crossScan: { from:event.index, to:laterResponse.index, found:true, late:true }
          });
          continue;
        }

        const uncorrelatedAnywhere = rule.requireInverse ? findMessageAnywhereAfter(events, event.index, rule.expected) : null;
        let cause = `A IA verificou todos os eventos posteriores, do evento ${event.index + 2} ao ${events.length}, e não encontrou resposta compatível. Pode haver histórico truncado, falha de comunicação ou regra de integração divergente.`;
        if (uncorrelatedAnywhere && uncorrelatedAnywhere.found) {
          cause = `${uncorrelatedAnywhere.event.type} foi localizado no evento ${uncorrelatedAnywhere.index + 1}, porém no fluxo ${facilityDisplay(uncorrelatedAnywhere.event.originator)} → ${facilityDisplay(uncorrelatedAnywhere.event.recipients)}. A IA examinou todo o restante do histórico e não encontrou ${expectedFlow}.`;
        }
        createAlert(alerts, {
          ruleId: rule.id, severity: rule.severity, category: 'sequence', dimension: 'integrity', eventIndex: event.index,
          message: rule.text,
          evidence: `${event.type} no evento ${event.index + 1}: ${facilityDisplay(event.originator)} → ${facilityDisplay(event.recipients)}; resposta esperada: ${expectedFlow}. Varredura posterior: eventos ${Math.min(events.length, event.index + 2)} a ${events.length}.`,
          cause,
          crossScan: { from:event.index, to:events.length - 1, found:false, late:false }
        });
      }
    }

    for (const event of events) {
      if (event.type === 'DEP') {
        const priorActive = events.slice(0, event.index + 1).some(e => e.status === 'ATV' || /Decolagem|Correlação/i.test(e.operation));
        if (!priorActive) {
          createAlert(alerts, { ruleId: 'SEQ_DEP_BEFORE_ACTIVE', severity: 'high', category: 'sequence', dimension: 'reasonableness', eventIndex: event.index,
            message: 'DEP surgiu antes de ativação/decolagem reconhecida.', evidence: `Estado do evento: ${event.status || 'não informado'}`, cause: 'Ordem operacional incompatível ou eventos anteriores ausentes no histórico.' });
        }
      }
      if (event.type === 'ARR') {
        const priorActive = events.slice(0, event.index).some(e => e.status === 'ATV' || e.type === 'DEP');
        if (!priorActive) {
          createAlert(alerts, { ruleId: 'SEQ_ARR_WITHOUT_FLIGHT', severity: 'medium', category: 'sequence', dimension: 'reasonableness', eventIndex: event.index,
            message: 'ARR sem DEP/estado ativo anterior reconhecido.', evidence: `Evento ${event.index + 1}`, cause: 'Histórico incompleto ou mensagem fora da sequência esperada.' });
        }
      }
      if (event.type === 'CNL') {
        const incompatible = events.slice(event.index + 1).find(e => ['DEP', 'ARR', 'CRQ', 'CRP', 'PAC'].includes(e.type) && !/reativa/i.test(e.operation));
        if (incompatible) {
          createAlert(alerts, { ruleId: 'SEQ_AFTER_CNL', severity: 'high', category: 'sequence', dimension: 'consistency', eventIndex: incompatible.index,
            message: 'Evento operacional posterior ao cancelamento.', evidence: `${incompatible.type} após CNL`, cause: 'Cancelamento não aplicado, plano reativado sem registro ou históricos misturados.' });
        }
      }
    }
  }

  function validateChronologyAndStatus(events, alerts) {
    const statusRank = { INA: 0, PRE: 1, ATV: 2, TER: 3, ARQ: 4, CNL: 4 };
    let previousAbsolute = null;
    let previousStatus = null;
    for (const event of events) {
      if (event.dateKey && event.secondsOfDay != null) {
        const absolute = Date.parse(`${event.dateKey}T00:00:00Z`) / 1000 + event.secondsOfDay;
        if (previousAbsolute != null && absolute < previousAbsolute) {
          createAlert(alerts, { ruleId: 'TIME_REGRESSION', severity: 'high', category: 'timing', dimension: 'timeliness', eventIndex: event.index,
            message: 'Ordem cronológica regressiva.', evidence: `${event.dateText} ${event.timeText}`, cause: 'Eventos fora de ordem, relógio divergente ou arquivos concatenados incorretamente.' });
        }
        previousAbsolute = Math.max(previousAbsolute == null ? absolute : previousAbsolute, absolute);
      }
      if (event.status && statusRank[event.status] != null) {
        if (previousStatus && statusRank[event.status] < statusRank[previousStatus] && !/reativa|retorno|reabertura/i.test(event.operation)) {
          createAlert(alerts, { ruleId: 'STATUS_REGRESSION', severity: 'high', category: 'sequence', dimension: 'consistency', eventIndex: event.index,
            message: 'Regressão inesperada de estado do plano.', evidence: `${previousStatus} → ${event.status}`, cause: 'Transição inválida, evento ausente ou reativação não identificada.' });
        }
        previousStatus = event.status;
      }
    }
  }

  function validateCrossEventConsistency(events, alerts) {
    const keys = [
      ['callsign', 'indicativo'], ['adep', 'ADEP'], ['ades', 'ADES'], ['dof', 'DOF']
    ];
    for (const [key, label] of keys) {
      const values = new Map();
      for (const event of events) {
        if (event[key]) {
          if (!values.has(event[key])) values.set(event[key], []);
          values.get(event[key]).push(event.index);
        }
      }
      if (values.size > 1) {
        const evidence = Array.from(values.entries()).map(([value, indexes]) => `${value} (eventos ${indexes.map(i => i + 1).join(', ')})`).join(' · ');
        createAlert(alerts, { ruleId: `CONSIST_${key.toUpperCase()}`, severity: key === 'callsign' || key === 'adep' || key === 'ades' ? 'high' : 'medium',
          category: 'integrity', dimension: 'consistency', eventIndex: Math.min(...Array.from(values.values()).flat()),
          message: `Mais de um ${label} no mesmo histórico.`, evidence, cause: 'Históricos misturados, alteração indevida ou extração incorreta.' });
      }
    }

    const ids = events.filter(e => e.idPlano).map(e => ({ id: e.idPlano, index: e.index, status: e.status, recipients: e.recipients }));
    const uniqueIds = Array.from(new Set(ids.map(v => v.id)));
    if (uniqueIds.length > 1) {
      const compatible = uniqueIds.length === 2 && uniqueIds.some(v => v.length === 7) && uniqueIds.some(v => v.length === 8) && uniqueIds.find(v => v.length === 8).startsWith(uniqueIds.find(v => v.length === 7));
      if (!compatible) {
        createAlert(alerts, { ruleId: 'CONSIST_IDPLANO', severity: 'high', category: 'integrity', dimension: 'integrity', eventIndex: ids[0].index,
          message: 'IDPLANO muda sem relação de 7 → 8 caracteres.', evidence: uniqueIds.join(' → '), cause: 'Possível mistura de planos, ID incorreto ou atualização não rastreável.' });
      }
    }
    for (const item of ids) {
      const sentToOperational = ['APP', 'TWR'].includes(roleOf(item.recipients));
      if ((item.status === 'PRE' || item.status === 'ATV' || sentToOperational) && item.id.length === 7) {
        createAlert(alerts, { ruleId: 'IDPLANO_7_AFTER_PRE', severity: 'high', category: 'integrity', dimension: 'currency', eventIndex: item.index,
          message: 'IDPLANO de 7 caracteres usado após pré-ativação/distribuição operacional.', evidence: `${item.id} · estado ${item.status || '—'} · destino ${item.recipients || '—'}`, cause: 'O oitavo caractere consolidado ainda não foi aplicado ou a mensagem usa versão desatualizada do plano.' });
      }
    }
  }

  function validateDuplicates(events, alerts) {
    const seen = new Map();
    for (const event of events) {
      if (!event.type || !event.content) continue;
      const fingerprint = hashText(`${event.type}|${event.originator}|${event.recipients}|${event.content.replace(/\s+/g, ' ').trim()}`);
      if (seen.has(fingerprint)) {
        const first = seen.get(fingerprint);
        const hasRequestBetween = events.slice(first.index + 1, event.index).some(e => ['RQP', 'REJ'].includes(e.type));
        if (!hasRequestBetween) {
          createAlert(alerts, { ruleId: 'DUP_EXACT_MESSAGE', severity: 'low', category: 'duplicate', dimension: 'uniqueness', eventIndex: event.index,
            message: 'Mensagem idêntica repetida.', evidence: `${event.type}: eventos ${first.index + 1} e ${event.index + 1}`, cause: 'Retransmissão, duplicidade de processamento ou ausência de confirmação.' });
        }
      } else seen.set(fingerprint, event);
    }
  }

  function validateLamReferences(events, alerts) {
    for (const event of events) {
      if (event.type !== 'LAM') continue;
      if (!event.msgRef) continue;
      const fromAddress = normalizeCode(event.originator);
      const toAddress = normalizeCode(event.recipients);
      const fromRole = roleOf(fromAddress), toRole = roleOf(toAddress);
      const prior = events.slice(0, event.index).reverse().find(candidate => {
        if (candidate.type === 'LAM') return false;
        const candidateFrom = normalizeCode(candidate.originator);
        const candidateTo = normalize(candidate.recipients).toUpperCase();
        const exactInverse = candidateFrom === toAddress && candidateTo.includes(fromAddress);
        const roleInverse = roleOf(candidateFrom) === toRole && roleOf(candidateTo) === fromRole;
        return exactInverse || roleInverse;
      });
      if (!prior) {
        createAlert(alerts, { ruleId: 'LAM_ORPHAN', severity: 'medium', category: 'integrity', dimension: 'integrity', eventIndex: event.index,
          message: 'LAM sem mensagem anterior correlacionável no sentido inverso.', evidence: `${event.originator || '—'} → ${event.recipients || '—'}`, cause: 'Histórico truncado, MSGREF incorreto ou confirmação órfã.' });
      }
    }
  }

  function validateLearnedPatterns(events, alerts, options) {
    if (options && options.disableLearningRules) return;
    if (model.historiesApproved < 3) return;
    let previousMessage = null;
    for (const event of events) {
      if (!event.type) continue;
      const directionKey = `${event.type}|${event.direction}|${roleOf(event.originator)}>${roleOf(event.recipients)}`;
      const totalForType = Object.entries(model.directionCounts).filter(([key]) => key.startsWith(`${event.type}|`)).reduce((sum, [, count]) => sum + count, 0);
      if (totalForType >= 5 && !model.directionCounts[directionKey]) {
        createAlert(alerts, { ruleId: `LEARN_DIR_${event.type}`, severity: 'low', category: 'learned', dimension: 'reasonableness', eventIndex: event.index,
          message: 'Direção ainda não observada nos históricos validados.', evidence: directionKey, cause: 'Novo cenário legítimo ou padrão atípico que merece validação humana.' });
      }
      if (previousMessage) {
        const transitionKey = `${previousMessage.type}>${event.type}`;
        const totalAfterPrevious = Object.entries(model.transitionCounts).filter(([key]) => key.startsWith(`${previousMessage.type}>`)).reduce((sum, [, count]) => sum + count, 0);
        if (totalAfterPrevious >= 6 && !model.transitionCounts[transitionKey]) {
          createAlert(alerts, { ruleId: `LEARN_TRANS_${previousMessage.type}_${event.type}`, severity: 'low', category: 'learned', dimension: 'reasonableness', eventIndex: event.index,
            message: 'Transição rara em relação ao padrão validado.', evidence: transitionKey, cause: 'Sequência nova, histórico incompleto ou alteração de configuração operacional.' });
        }
      }
      const stats = model.fieldStats[event.type] || {};
      for (const [field, data] of Object.entries(stats)) {
        if (data.total >= 5 && data.present / data.total >= 0.95 && !event[field]) {
          createAlert(alerts, { ruleId: `LEARN_FIELD_${event.type}_${field.toUpperCase()}`, severity: 'low', category: 'learned', dimension: 'completeness', eventIndex: event.index,
            message: `Campo normalmente presente nos padrões validados: ${BASE_REQUIRED_FIELDS[field] || field}.`, evidence: `${event.type}: presença histórica ${Math.round(data.present / data.total * 100)}%`, cause: 'Variação de formato ou dado ausente.' });
        }
      }
      previousMessage = event;
    }
  }

  function calculateDimensions(alerts, events) {
    const scores = {};
    DIMENSION_DEFS.forEach(def => { scores[def.key] = 100; });
    const penalties = { critical: 25, high: 13, medium: 6, low: 2, info: 0 };
    for (const alert of alerts) {
      const key = scores[alert.dimension] == null ? 'validity' : alert.dimension;
      scores[key] = Math.max(0, scores[key] - penalties[alert.severity]);
    }
    const knownMessageRatio = events.length ? events.filter(e => e.type && MESSAGE_SPECS[e.type]).length / events.length : 0;
    if (events.length && knownMessageRatio < 0.75) scores.validity = Math.max(0, scores.validity - Math.round((0.75 - knownMessageRatio) * 30));
    if (!events.length) DIMENSION_DEFS.forEach(def => { scores[def.key] = 0; });
    scores.accuracy = Math.min(scores.accuracy, Math.round((scores.consistency + scores.integrity + scores.validity) / 3));
    scores.currency = Math.min(scores.currency, Math.round((scores.consistency + scores.timeliness) / 2));
    return scores;
  }

  function analyzeRaw(rawText, options = {}) {
    const parsed = parseHistory(rawText);
    const alerts = [];
    const events = parsed.events;
    if (!events.length) {
      createAlert(alerts, { ruleId: 'NO_EVENTS', severity: 'critical', category: 'syntax', dimension: 'completeness', eventIndex: -1,
        message: 'Nenhum bloco de OPERAÇÃO foi reconhecido.', evidence: 'O separador ou o cabeçalho do histórico não corresponde ao formato esperado.', cause: 'Arquivo incorreto, texto incompleto ou variação de relatório ainda não cadastrada.' });
    } else {
      validateRequiredFields(events, alerts);
      validateFormats(events, alerts);
      validateDirections(events, alerts);
      validateSequence(events, alerts);
      validateChronologyAndStatus(events, alerts);
      validateCrossEventConsistency(events, alerts);
      validateDuplicates(events, alerts);
      validateLamReferences(events, alerts);
      validateLearnedPatterns(events, alerts, options);
      validateManualRules(events, alerts, options);
    }

    alerts.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || a.eventIndex - b.eventIndex);
    const dimensions = calculateDimensions(alerts, events);
    const overall = events.length ? Math.round(DIMENSION_DEFS.reduce((sum, def) => sum + dimensions[def.key], 0) / DIMENSION_DEFS.length) : 0;
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    alerts.forEach(alert => { counts[alert.severity] += 1; });
    const recognized = events.filter(e => e.type && MESSAGE_SPECS[e.type]).length;
    const unknown = events.filter(e => e.direction !== 'internal' && !MESSAGE_SPECS[e.type]).length;
    return {
      engineVersion: AI_ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      rawHash: hashText(parsed.raw),
      events,
      alerts,
      dimensions,
      overall,
      counts,
      recognized,
      unknown,
      messageEvents: events.filter(e => e.type).length,
      highQualityGate: events.length > 0 && overall >= 95 && counts.critical === 0 && counts.high === 0
    };
  }

  function incrementCounter(obj, key, amount = 1) {
    if (!key) return;
    obj[key] = (obj[key] || 0) + amount;
  }

  function updateRunningStat(container, key, value) {
    if (!Number.isFinite(value)) return;
    const stat = container[key] || { count: 0, mean: 0, m2: 0, min: value, max: value };
    stat.count += 1;
    const delta = value - stat.mean;
    stat.mean += delta / stat.count;
    stat.m2 += delta * (value - stat.mean);
    stat.min = Math.min(stat.min, value);
    stat.max = Math.max(stat.max, value);
    container[key] = stat;
  }

  function trainFromAnalysis(analysis, sourceName, mode) {
    if (!analysis || !analysis.events.length) return false;
    const already = model.sources.some(source => source.hash === analysis.rawHash && source.approved);
    if (already) {
      setStatus('Este histórico já faz parte da base validada.', 'warning');
      return false;
    }
    model.historiesObserved += 1;
    model.historiesApproved += 1;
    let previousMessage = null;
    let previousAbsolute = null;
    for (const event of analysis.events) {
      if (!event.type) continue;
      incrementCounter(model.messageCounts, event.type);
      incrementCounter(model.directionCounts, `${event.type}|${event.direction}|${roleOf(event.originator)}>${roleOf(event.recipients)}`);
      if (previousMessage) incrementCounter(model.transitionCounts, `${previousMessage.type}>${event.type}`);
      const specFields = new Set([...(MESSAGE_SPECS[event.type]?.required || []), 'idPlano', 'ssr', 'route', 'cfl', 'sid', 'runwayDeparture']);
      if (!model.fieldStats[event.type]) model.fieldStats[event.type] = {};
      specFields.forEach(field => {
        const stat = model.fieldStats[event.type][field] || { present: 0, total: 0 };
        stat.total += 1;
        if (field === 'groundMarker' ? event.groundMarkers.length : event[field]) stat.present += 1;
        model.fieldStats[event.type][field] = stat;
      });
      if (event.dateKey && event.secondsOfDay != null) {
        const absolute = Date.parse(`${event.dateKey}T00:00:00Z`) / 1000 + event.secondsOfDay;
        if (previousMessage && previousAbsolute != null) updateRunningStat(model.timingStats, `${previousMessage.type}>${event.type}`, Math.max(0, absolute - previousAbsolute));
        previousAbsolute = absolute;
      }
      previousMessage = event;
    }
    model.sources.push({ hash: analysis.rawHash, name: String(sourceName || 'Histórico'), approved: true, mode: mode || 'manual', score: analysis.overall, at: new Date().toISOString() });
    model.sources = model.sources.slice(-60);
    saveModel();
    addAudit('Aprendizado', `${mode === 'auto' ? 'Automático' : 'Validado pelo operador'} · ${sourceName || 'Histórico'} · índice ${analysis.overall}`);
    updateModelSummary();
    return true;
  }

  function modelConfidence() {
    const n = model.historiesApproved;
    if (n >= 20) return { label: 'Alta', detail: `${n} históricos validados` };
    if (n >= 8) return { label: 'Média', detail: `${n} históricos validados` };
    if (n >= 3) return { label: 'Inicial', detail: `${n} históricos validados` };
    return { label: 'Base', detail: `${n} históricos validados` };
  }

  function qualityGrade(score) {
    if (score >= 95) return 'Excelente · portão de qualidade';
    if (score >= 85) return 'Bom · revisar alertas';
    if (score >= 70) return 'Atenção · inconsistências relevantes';
    if (score >= 50) return 'Risco alto · revisão necessária';
    return 'Crítico · histórico não confiável';
  }

  function setStatus(message, tone) {
    if (!refs.status) return;
    refs.status.textContent = message;
    refs.status.className = `ai-status-note${tone ? ` ${tone}` : ''}`;
  }


  function ensureCurrentAnalysis() {
    return currentAnalysis || analyzeCurrent({ skipAutoLearn: true });
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    if (h) return `${h}h ${String(m).padStart(2, '0')}min`;
    if (m) return `${m}min ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  function inferCycleState(analysis = currentAnalysis) {
    if (!analysis || !analysis.events.length) return { label: 'Não identificado', detail: 'Nenhum evento reconhecido.', last: null };
    const events = analysis.events;
    const last = events[events.length - 1];
    const types = new Set(events.map(event => event.type).filter(Boolean));
    let label = STATUS_LABELS_AI[last.status] || 'Em análise';
    let detail = `Último evento: ${last.type || last.operation || 'evento interno'}${last.timeText ? ` às ${last.timeText}` : ''}.`;
    if (last.status === 'ARQ') { label = 'Arquivado'; detail = 'O histórico indica encerramento e arquivamento do plano.'; }
    else if (last.status === 'CNL' || types.has('CNL')) { label = 'Cancelado'; detail = 'Foi encontrada mensagem ou estado de cancelamento.'; }
    else if (last.status === 'TER' || types.has('ARR')) { label = 'Chegada / término'; detail = 'A sequência já alcançou chegada ou término operacional.'; }
    else if (last.status === 'ATV' && types.has('DEP')) { label = 'Ativo · em voo'; detail = 'Há decolagem reconhecida e o plano permanece ativo.'; }
    else if (last.status === 'ATV') { label = 'Ativo'; detail = 'O plano está ativo, mas a decolagem pode estar implícita ou ausente no arquivo.'; }
    else if (last.status === 'PRE' && (types.has('CRP') || types.has('PAC'))) { label = 'Pré-ativo · autorização/solo'; detail = 'A sequência alcançou autorização ou progressão de solo.'; }
    else if (last.status === 'PRE') { label = 'Pré-ativo'; detail = 'O plano foi pré-ativado e aguarda progressão operacional.'; }
    else if (last.status === 'INA') { label = 'Inativo'; detail = 'O histórico ainda está na fase anterior à pré-ativação.'; }
    return { label, detail, last };
  }

  function eventAbsoluteTime(event) {
    if (!event || !event.dateKey || event.secondsOfDay == null) return null;
    return Date.parse(`${event.dateKey}T00:00:00Z`) / 1000 + event.secondsOfDay;
  }

  function temporalSummary(analysis = currentAnalysis) {
    if (!analysis || !analysis.events.length) return { text: 'Sem eventos suficientes.', average: null, maximum: null, pair: '' };
    const timed = analysis.events.map(event => ({ event, absolute: eventAbsoluteTime(event) })).filter(item => item.absolute != null);
    const gaps = [];
    for (let i = 1; i < timed.length; i += 1) {
      const gap = timed[i].absolute - timed[i - 1].absolute;
      if (gap >= 0) gaps.push({ gap, from: timed[i - 1].event, to: timed[i].event });
    }
    if (!gaps.length) return { text: `${timed.length} evento(s) com horário, sem intervalos comparáveis.`, average: null, maximum: null, pair: '' };
    const average = gaps.reduce((sum, item) => sum + item.gap, 0) / gaps.length;
    const longest = gaps.reduce((best, item) => item.gap > best.gap ? item : best, gaps[0]);
    return {
      average, maximum: longest.gap,
      pair: `${longest.from.type || 'evento'} → ${longest.to.type || 'evento'}`,
      text: `Intervalo médio: ${formatDuration(average)}. Maior intervalo: ${formatDuration(longest.gap)} entre ${longest.from.type || 'evento'} e ${longest.to.type || 'evento'}.`
    };
  }

  function expectedNextMessages(analysis = currentAnalysis) {
    if (!analysis || !analysis.events.length) return [];
    const phase = inferCycleState(analysis);
    if (['Arquivado', 'Cancelado'].includes(phase.label)) return [{ code: 'FIM', reason: 'O ciclo está encerrado; não há mensagem operacional obrigatória prevista.', source: 'estado', confidence: 'alta' }];
    const messages = analysis.events.filter(event => event.type);
    const last = messages[messages.length - 1];
    if (!last) return [{ code: 'FPL', reason: 'Nenhuma mensagem foi classificada; o início normal é a apresentação do plano.', source: 'fluxo', confidence: 'baixa' }];
    const candidates = new Map();
    const add = (code, reason, source, confidence) => {
      if (!code || candidates.has(code)) return;
      candidates.set(code, { code, reason, source, confidence });
    };
    for (const rule of RESPONSE_RULES) {
      if (rule.trigger !== last.type || (rule.when && !rule.when(last))) continue;
      rule.expected.forEach(token => add(token.startsWith('ACK:') ? 'ACK' : token, `Resposta prevista para ${last.type}: ${token.replace(':', ' ')}.`, 'regra', 'alta'));
    }
    (NEXT_STEP_RULES[last.type] || []).forEach(code => add(code, `Continuação usual após ${last.type}.`, 'fluxo', candidates.size < 2 ? 'alta' : 'média'));
    if (model.historiesApproved >= 3) {
      Object.entries(model.transitionCounts)
        .filter(([key]) => key.startsWith(`${last.type}>`))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([key, count]) => add(key.split('>')[1], `Observada ${count} vez(es) nos históricos validados.`, 'aprendizado', count >= 5 ? 'média' : 'baixa'));
    }
    if (!candidates.size && last.status === 'TER') add('ARQ', 'Após o término, o próximo passo esperado é o arquivamento.', 'estado', 'alta');
    return Array.from(candidates.values()).slice(0, 6);
  }

  function messageFrequency(analysis = currentAnalysis) {
    const counts = {};
    if (!analysis) return [];
    analysis.events.forEach(event => { if (event.type) counts[event.type] = (counts[event.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function topRiskInfo(analysis = currentAnalysis) {
    if (!analysis || !analysis.alerts.length) return { title: 'Nenhum erro relevante detectado', detail: 'Os padrões avaliados não geraram alertas.', severity: 'clear' };
    const alert = analysis.alerts[0];
    return { title: alert.message, detail: `${alert.eventIndex >= 0 ? `Evento ${alert.eventIndex + 1}. ` : ''}${alert.cause || ''}`, severity: alert.severity, alert };
  }

  function buildExecutiveSummary(analysis = currentAnalysis) {
    if (!analysis) return 'Nenhum histórico foi analisado.';
    const phase = inferCycleState(analysis);
    const main = analysis.events.find(event => event.callsign || event.adep || event.ades) || {};
    const identity = [main.callsign, main.adep && main.ades ? `${main.adep} → ${main.ades}` : ''].filter(Boolean).join(' · ');
    const severe = analysis.counts.critical + analysis.counts.high;
    const unknown = analysis.unknown ? ` ${analysis.unknown} mensagem(ns) não foram classificadas.` : '';
    const verdict = severe ? `A revisão humana é prioritária porque há ${severe} alerta(s) crítico(s)/alto(s).` : analysis.alerts.length ? 'Não há alerta crítico ou alto, mas existem pontos que merecem conferência.' : 'Nenhum desvio foi encontrado nas regras avaliadas.';
    return `${identity ? `${identity}. ` : ''}${analysis.events.length} eventos analisados, ${analysis.recognized} mensagens reconhecidas e nota ${analysis.overall}%. Fase estimada: ${phase.label}. ${verdict}${unknown}`;
  }

  function renderPredictions() {
    if (!refs.predictions) return;
    if (!currentAnalysis) { refs.predictions.innerHTML = '<div class="ai-empty-state">Execute a análise para gerar uma previsão.</div>'; return; }
    const items = expectedNextMessages(currentAnalysis);
    refs.predictions.innerHTML = items.length ? items.map(item => `<article class="ai-prediction-card"><div class="ai-prediction-code">${escapeHtml(item.code)}</div><div><b>${escapeHtml(MESSAGE_SPECS[item.code]?.label || item.code)}</b><p>${escapeHtml(item.reason)}</p></div><span class="ai-confidence-pill">${escapeHtml(item.confidence)}</span></article>`).join('') : '<div class="ai-empty-state">A IA não encontrou continuação suficientemente provável.</div>';
    const first = items[0];
    if (refs.nextExpected) refs.nextExpected.textContent = first ? `${first.code} · ${MESSAGE_SPECS[first.code]?.label || 'próximo passo'}` : 'Sem previsão';
    if (refs.nextExpectedDetail) refs.nextExpectedDetail.textContent = first ? first.reason : 'Nenhum próximo passo pôde ser inferido.';
  }

  function renderEventDiagnostics() {
    if (!refs.eventAnalysis) return;
    if (!currentAnalysis) { refs.eventAnalysis.innerHTML = '<div class="ai-empty-state">Execute a análise para detalhar os eventos.</div>'; return; }
    const alertsByEvent = new Map();
    currentAnalysis.alerts.forEach(alert => {
      if (alert.eventIndex < 0) return;
      if (!alertsByEvent.has(alert.eventIndex)) alertsByEvent.set(alert.eventIndex, []);
      alertsByEvent.get(alert.eventIndex).push(alert);
    });
    refs.eventAnalysis.innerHTML = currentAnalysis.events.map(event => {
      const eventAlerts = alertsByEvent.get(event.index) || [];
      const highest = eventAlerts[0];
      const className = highest && SEVERITY_ORDER[highest.severity] >= SEVERITY_ORDER.high ? 'high-risk' : (eventAlerts.length ? 'has-risk' : '');
      const riskClass = highest && SEVERITY_ORDER[highest.severity] >= SEVERITY_ORDER.high ? 'high' : (eventAlerts.length ? 'alert' : '');
      const fields = [event.callsign && `ARCID ${event.callsign}`, event.idPlano && `ID ${event.idPlano}`, event.adep && `ADEP ${event.adep}`, event.ades && `ADES ${event.ades}`, event.eobt && `EOBT ${event.eobt}`, event.ssr && `SSR ${event.ssr}`].filter(Boolean);
      const direction = `${event.originator || '—'} → ${event.recipients || '—'}`;
      return `<article class="ai-event-card ${className}"><div class="ai-event-head"><span class="ai-event-number">#${event.index + 1}<br>${escapeHtml(event.timeText || '--:--:--')}</span><div><h4>${escapeHtml(event.type || 'EVENTO INTERNO')} · ${escapeHtml(event.operation || 'Operação não identificada')}</h4><p>${escapeHtml(direction)} · estado ${escapeHtml(event.status || '—')}</p></div><span class="ai-event-risk ${riskClass}">${eventAlerts.length ? `${eventAlerts.length} alerta(s)` : 'sem alerta'}</span></div>${fields.length ? `<div class="ai-event-fields">${fields.map(field => `<span>${escapeHtml(field)}</span>`).join('')}</div>` : ''}<div class="ai-event-actions"><button type="button" data-ai-event-jump="${event.index}">Abrir evento no histórico</button></div></article>`;
    }).join('');
    refs.eventAnalysis.querySelectorAll?.('[data-ai-event-jump]').forEach(button => button.addEventListener('click', () => jumpToEvent(Number(button.dataset.aiEventJump))));
  }

  function renderPatterns() {
    if (!refs.patterns) return;
    if (!currentAnalysis) { refs.patterns.innerHTML = '<div class="ai-empty-state">Nenhum padrão calculado.</div>'; return; }
    const frequencies = messageFrequency(currentAnalysis);
    const maximum = frequencies.length ? frequencies[0][1] : 1;
    const temporal = temporalSummary(currentAnalysis);
    const transitions = {};
    const typed = currentAnalysis.events.filter(event => event.type);
    for (let i = 1; i < typed.length; i += 1) {
      const key = `${typed[i - 1].type} → ${typed[i].type}`;
      transitions[key] = (transitions[key] || 0) + 1;
    }
    const transitionText = Object.entries(transitions).sort((a,b) => b[1]-a[1]).slice(0,6).map(([key,count]) => `${key}: ${count}x`).join('\n') || 'Não há transições suficientes.';
    refs.patterns.innerHTML = `<div class="ai-pattern-grid"><article class="ai-pattern-card"><h4>Mensagens mais frequentes</h4>${frequencies.slice(0,8).map(([code,count]) => `<div class="ai-frequency-row"><b>${escapeHtml(code)}</b><span class="ai-frequency-track"><i style="--bar:${Math.round(count/maximum*100)}%"></i></span><span>${count}</span></div>`).join('') || '<p>Nenhuma mensagem classificada.</p>'}</article><article class="ai-pattern-card"><h4>Comportamento temporal</h4><p>${escapeHtml(temporal.text)}</p></article><article class="ai-pattern-card wide"><h4>Transições observadas no arquivo</h4><p>${escapeHtml(transitionText)}</p></article></div>`;
  }

  function setInsightSeverity(card, severity, label) {
    if (!card) return;
    const normalized = ['critical','high','medium','low','info','clear'].includes(severity) ? severity : 'info';
    const keepWide = card.classList.contains('wide');
    card.className = `ai-insight-card${keepWide ? ' wide' : ''} severity-${normalized}`;
    card.dataset.severityLabel = label || (normalized === 'clear' ? 'Sem risco' : SEVERITY_LABELS[normalized] || 'Informativo');
  }

  function renderAIInsights() {
    if (!currentAnalysis) return;
    const phase = inferCycleState(currentAnalysis);
    const risk = topRiskInfo(currentAnalysis);
    const predictions = expectedNextMessages(currentAnalysis);
    const summarySeverity = risk.severity === 'clear' ? 'clear' : risk.severity;
    if (refs.executiveSummary) refs.executiveSummary.textContent = buildExecutiveSummary(currentAnalysis);
    if (refs.cycleState) refs.cycleState.textContent = phase.label;
    if (refs.cycleDetail) refs.cycleDetail.textContent = phase.detail;
    if (refs.topRisk) refs.topRisk.textContent = risk.title;
    if (refs.topRiskDetail) refs.topRiskDetail.textContent = risk.detail;
    setInsightSeverity(refs.executiveCard, summarySeverity, summarySeverity === 'clear' ? 'Análise normal' : `Severidade ${SEVERITY_LABELS[summarySeverity]}`);
    setInsightSeverity(refs.topRiskCard, summarySeverity, summarySeverity === 'clear' ? 'Sem risco' : SEVERITY_LABELS[summarySeverity]);
    setInsightSeverity(refs.cycleCard, 'info', phase.label);
    const nextIsEnd = predictions[0]?.code === 'FIM';
    setInsightSeverity(refs.nextActionCard, nextIsEnd ? 'clear' : (['critical','high'].includes(summarySeverity) ? 'medium' : 'info'), nextIsEnd ? 'Ciclo encerrado' : 'Previsão');
    renderPredictions();
    renderEventDiagnostics();
    renderPatterns();
  }

  function normalizedQuestion(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function answerAIQuestion(question, analysis = currentAnalysis) {
    if (!analysis) return 'Carregue e analise um histórico antes de fazer a pergunta.';
    const q = normalizedQuestion(question);
    const phase = inferCycleState(analysis);
    const risk = topRiskInfo(analysis);
    const predictions = expectedNextMessages(analysis);
    const temporal = temporalSummary(analysis);
    if (!q || /resum|geral|situacao|conclus/.test(q)) return buildExecutiveSummary(analysis);
    if (/erro|alerta|problema|anomalia|falha/.test(q)) {
      if (!analysis.alerts.length) return 'A IA não encontrou erros nas regras avaliadas. Ainda assim, a conferência operacional humana continua recomendada.';
      return analysis.alerts.slice(0,5).map((alert,index) => `${index+1}. [${SEVERITY_LABELS[alert.severity]}] ${alert.message}${alert.eventIndex >= 0 ? ` — evento ${alert.eventIndex+1}` : ''}`).join('\n');
    }
    if (/proxim|depois|seguinte|previs/.test(q)) return predictions.map((item,index) => `${index+1}. ${item.code}: ${item.reason}`).join('\n') || 'Não foi possível prever o próximo passo.';
    if (/idplano|id plano|oitavo|7 caracteres|8 caracteres/.test(q)) {
      const ids = Array.from(new Set(analysis.events.map(event => event.idPlano).filter(Boolean)));
      const alerts = analysis.alerts.filter(alert => /IDPLANO/.test(alert.ruleId));
      return `IDPLANO encontrado(s): ${ids.join(', ') || 'nenhum'}. ${alerts.length ? alerts.map(alert => alert.message).join(' ') : 'Não foi detectada inconsistência de IDPLANO.'}`;
    }
    if (/tempo|latencia|horario|atraso|cronolog/.test(q)) return `${temporal.text} ${analysis.alerts.filter(alert => alert.category === 'timing').map(alert => alert.message).join(' ') || 'Não há alerta temporal específico.'}`;
    if (/mensagem|tipo|reconhecid|desconhecid/.test(q)) {
      const freq = messageFrequency(analysis).slice(0,10).map(([code,count]) => `${code}(${count})`).join(', ');
      return `${analysis.recognized} mensagens reconhecidas e ${analysis.unknown} não classificadas. Frequências: ${freq || 'nenhuma'}.`;
    }
    if (/estado|fase|ciclo|ativo|inativo|termin/.test(q)) return `Fase estimada: ${phase.label}. ${phase.detail}`;
    if (/rota|adep|ades|origem|destino/.test(q)) {
      const event = analysis.events.find(item => item.adep || item.ades || item.route) || {};
      return `Origem: ${event.adep || 'não identificada'}. Destino: ${event.ades || 'não identificado'}. Rota extraída: ${event.route || 'não identificada'}.`;
    }
    if (/aprend|confianca|modelo|historicos validados/.test(q)) {
      const confidence = modelConfidence();
      return `Confiança do aprendizado: ${confidence.label}. ${confidence.detail}. O aprendizado começa a gerar alertas estatísticos a partir de três históricos validados.`;
    }
    return `${buildExecutiveSummary(analysis)}\n\nPrincipal risco: ${risk.title}. Próximo passo provável: ${predictions[0]?.code || 'não identificado'}.`;
  }

  function handleAIQuestion(question) {
    const analysis = ensureCurrentAnalysis();
    const text = question == null ? refs.askInput?.value : question;
    if (refs.askAnswer) refs.askAnswer.textContent = answerAIQuestion(text, analysis);
    if (refs.askInput && question != null) refs.askInput.value = question;
    addAudit('Pergunta à IA', String(text || 'resumo automático').slice(0,120));
  }

  function buildAIReportText(analysis = currentAnalysis, name = sourceName()) {
    if (!analysis) return 'Nenhum histórico analisado.';
    const phase = inferCycleState(analysis);
    const predictions = expectedNextMessages(analysis);
    const temporal = temporalSummary(analysis);
    const lines = [
      'FLIGHTFLOW ATS — RELATÓRIO DE INTELIGÊNCIA ARTIFICIAL',
      `Motor: ${AI_ENGINE_VERSION}`,
      `Fonte: ${name || 'Histórico carregado'}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '', '1. RESUMO', buildExecutiveSummary(analysis),
      '', '2. FASE ESTIMADA', `${phase.label} — ${phase.detail}`,
      '', '3. ANÁLISE TEMPORAL', temporal.text,
      '', '4. PRÓXIMOS PASSOS PROVÁVEIS', ...(predictions.length ? predictions.map((item,index) => `${index+1}. ${item.code} — ${item.reason} [confiança ${item.confidence}]`) : ['Nenhuma previsão disponível.']),
      '', '5. ALERTAS', ...(analysis.alerts.length ? analysis.alerts.map((alert,index) => { const support = normativeSupportFor(alert); const sources = [...support.builtin.map(entry => entry.source || entry.sourceDocument), ...support.custom.map(item => item.manual.name)].filter(Boolean).join(' | '); return `${index+1}. [${SEVERITY_LABELS[alert.severity]}] ${alert.message}${alert.eventIndex >= 0 ? ` | Evento ${alert.eventIndex+1}` : ''}
   Regra: ${alert.ruleId}
   Evidência: ${alert.evidence || '—'}
   Causa provável: ${alert.cause || '—'}
   Motivo documental: ${support.reason || '—'}
   Fontes: ${sources || 'Regra operacional interna'}`; }) : ['Nenhum alerta detectado.']),
      '', '6. EVENTOS ANALISADOS', ...analysis.events.map(event => `#${event.index+1} ${event.dateText || ''} ${event.timeText || ''} | ${event.type || 'INTERNO'} | ${event.originator || '—'} → ${event.recipients || '—'} | Estado ${event.status || '—'}`),
      '', 'Observação: a análise é assistiva e não substitui a validação operacional do especialista.'
    ];
    return lines.join('\n');
  }

  function triggerTextDownload(content, filename, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadAIReport() {
    const analysis = ensureCurrentAnalysis();
    if (!analysis) return;
    const safeName = sourceName().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'historico';
    triggerTextDownload(buildAIReportText(analysis), `Relatorio_IA_${safeName}_${new Date().toISOString().slice(0,10)}.txt`);
    addAudit('Relatório IA', 'Relatório textual exportado.');
    setStatus('Relatório da IA gerado com resumo, previsão, alertas e eventos.', 'success');
  }

  async function copyExecutiveSummary() {
    const analysis = ensureCurrentAnalysis();
    if (!analysis) return;
    const value = buildExecutiveSummary(analysis);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const area = document.createElement('textarea'); area.value = value; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
      }
      setStatus('Resumo da IA copiado.', 'success');
    } catch (_) { setStatus('Não foi possível copiar o resumo automaticamente.', 'error'); }
  }

  function openAIDetails(id) {
    const details = el(id);
    if (!details) return;
    details.open = true;
    details.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  function renderDimensions() {
    if (!refs.dimensions) return;
    if (!currentAnalysis) {
      refs.dimensions.innerHTML = '<div class="ai-empty-state">A análise preencherá os indicadores internos da IA.</div>';
      return;
    }
    refs.dimensions.innerHTML = DIMENSION_DEFS.map(def => {
      const score = currentAnalysis.dimensions[def.key];
      return `<article class="ai-dimension-card" title="${escapeHtml(def.help)}">
        <header><b>${escapeHtml(def.label)}</b><strong>${score}%</strong></header>
        <div class="ai-dimension-track"><i style="--score:${score}%"></i></div>
        <p>${escapeHtml(def.help)}</p>
      </article>`;
    }).join('');
  }

  function feedbackFor(ruleId) {
    return model.feedback[ruleId] || { confirmed: 0, rejected: 0 };
  }

  function activeAlertsBase() {
    if (!currentAnalysis) return [];
    return currentAnalysis.alerts.filter(alert =>
      !isConfirmed(alert, currentAnalysis.rawHash) &&
      !isFalsePositive(alert, currentAnalysis.rawHash)
    );
  }

  function filteredAlerts() {
    const severity = refs.severityFilter?.value || 'all';
    const category = refs.categoryFilter?.value || 'all';
    return activeAlertsBase().filter(alert => (severity === 'all' || alert.severity === severity) && (category === 'all' || alert.category === category));
  }

  function renderTypeFilterChips() {
    if (!refs.typeFilterChips) return;
    const activeCategory = refs.categoryFilter?.value || 'all';
    const categories = ['all','syntax','sequence','direction','integrity','timing','duplicate','learned'];
    const counts = activeAlertsBase().reduce((acc, alert) => { acc[alert.category] = (acc[alert.category] || 0) + 1; return acc; }, {});
    counts.all = activeAlertsBase().length;
    refs.typeFilterChips.innerHTML = categories.map(category => `<button type="button" class="ai-type-chip${activeCategory === category ? ' active' : ''}" data-category="${category}" aria-pressed="${activeCategory === category ? 'true' : 'false'}"><span>${escapeHtml(category === 'all' ? 'Todos' : CATEGORY_LABELS[category])}</span><b>${counts[category] || 0}</b></button>`).join('');
    refs.typeFilterChips.querySelectorAll('.ai-type-chip').forEach(button => button.addEventListener('click', () => {
      if (refs.categoryFilter) refs.categoryFilter.value = button.dataset.category;
      renderAlerts();
    }));
  }

  function safeNormativeSupportFor(alert) {
    try {
      const support = normativeSupportFor(alert) || {};
      return {
        reason: String(support.reason || 'O achado foi produzido pelas regras locais da IA e deve ser validado pelo operador.'),
        builtin: Array.isArray(support.builtin) ? support.builtin : [],
        custom: Array.isArray(support.custom) ? support.custom : []
      };
    } catch (error) {
      console.error('[FlightFlow IA] Falha ao recuperar fundamento documental:', alert?.ruleId, error);
      return {
        reason: 'O alerta foi detectado, mas o fundamento documental não pôde ser montado nesta execução. A evidência do histórico permanece disponível para revisão.',
        builtin: [],
        custom: []
      };
    }
  }

  function renderAlerts() {
    if (!refs.alerts) return;
    renderTypeFilterChips();
    if (!currentAnalysis) {
      refs.alerts.innerHTML = '<div class="ai-empty-state">Nenhum histórico analisado.</div>';
      return;
    }

    const alerts = filteredAlerts();
    if (!alerts.length) {
      refs.alerts.innerHTML = '<div class="ai-empty-state">Nenhum alerta corresponde ao filtro. O histórico pode estar dentro dos padrões avaliados.</div>';
      return;
    }

    const cards = [];
    for (const alert of alerts) {
      try {
        const eventLabel = alert.eventIndex >= 0 ? `Evento ${alert.eventIndex + 1}` : 'Arquivo';
        const state = 'Aguardando decisão do operador';
        const support = safeNormativeSupportFor(alert);
        const sourceTags = [
          ...support.builtin.map(entry => `<span>${escapeHtml(entry?.source || entry?.sourceDocument || 'Base interna')}</span>`),
          ...support.custom.map(item => `<span>${escapeHtml(item?.manual?.name || 'Manual integrado')}</span>`)
        ].slice(0, 4).join('');
        cards.push(`<article class="ai-alert-card severity-${escapeHtml(alert.severity || 'medium')} category-${escapeHtml(alert.category || 'quality')}" data-ai-alert-id="${escapeHtml(alert.id)}">
          <div class="ai-alert-main">
            <div class="ai-alert-top"><h4>${escapeHtml(alert.message || 'Achado da IA')}</h4><span class="ai-severity-badge">${escapeHtml(SEVERITY_LABELS[alert.severity] || 'Médio')}</span></div>
            <div class="ai-alert-meta"><span>${eventLabel}</span><span class="ai-alert-category">${escapeHtml(CATEGORY_LABELS[alert.category] || alert.category || 'Qualidade')}</span><span>Regra ${escapeHtml(alert.ruleId || 'LOCAL')}</span></div>
            <p><b>Causa provável:</b> ${escapeHtml(alert.cause || 'Necessita validação operacional.')}</p>
            ${alert.evidence ? `<div class="ai-evidence">${escapeHtml(alert.evidence)}</div>` : ''}
            ${alert.crossScan ? `<div class="ai-cross-scan-note">${alert.crossScan.found ? `Cruzamento concluído: resposta localizada no evento ${Number(alert.crossScan.to) + 1}${alert.crossScan.late ? ', porém fora da janela esperada' : ''}.` : 'Cruzamento concluído: nenhum evento posterior confirmou a mensagem até o fim do histórico.'}</div>` : ''}
            <div class="ai-normative-reason"><strong>Motivo conforme documentação</strong><p>${escapeHtml(support.reason)}</p>${sourceTags ? `<div class="ai-source-tags">${sourceTags}</div>` : ''}</div>
          </div>
          <div class="ai-alert-actions">
            ${alert.eventIndex >= 0 ? `<button type="button" data-ai-jump="${alert.eventIndex}">Ir ao evento</button>` : ''}
            <button type="button" data-ai-feedback="confirm" data-ai-rule="${escapeHtml(alert.ruleId || '')}" data-ai-alert="${escapeHtml(alert.id || '')}">Confirmar erro</button>
            <button type="button" class="ai-reject-feedback" data-ai-feedback="reject" data-ai-rule="${escapeHtml(alert.ruleId || '')}" data-ai-alert="${escapeHtml(alert.id || '')}">Mover para falsos positivos</button>
            <span class="ai-feedback-state">${escapeHtml(state)}</span>
          </div>
        </article>`);
      } catch (error) {
        console.error('[FlightFlow IA] Falha ao apresentar um achado:', alert, error);
        cards.push(`<article class="ai-alert-card severity-medium category-quality"><div class="ai-alert-main"><div class="ai-alert-top"><h4>Achado detectado, mas não apresentado integralmente</h4><span class="ai-severity-badge">Médio</span></div><div class="ai-alert-meta"><span>${alert?.eventIndex >= 0 ? `Evento ${alert.eventIndex + 1}` : 'Arquivo'}</span><span>Regra ${escapeHtml(alert?.ruleId || 'LOCAL')}</span></div><p>A IA preservou este achado. O cartão detalhado não pôde ser montado, mas a análise dos demais resultados continua disponível.</p></div></article>`);
      }
    }

    refs.alerts.innerHTML = cards.join('') || '<div class="ai-empty-state">A análise terminou sem cartões de alerta apresentáveis.</div>';
    refs.alerts.querySelectorAll('[data-ai-jump]').forEach(button => button.addEventListener('click', () => jumpToEvent(Number(button.dataset.aiJump))));
    refs.alerts.querySelectorAll('[data-ai-feedback]').forEach(button => button.addEventListener('click', () => applyFeedback(button.dataset.aiRule, button.dataset.aiFeedback, button.dataset.aiAlert)));
  }

  function renderSummary() {
    const confidence = modelConfidence();
    if (refs.modelConfidence) refs.modelConfidence.textContent = confidence.label;
    if (refs.learnedHistories) refs.learnedHistories.textContent = confidence.detail;
    if (!currentAnalysis) return;
    if (refs.qualityScore) refs.qualityScore.textContent = `${currentAnalysis.overall}%`;
    if (refs.qualityGrade) refs.qualityGrade.textContent = qualityGrade(currentAnalysis.overall);
    if (refs.alertCount) refs.alertCount.textContent = String(currentAnalysis.alerts.length);
    if (refs.alertBreakdown) refs.alertBreakdown.textContent = `${currentAnalysis.counts.critical} críticos · ${currentAnalysis.counts.high} altos · ${currentAnalysis.counts.medium} médios`;
    if (refs.recognized) refs.recognized.textContent = String(currentAnalysis.recognized);
    if (refs.unknown) refs.unknown.textContent = `${currentAnalysis.unknown} não classificadas · ${currentAnalysis.events.length} eventos totais`;
    updateViewCounters();
  }

  function renderLineage(sourceName) {
    if (!refs.lineage || !currentAnalysis) return;
    refs.lineage.innerHTML = `<b>Fonte:</b> ${escapeHtml(sourceName || 'Histórico carregado')}<br>
      <b>Hash local:</b> ${escapeHtml(currentAnalysis.rawHash)} · <b>Motor:</b> ${AI_ENGINE_VERSION}<br>
      <b>Eventos:</b> ${currentAnalysis.events.length} · <b>Mensagens reconhecidas:</b> ${currentAnalysis.recognized}<br>
      <b>Gerado em:</b> ${new Date(currentAnalysis.generatedAt).toLocaleString('pt-BR')}<br>
      <b>Processamento:</b> o texto bruto permanece apenas na página atual; a IA guarda somente estatísticas agregadas.`;
  }

  function renderAudit() {
    if (!refs.audit) return;
    const items = audit.slice(-20).reverse();
    refs.audit.innerHTML = items.length ? items.map(item => `<div class="ai-audit-row"><time>${new Date(item.at).toLocaleString('pt-BR')}</time><span><b>${escapeHtml(item.action)}</b><br>${escapeHtml(item.details)}</span></div>`).join('') : '<div class="ai-empty-state">Nenhuma ação de IA registrada.</div>';
  }

  function renderMessageMatrix() {
    if (!refs.matrix) return;
    refs.matrix.innerHTML = Object.entries(MESSAGE_SPECS).map(([code, spec]) => `<article class="ai-message-row">
      <div class="ai-message-code">${escapeHtml(code)}</div>
      <div><h4>${escapeHtml(spec.label)}</h4><p><b>Fluxo:</b> ${escapeHtml(spec.flow)}</p><p><b>Campos:</b> ${escapeHtml(spec.required.map(field => BASE_REQUIRED_FIELDS[field] || field).join(', '))}</p><p><b>Validação:</b> ${escapeHtml(spec.expected)}</p></div>
    </article>`).join('');
  }

  function updateModelSummary() {
    renderSummary();
    renderAudit();
  }

  function sourceName() {
    const label = el('selectedFileLabel');
    return normalize(label?.textContent || 'Histórico carregado').replace(/\s+·\s+.*$/, '');
  }

  function getRawHistory() {
    const raw = el('originalFullText')?.textContent || '';
    if (/Carregue um histórico/i.test(raw)) return '';
    return raw.trim();
  }

  const AI_ASSISTANT_EMPTY_TEXT = 'A resposta será produzida localmente a partir dos eventos, alertas e padrões do histórico atualmente carregado.';

  function resetCurrentHistoryAI(detail = {}) {
    window.clearTimeout(analysisTimer);
    analysisTimer = 0;
    currentAnalysis = null;
    currentSourceHash = '';

    if (refs.askInput) refs.askInput.value = '';
    if (refs.askAnswer) refs.askAnswer.textContent = detail.mode === 'empty'
      ? 'Carregue um histórico para consultar o assistente local.'
      : AI_ASSISTANT_EMPTY_TEXT;

    if (refs.qualityScore) refs.qualityScore.textContent = '—';
    if (refs.qualityGrade) refs.qualityGrade.textContent = 'Sem análise';
    if (refs.alertCount) refs.alertCount.textContent = '0';
    if (refs.alertBreakdown) refs.alertBreakdown.textContent = '0 críticos · 0 altos · 0 médios';
    if (refs.recognized) refs.recognized.textContent = '0';
    if (refs.unknown) refs.unknown.textContent = '0 não classificadas · 0 eventos totais';
    if (refs.learn) refs.learn.disabled = true;

    if (refs.executiveSummary) refs.executiveSummary.textContent = 'Aguardando análise do novo histórico.';
    if (refs.cycleState) refs.cycleState.textContent = '—';
    if (refs.cycleDetail) refs.cycleDetail.textContent = '—';
    if (refs.topRisk) refs.topRisk.textContent = '—';
    if (refs.topRiskDetail) refs.topRiskDetail.textContent = '—';
    if (refs.nextExpected) refs.nextExpected.textContent = '—';
    if (refs.nextExpectedDetail) refs.nextExpectedDetail.textContent = 'A IA analisará somente os eventos deste histórico.';
    [refs.executiveCard, refs.cycleCard, refs.topRiskCard, refs.nextActionCard].forEach(card => {
      if (!card) return;
      card.classList.remove('severity-critical','severity-high','severity-medium','severity-low','severity-info');
      card.classList.add('severity-clear');
    });

    if (refs.lineage) refs.lineage.innerHTML = '<b>Sessão atual:</b> aguardando processamento do histórico carregado.';
    if (refs.predictions) refs.predictions.innerHTML = '<div class="ai-empty-state">A previsão será recalculada para o novo histórico.</div>';
    if (refs.eventAnalysis) refs.eventAnalysis.innerHTML = '<div class="ai-empty-state">O diagnóstico por evento será recalculado para o novo histórico.</div>';
    if (refs.patterns) refs.patterns.innerHTML = '<div class="ai-empty-state">Os padrões da sessão anterior foram removidos.</div>';

    renderDimensions();
    renderAlerts();
    renderConfirmedErrors();
    renderFalsePositives();
    renderTypeFilterChips();
    updateViewCounters();
    const tabCount = el('aiIssueCount');
    if (tabCount) tabCount.textContent = '0';
    switchAIView('errors');
    setStatus(detail.mode === 'empty'
      ? 'Carregue um histórico para iniciar a análise inteligente.'
      : `Nova sessão iniciada${detail.sourceName ? ` para ${detail.sourceName}` : ''}. Resultados anteriores foram limpos.`, 'info');
  }

  function analyzeCurrent(options = {}) {
    const raw = getRawHistory();
    if (!raw) {
      setStatus('Carregue um histórico TXT/JSON antes de executar a análise.', 'warning');
      return null;
    }
    try {
      currentAnalysis = applyFalsePositiveMask(analyzeRaw(raw));
      currentSourceHash = currentAnalysis.rawHash;
      renderAllAI();
      if (refs.learn) refs.learn.disabled = !currentAnalysis.events.length;
      const critical = currentAnalysis.counts.critical + currentAnalysis.counts.high;
      setStatus(`Análise concluída: ${currentAnalysis.events.length} eventos, ${currentAnalysis.recognized} mensagens reconhecidas e ${currentAnalysis.alerts.length} alertas apresentados.`, critical ? 'warning' : 'success');
      addAudit('Análise', `${sourceName()} · índice ${currentAnalysis.overall} · ${currentAnalysis.alerts.length} alertas`);

      if (!options.skipAutoLearn && settings.autoLearn && currentAnalysis.highQualityGate) {
        const trained = trainFromAnalysis(currentAnalysis, sourceName(), 'auto');
        if (trained) setStatus(`Análise concluída e histórico incorporado automaticamente: índice ${currentAnalysis.overall}, sem alertas críticos/altos.`, 'success');
      }
      return currentAnalysis;
    } catch (error) {
      console.error('[FlightFlow IA] Falha na apresentação da análise:', error);
      if (currentAnalysis) {
        try { renderSummary(); } catch (_) {}
        try { renderDimensions(); } catch (_) {}
        try { renderAlerts(); } catch (_) {}
        try { renderAIInsights(); } catch (_) {}
        try { renderPredictions(); } catch (_) {}
        try { renderEventDiagnostics(); } catch (_) {}
        try { renderPatterns(); } catch (_) {}
        try { renderLineage(sourceName()); } catch (_) {}
        updateViewCounters();
      }
      setStatus(`A análise foi calculada, mas ocorreu uma falha ao montar parte da apresentação: ${error?.message || 'erro desconhecido'}. Os resultados recuperáveis foram mantidos.`, 'error');
      return currentAnalysis;
    }
  }

  function scheduleAnalysisFromHistory() {
    window.clearTimeout(analysisTimer);
    analysisTimer = window.setTimeout(() => {
      const raw = getRawHistory();
      if (!raw) return;
      const hash = hashText(raw);
      if (hash !== currentSourceHash) analyzeCurrent();
    }, 380);
  }

  function jumpToEvent(index) {
    if (!Number.isInteger(index) || index < 0) return;
    const item = document.querySelector(`.timeline-item[data-event-index="${index}"]`);
    if (item) {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      item.scrollIntoView({ block: 'center', behavior: 'smooth' });
      item.animate([{ outline: '3px solid #ffb02e' }, { outline: '0 solid transparent' }], { duration: 1500 });
    } else {
      const scrubber = el('scrubber');
      if (scrubber) {
        scrubber.value = String(index);
        scrubber.dispatchEvent(new Event('input', { bubbles: true }));
        scrubber.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function applyFeedback(ruleId, action, alertId) {
    if (!ruleId) return;
    const entry = model.feedback[ruleId] || { confirmed: 0, rejected: 0 };
    const alert = currentAnalysis?.alerts?.find(item => item.id === alertId) || currentAnalysis?.allAlerts?.find(item => item.id === alertId);
    if (!alert || !currentAnalysis) {
      setStatus('Não foi possível localizar o achado selecionado.', 'error');
      return;
    }
    const reviewKey = confirmedKey(alert, currentAnalysis.rawHash);
    if (action === 'confirm') {
      const alreadyConfirmed = (model.confirmedErrors || []).some(item => item.key === reviewKey);
      model.falsePositives = (model.falsePositives || []).filter(item => item.key !== falsePositiveKey(alert));
      if (!alreadyConfirmed) {
        entry.confirmed += 1;
        model.confirmedErrors.push({ key:reviewKey, sourceHash:currentAnalysis.rawHash, sourceName:sourceName(), alertId:alert.id, ruleId:alert.ruleId, category:alert.category, severity:alert.severity, message:alert.message, evidence:alert.evidence || '', eventIndex:alert.eventIndex, at:new Date().toISOString() });
        model.confirmedErrors = model.confirmedErrors.slice(-500);
      }
    } else {
      const key = falsePositiveKey(alert);
      const alreadyRejected = (model.falsePositives || []).some(item => item.key === key);
      model.confirmedErrors = (model.confirmedErrors || []).filter(item => item.key !== reviewKey);
      if (!alreadyRejected) {
        entry.rejected += 1;
        model.falsePositives.push({ key, sourceHash:currentAnalysis.rawHash, sourceName:sourceName(), alertId:alert.id, ruleId:alert.ruleId, category:alert.category, severity:alert.severity, message:alert.message, evidence:alert.evidence || '', eventIndex:alert.eventIndex, at:new Date().toISOString() });
        model.falsePositives = model.falsePositives.slice(-400);
      }
    }
    model.feedback[ruleId] = entry;
    saveModel();
    addAudit('Revisão humana', `${action === 'confirm' ? 'Erro confirmado e arquivado' : 'Falso positivo movido'} · ${ruleId}`);

    const targetView = action === 'reject' ? 'falsepositives' : 'confirmed';
    switchAIView(targetView);
    refreshVisibleAIReview(targetView);
    if (action === 'reject') {
      setStatus('O achado saiu de Erros ativos e foi movido para Falsos positivos.', 'success');
    } else {
      setStatus('Erro confirmado. O achado saiu da fila ativa e foi registrado em Erros confirmados.', 'success');
    }
    queueAIReviewReanalysis(targetView);
  }

  function learnCurrent() {
    if (!currentAnalysis) currentAnalysis = analyzeCurrent({ skipAutoLearn: true });
    if (!currentAnalysis) return;
    if (currentAnalysis.counts.critical || currentAnalysis.counts.high) {
      const confirmed = window.confirm('Este histórico possui alertas críticos ou altos. Deseja mesmo validá-lo como padrão de aprendizado?');
      if (!confirmed) return;
    }
    const trained = trainFromAnalysis(currentAnalysis, sourceName(), 'manual');
    if (trained) setStatus('Histórico validado e incorporado ao modelo local. Novas análises usarão este padrão.', 'success');
  }

  function exportModel() {
    const payload = {
      product: 'FlightFlow ATS - Inteligência Artificial',
      exportedAt: new Date().toISOString(),
      schemaVersion: MODEL_SCHEMA_VERSION,
      engineVersion: AI_ENGINE_VERSION,
      model,
      audit: audit.slice(-60),
      note: 'Não contém o texto bruto dos históricos; apenas estatísticas agregadas e registro de ações da IA.'
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `FlightFlow_Base_IA_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    addAudit('Exportação', 'Base local de aprendizado exportada.');
    setStatus('Base de aprendizado exportada sem o texto bruto dos históricos.', 'success');
  }

  async function importModelFile(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const candidate = parsed.model || parsed;
      if (!candidate || candidate.schemaVersion !== MODEL_SCHEMA_VERSION) throw new Error('Versão de esquema incompatível.');
      const confirmed = window.confirm('A importação substituirá a base de aprendizado atual. Continuar?');
      if (!confirmed) return;
      model = Object.assign(defaultModel(), candidate);
      if (Array.isArray(parsed.audit)) audit = parsed.audit.slice(-MAX_AUDIT);
      saveModel();
      saveAudit();
      addAudit('Importação', `Base importada de ${file.name}.`);
      updateModelSummary();
      setStatus('Base de aprendizado importada com sucesso.', 'success');
      if (currentAnalysis) analyzeCurrent({ skipAutoLearn: true });
    } catch (error) {
      setStatus(`Falha na importação: ${error.message}`, 'error');
    } finally {
      if (refs.importInput) refs.importInput.value = '';
    }
  }

  function resetModel() {
    const confirmed = window.confirm('Zerar o aprendizado dos históricos, feedback, erros confirmados, falsos positivos e trilha de auditoria? Os manuais adicionados serão preservados.');
    if (!confirmed) return;
    model = defaultModel();
    audit = [];
    saveModel();
    saveAudit();
    addAudit('Reinicialização', 'Modelo local zerado pelo operador.');
    updateModelSummary();
    if (currentAnalysis) analyzeCurrent({ skipAutoLearn: true });
    setStatus('Aprendizado local reiniciado. As regras normativas continuam ativas.', 'success');
  }

  function buildTestEvent({ operation = 'Evento Automático de Envio de Mensagem ATS', date = '06/06/2026', time = '18:00:00', status = 'INA', origin = 'SBBSZQZX', destination = 'SBRJZPZX', content = '' } = {}) {
    return `OPERAÇÃO : ${operation}\n\ndata: ${date} hora: ${time} posição: SPA01 ambiente: OpA\nEstado: ${status}\n\nMensagem :\nOriginador : ${origin}\nDestinatários : ${destination}\n${/Envio/i.test(operation) ? 'Mensagem enviada : SIM\n' : ''}Conteúdo :\n${content}`;
  }

  function buildHistory(...events) {
    return `HISTÓRICO DE TESTE\n${events.map(event => `\n############################################################\n\n${event}`).join('')}\n`;
  }

  function validFplContent(overrides = {}) {
    const callsign = overrides.callsign || 'TAM3542';
    const adep = overrides.adep || 'SBBR';
    const ades = overrides.ades || 'SBGO';
    const eobt = overrides.eobt || '1845';
    const dof = overrides.dof || '260606';
    const route = overrides.route || 'SIREM';
    return `(FPL-${callsign}-IS\n-A321/M-SWDE2FGHIM1RXYZ/C\n-${adep}${eobt}\n-N0400F160 ${route}\n-${ades}0025\n-PBN/A1B1C1D1L1O2S2 DOF/${dof})`;
  }

  function runSelfTests() {
    const sent = content => buildTestEvent({ content });
    const received = (content, origin = 'SBRJZPZX', destination = 'SBBSZQZX', time = '18:00:01', status = 'INA') => buildTestEvent({ operation: `Recepção de Mensagem ${normalizeCode(extractFirst(content, [/-TITLE\s+([A-Z0-9]+)/i, /^\(([A-Z]+)/])) || 'ATS'}`, content, origin, destination, time, status });
    const ack = type => `-TITLE ACK -MSGTYP ${type} -BEGIN ADDR -FAC SBBSZQZX -END ADDR -IDPLANO NZQ132ME -BEGIN MSGSUM -ARCID TAM3542 -ADEP SBBR -ADES SBGO -EOBT 1845 -EOBD 260606 -END MSGSUM`;
    const abi = '-TITLE ABI -SENDER -FAC SBBSZQZX -RECVR -FAC SBBRZTZX -SEQNUM 929 -ARCID TAM3542 -SSRCODE A4651 -ADEP SBBR -EOBD 260606 -EOBT 1845 -ADES SBGO -ROUTE N0400F160 SIREM -IDPLANO NZQ132ME';
    const lam = '-TITLE LAM -SENDER -FAC SBBRZTZX -RECVR -FAC SBBSZQZX -SEQNUM 818 -MSGREF -SENDER -FAC SBBSZQZX -RECVR -FAC SBBRZTZX -SEQNUM 929';
    const crq = '-TITLE CRQ -SENDER -FAC SBBRZTZX -RECVR -FAC SBBSZQZX -SEQNUM 819 -ARCID TAM3542 -SSRCODE A4651 -ADEP SBBR -EOBD 260606 -EOBT 1845 -ADES SBGO -ROUTE N0400F160 SIREM -RWYDEP 11R -SID UMSUB1A SIREM -IDPLANO NZQ132ME';
    const crp = '-TITLE CRP -SENDER -FAC SBBSZQZX -RECVR -FAC SBBRZTZX -SEQNUM 948 -ARCID TAM3542 -SSRCODE A4651 -ADEP SBBR -EOBD 260606 -EOBT 1845 -CFL -FL F160 -ADES SBGO -ROUTE N0400F160 SIREM -RWYDEP 11R -SID UMSUB1A SIREM -IDPLANO NZQ132ME';
    const pac = '-TITLE PAC -SENDER -FAC SBBRZTZX -RECVR -FAC SBBSZQZX -SEQNUM 822 -ARCID TAM3542 -SSRCODE A4651 -ADEP SBBR -EOBD 260606 -EOBT 1845 -ADES SBGO -IDPLANO NZQ132ME -CLG 1848';
    const fpva = '(FPVA     TAM3542   4651 A321M N0400 SBBR      SBGO\n\nSIREM 1935 F160)';
    const lamAnapolis = '-TITLE LAM -SENDER -FAC SBANZAZX -RECVR -FAC SBBSZQZX -SEQNUM 056 -MSGREF -SENDER -FAC SBBSZQZX -RECVR -FAC SBANZAZX -SEQNUM 253';
    const lrmAnapolis = '-TITLE LRM -SENDER -FAC SBANZAZX -RECVR -FAC SBBSZQZX -SEQNUM 056 -MSGREF -SENDER -FAC SBBSZQZX -RECVR -FAC SBANZAZX -SEQNUM 253';
    const lamGoiania = '-TITLE LAM -SENDER -FAC SBGOZTZX -RECVR -FAC SBBSZQZX -SEQNUM 057 -MSGREF -SENDER -FAC SBBSZQZX -RECVR -FAC SBGOZTZX -SEQNUM 254';

    const tests = [
      { name: 'FPL válido com ACK', raw: buildHistory(sent(validFplContent()), received(ack('FPL'))), noAtLeast: 'high' },
      { name: 'FPL sem ADEP', raw: buildHistory(sent(validFplContent({ adep: 'ZZ' }))), rule: 'REQ_FPL' },
      { name: 'FPL com EOBT inválida', raw: buildHistory(sent(validFplContent({ eobt: '2560' }))), rule: 'FMT_EOBT' },
      { name: 'FPL com DOF inválido', raw: buildHistory(sent(validFplContent({ dof: '261332' }))), rule: 'FMT_DOF' },
      { name: 'DLA válida com ACK', raw: buildHistory(received('(DLA-TAM3542-SBBR1926-SBGO-DOF/260606)'), buildTestEvent({ content: ack('DLA'), time: '18:00:02' })), noAtLeast: 'high' },
      { name: 'DLA sem DOF', raw: buildHistory(received('(DLA-TAM3542-SBBR1926-SBGO)')), rule: 'REQ_DLA' },
      { name: 'DLA sem ACK/CHG', raw: buildHistory(received('(DLA-TAM3542-SBBR1926-SBGO-DOF/260606)')), rule: 'SEQ_DLA_ACK' },
      { name: 'CRQ válida com CRP', raw: buildHistory(received(crq, 'SBBRZTZX', 'SBBSZQZX'), buildTestEvent({ operation: 'Envio de Mensagem CRP', origin: 'SBBSZQZX', destination: 'SBBRZTZX', content: crp, time: '18:00:03', status: 'PRE' })), noAtLeast: 'high' },
      { name: 'CRQ em direção incorreta', raw: buildHistory(buildTestEvent({ operation: 'Envio de Mensagem CRQ', origin: 'SBBSZQZX', destination: 'SBBRZTZX', content: crq })), rule: 'DIR_CRQ' },
      { name: 'CRQ sem CRP/SBY', raw: buildHistory(received(crq, 'SBBRZTZX', 'SBBSZQZX')), rule: 'SEQ_CRQ_CRP' },
      { name: 'CRP sem SID', raw: buildHistory(buildTestEvent({ operation: 'Envio de Mensagem CRP', origin: 'SBBSZQZX', destination: 'SBBRZTZX', content: crp.replace(/-SID\s+UMSUB1A SIREM/i, '') })), rule: 'REQ_CRP' },
      { name: 'CRP em direção incorreta', raw: buildHistory(received(crp, 'SBBRZTZX', 'SBBSZQZX')), rule: 'DIR_CRP' },
      { name: 'ABI com LAM', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem ADEXP', origin: 'SBBSZQZX', destination: 'SBBRZTZX', content: abi, status: 'PRE' }), received(lam, 'SBBRZTZX', 'SBBSZQZX', '18:00:02', 'PRE')), noAtLeast: 'high' },
      { name: 'ABI sem LAM', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem ADEXP', origin: 'SBBSZQZX', destination: 'SBBRZTZX', content: abi, status: 'PRE' })), rule: 'SEQ_ABI_LAM' },
      { name: 'PAC com LAM', raw: buildHistory(received(pac, 'SBBRZTZX', 'SBBSZQZX', '18:00:00', 'PRE'), buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem LAM', origin: 'SBBSZQZX', destination: 'SBBRZTZX', content: lam.replace(/SBBRZTZX/g, 'TEMP').replace(/SBBSZQZX/g, 'SBBRZTZX').replace(/TEMP/g, 'SBBSZQZX'), time: '18:00:01', status: 'PRE' })), noAtLeast: 'high' },
      { name: 'PAC sem marco de solo', raw: buildHistory(received(pac.replace(/-CLG\s+1848/i, ''), 'SBBRZTZX', 'SBBSZQZX')), rule: 'REQ_PAC' },
      { name: 'PAC sem LAM', raw: buildHistory(received(pac, 'SBBRZTZX', 'SBBSZQZX')), rule: 'SEQ_PAC_LAM' },
      { name: 'DEP antes de estado ativo', raw: buildHistory(sent('(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)')), rule: 'SEQ_DEP_BEFORE_ACTIVE' },
      { name: 'DEP após estado ativo', raw: buildHistory(buildTestEvent({ operation: 'Correlação/Descorrelação Automática', content: '', status: 'ATV' }), buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem ATS', content: '(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)', time: '18:00:02', status: 'ATV' })), noRule: 'SEQ_DEP_BEFORE_ACTIVE' },
      { name: 'Regressão ATV para INA', raw: buildHistory(buildTestEvent({ operation: 'Evento interno', content: '', status: 'ATV' }), buildTestEvent({ operation: 'Evento interno', content: '', time: '18:00:02', status: 'INA' })), rule: 'STATUS_REGRESSION' },
      { name: 'Regressão cronológica', raw: buildHistory(buildTestEvent({ content: '', time: '18:10:00' }), buildTestEvent({ content: '', time: '18:00:00' })), rule: 'TIME_REGRESSION' },
      { name: 'Mensagem duplicada', raw: buildHistory(sent(validFplContent()), buildTestEvent({ content: validFplContent(), time: '18:00:02' })), rule: 'DUP_EXACT_MESSAGE' },
      { name: 'ID 7 para 8 compatível', raw: buildHistory(buildTestEvent({ content: '-TITLE ACK -MSGTYP FPL -IDPLANO NZQ132M -ARCID TAM3542 -ADEP SBBR -ADES SBGO', status: 'INA' }), buildTestEvent({ content: abi.replace('NZQ132ME', 'NZQ132ME'), time: '18:00:02', status: 'PRE', destination: 'SBBRZTZX' }), received(lam, 'SBBRZTZX', 'SBBSZQZX', '18:00:03', 'PRE')), noRule: 'CONSIST_IDPLANO' },
      { name: 'ID 7 após pré-ativação', raw: buildHistory(buildTestEvent({ content: abi.replace('NZQ132ME', 'NZQ132M'), status: 'PRE', destination: 'SBBRZTZX' })), rule: 'IDPLANO_7_AFTER_PRE' },
      { name: 'IDs incompatíveis', raw: buildHistory(buildTestEvent({ content: '-TITLE ACK -MSGTYP FPL -IDPLANO NZQ132ME -ARCID TAM3542 -ADEP SBBR -ADES SBGO' }), buildTestEvent({ content: '-TITLE INF -MSGTYP CRP -IDPLANO ABC99999 -ARCID TAM3542 -ADEP SBBR -ADES SBGO', time: '18:00:02' })), rule: 'CONSIST_IDPLANO' },
      { name: 'ADEP conflitante', raw: buildHistory(sent(validFplContent()), buildTestEvent({ content: validFplContent({ adep: 'SBSP' }), time: '18:00:02' })), rule: 'CONSIST_ADEP' },
      { name: 'Indicativo conflitante', raw: buildHistory(sent(validFplContent()), buildTestEvent({ content: validFplContent({ callsign: 'GLO1234' }), time: '18:00:02' })), rule: 'CONSIST_CALLSIGN' },
      { name: 'RQP com FPL', raw: buildHistory(received('(RQP-TAM3542-SBBR-SBGO-DOF/260606)'), sent(validFplContent())), noRule: 'SEQ_RQP_FPL' },
      { name: 'RQP sem fornecimento de plano', raw: buildHistory(received('(RQP-TAM3542-SBBR-SBGO-DOF/260606)')), rule: 'SEQ_RQP_PLAN' },
      { name: 'ACK sem MSGTYP', raw: buildHistory(received('-TITLE ACK -BEGIN ADDR -FAC SBBSZQZX -END ADDR')), rule: 'REQ_ACK' },
      { name: 'LAM sem MSGREF', raw: buildHistory(received('-TITLE LAM -SENDER -FAC SBBRZTZX -RECVR -FAC SBBSZQZX', 'SBBRZTZX', 'SBBSZQZX')), rule: 'REQ_LAM' },
      { name: 'CNL seguido por DEP', raw: buildHistory(received('(CNL-TAM3542-SBBR-SBGO-DOF/260606)'), buildTestEvent({ content: '(DEP-TAM3542-SBBR1924-SBGO-DOF/260606)', time: '18:00:02', status: 'ATV' })), rule: 'SEQ_AFTER_CNL' },
      { name: 'ARR sem voo anterior', raw: buildHistory(received('(ARR-TAM3542-SBBR-SBGO-DOF/260606)')), rule: 'SEQ_ARR_WITHOUT_FLIGHT' },
      { name: 'SSR fora do domínio octal', raw: buildHistory(received(crq.replace('A4651', 'A8899'), 'SBBRZTZX', 'SBBSZQZX')), rule: 'REQ_CRQ' },
      { name: 'Histórico sem OPERAÇÃO', raw: 'texto livre sem blocos reconhecíveis', rule: 'NO_EVENTS' },
      { name: 'FPVD posicional SAGITARIO', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', destination: 'SBBRZXCS', status: 'PRE', content: '(FPVD     TAM3542   4651 A321M N0400 SBBR 1845 SBGO\n\nSIREM 1855 F160\n\nRTE/SIREM)' })), noAtLeast: 'high' },
      { name: 'FPVA posicional SAGITARIO', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', destination: 'SBANZAZX', status: 'ATV', content: fpva })), noAtLeast: 'high' },
      { name: 'FPVA com LAM correto do APP Anápolis', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', origin: 'SBBSZQZX', destination: 'SBANZAZX', status: 'ATV', content: fpva }), received(lamAnapolis, 'SBANZAZX', 'SBBSZQZX', '18:00:02', 'ATV')), noRule: 'SEQ_FPVA_LAM_LRM' },
      { name: 'FPVA com LRM correto do APP Anápolis', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', origin: 'SBBSZQZX', destination: 'SBANZAZX', status: 'ATV', content: fpva }), received(lrmAnapolis, 'SBANZAZX', 'SBBSZQZX', '18:00:02', 'ATV')), noRule: 'SEQ_FPVA_LAM_LRM' },
      { name: 'FPVA sem LAM/LRM do APP Anápolis', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', origin: 'SBBSZQZX', destination: 'SBANZAZX', status: 'ATV', content: fpva })), rule: 'SEQ_FPVA_LAM_LRM' },
      { name: 'FPVA com LAM de outro órgão não confirma Anápolis', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', origin: 'SBBSZQZX', destination: 'SBANZAZX', status: 'ATV', content: fpva }), received(lamGoiania, 'SBGOZTZX', 'SBBSZQZX', '18:00:02', 'ATV')), rule: 'SEQ_FPVA_LAM_LRM' },
      { name: 'FPVA com LAM correta localizada após a janela', raw: buildHistory(buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem TTY', origin: 'SBBSZQZX', destination: 'SBANZAZX', status: 'ATV', content: fpva }), ...Array.from({ length: 7 }, (_, i) => buildTestEvent({ operation: `Evento interno ${i + 1}`, content: '', time: `18:00:${String(i + 2).padStart(2,'0')}`, status: 'ATV' })), received(lamAnapolis, 'SBANZAZX', 'SBBSZQZX', '18:00:20', 'ATV')), rule: 'SEQ_FPVA_LAM_LRM_LATE' },
      { name: 'ARR compacto SAGITARIO', raw: buildHistory(buildTestEvent({ operation: 'Evento interno', status: 'ATV', content: '' }), buildTestEvent({ operation: 'Recepção de Mensagem ARR', origin: 'SBGOZTZX', destination: 'SBBSZQZX', time: '18:10:00', status: 'TER', content: '(ARRSBGO/SBBS253-TAM3542-SBBR-SBGO1950)' })), noAtLeast: 'high' },
      { name: 'LAM de resposta a mensagem recebida', raw: buildHistory(received(crq, 'SBBRZTZX', 'SBBSZQZX'), buildTestEvent({ operation: 'Evento Automático de Envio de Mensagem LAM', origin: 'SBBSZQZX', destination: 'SBBRZTZX', time: '18:00:02', content: '-TITLE LAM -MSGREF -SENDER -FAC SBBRZTZX -RECVR -FAC SBBSZQZX -SEQNUM 819' })), noRule: 'LAM_ORPHAN' },
      { name: 'INF com EVENT em vez de MSGTYP', raw: buildHistory(received('-TITLE INF -EVENT ARC -ARCID TAM3542 -ADEP SBBR -ADES SBGO', 'SBGOZTZX', 'SBBSZQZX')), noRule: 'REQ_INF_RELATEDTYPE' },
      { name: 'Mensagem desconhecida não quebra o motor', raw: buildHistory(received('-TITLE XYZ -ARCID TAM3542 -ADEP SBBR -ADES SBGO')), expectedUnknown: true }
    ];

    const results = tests.map(test => {
      const analysis = analyzeRaw(test.raw, { disableLearningRules: true });
      const ruleIds = analysis.alerts.map(alert => alert.ruleId);
      let pass = true;
      let detail = '';
      if (test.rule) {
        pass = ruleIds.some(id => id === test.rule || id.startsWith(test.rule));
        detail = pass ? `Regra ${test.rule} detectada.` : `Regra ${test.rule} não detectada. Obtidas: ${ruleIds.join(', ') || 'nenhuma'}`;
      } else if (test.noRule) {
        pass = !ruleIds.some(id => id === test.noRule || id.startsWith(test.noRule));
        detail = pass ? `Regra ${test.noRule} não gerou falso positivo.` : `Falso positivo: ${test.noRule}.`;
      } else if (test.noAtLeast) {
        const threshold = SEVERITY_ORDER[test.noAtLeast];
        const severe = analysis.alerts.filter(alert => SEVERITY_ORDER[alert.severity] >= threshold);
        pass = severe.length === 0;
        detail = pass ? `Sem alertas ${test.noAtLeast} ou superiores.` : severe.map(alert => `${alert.ruleId}/${alert.severity}`).join(', ');
      } else if (test.expectedUnknown) {
        pass = analysis.unknown >= 1;
        detail = pass ? 'Tipo desconhecido contabilizado sem falha.' : 'Tipo desconhecido não contabilizado.';
      }
      return { name: test.name, pass, detail, alerts: analysis.alerts.length };
    });

    const predictionAnalysis = analyzeRaw(buildHistory(received(crq, 'SBBRZTZX', 'SBBSZQZX')),{ disableLearningRules:true });
    const predictionCodes = expectedNextMessages(predictionAnalysis).map(item => item.code);
    results.push({ name:'Previsão após CRQ', pass:predictionCodes.includes('SBY') || predictionCodes.includes('CRP'), detail:`Previsto: ${predictionCodes.join(', ') || 'nenhum'}`, alerts:predictionAnalysis.alerts.length });
    const arrivalAnalysis = analyzeRaw(buildHistory(buildTestEvent({ operation:'Evento interno', status:'ATV' }), buildTestEvent({ operation:'Recepção de Mensagem ARR', origin:'SBGOZTZX', destination:'SBBSZQZX', time:'18:10:00', status:'TER', content:'(ARRSBGO/SBBS253-TAM3542-SBBR-SBGO1950)' })),{ disableLearningRules:true });
    const phaseTest = inferCycleState(arrivalAnalysis);
    results.push({ name:'Inferência da fase após ARR', pass:/Chegada|término/i.test(phaseTest.label), detail:`Fase: ${phaseTest.label}`, alerts:arrivalAnalysis.alerts.length });
    const reportText = buildAIReportText(arrivalAnalysis,'teste');
    results.push({ name:'Geração de relatório IA', pass:/RELATÓRIO DE INTELIGÊNCIA ARTIFICIAL/.test(reportText) && /EVENTOS ANALISADOS/.test(reportText), detail:'Relatório contém cabeçalho e eventos.', alerts:arrivalAnalysis.alerts.length });
    const answerText = answerAIQuestion('Qual é a próxima mensagem esperada?', predictionAnalysis);
    results.push({ name:'Assistente local responde previsão', pass:/SBY|CRP/.test(answerText), detail:answerText.slice(0,140), alerts:predictionAnalysis.alerts.length });
    const extractedManualRules = extractManualRules('Após o envio de uma mensagem FPVA do ACC ao APP, espera-se uma resposta LAM/LRM do órgão destinatário.', 'Manual de teste.txt', 'manual-test');
    const extractedFpvaRule = extractedManualRules.find(rule => rule.trigger === 'FPVA' && rule.expected.includes('LAM') && rule.expected.includes('LRM'));
    results.push({ name:'Aprendizado documental FPVA → LAM/LRM', pass:!!extractedFpvaRule, detail:extractedFpvaRule ? `Confiança ${Math.round(extractedFpvaRule.confidence*100)}%.` : 'A relação não foi extraída.', alerts:0 });

    const passed = results.filter(result => result.pass).length;
    const report = { generatedAt: new Date().toISOString(), engineVersion: AI_ENGINE_VERSION, total: results.length, passed, failed: results.length - passed, results };
    renderTestResults(report);
    addAudit('Testes', `${passed}/${results.length} aprovados.`);
    setStatus(`Bateria concluída: ${passed}/${results.length} testes aprovados.`, passed === results.length ? 'success' : 'warning');
    return report;
  }

  function renderTestResults(report) {
    if (!refs.testSummary || !refs.testResults) return;
    refs.testSummary.className = `ai-test-summary ${report.failed ? 'fail' : 'pass'}`;
    refs.testSummary.textContent = `${report.passed}/${report.total} testes aprovados · ${report.failed} falhas · motor ${report.engineVersion}`;
    refs.testResults.innerHTML = report.results.map(result => `<div class="ai-test-row ${result.pass ? 'pass' : 'fail'}"><span>${result.pass ? '✓' : '✕'}</span><span><b>${escapeHtml(result.name)}</b><br><small>${escapeHtml(result.detail)}</small></span><small>${result.alerts} alerta(s)</small></div>`).join('');
  }

  function bindDom() {
    refs.analyze = el('aiAnalyzeBtn');
    refs.focus = el('aiFocusBtn');
    refs.learn = el('aiLearnBtn');
    refs.runTests = el('aiRunTestsBtn');
    refs.eventDiagnostic = el('aiEventDiagnosticBtn');
    refs.predict = el('aiPredictBtn');
    refs.report = el('aiReportBtn');
    refs.copySummary = el('aiCopySummaryBtn');
    refs.executiveCard = el('aiExecutiveCard');
    refs.executiveSummary = el('aiExecutiveSummary');
    refs.cycleCard = el('aiCycleCard');
    refs.cycleState = el('aiCycleState');
    refs.cycleDetail = el('aiCycleDetail');
    refs.topRiskCard = el('aiTopRiskCard');
    refs.topRisk = el('aiTopRisk');
    refs.topRiskDetail = el('aiTopRiskDetail');
    refs.nextActionCard = el('aiNextActionCard');
    refs.nextExpected = el('aiNextExpected');
    refs.nextExpectedDetail = el('aiNextExpectedDetail');
    refs.predictions = el('aiPredictionList');
    refs.eventAnalysis = el('aiEventAnalysisList');
    refs.patterns = el('aiPatternSummary');
    refs.askInput = el('aiAskInput');
    refs.ask = el('aiAskBtn');
    refs.askAnswer = el('aiAskAnswer');
    refs.status = el('aiStatusNote');
    refs.qualityScore = el('aiQualityScore');
    refs.qualityGrade = el('aiQualityGrade');
    refs.alertCount = el('aiAlertCount');
    refs.alertBreakdown = el('aiAlertBreakdown');
    refs.modelConfidence = el('aiModelConfidence');
    refs.learnedHistories = el('aiLearnedHistories');
    refs.recognized = el('aiRecognizedMessages');
    refs.unknown = el('aiUnknownMessages');
    refs.dimensions = el('aiDimensionsGrid');
    refs.alerts = el('aiAlertsList');
    refs.matrix = el('aiMessageMatrix');
    refs.severityFilter = el('aiSeverityFilter');
    refs.categoryFilter = el('aiCategoryFilter');
    refs.typeFilterChips = el('aiTypeFilterChips');
    refs.autoLearn = el('aiAutoLearnToggle');
    refs.exportModel = el('aiExportModelBtn');
    refs.importInput = el('aiImportModelInput');
    refs.resetModel = el('aiResetModelBtn');
    refs.testSummary = el('aiTestSummary');
    refs.testResults = el('aiTestResults');
    refs.lineage = el('aiLineageCard');
    refs.audit = el('aiAuditList');
    refs.help = el('aiMethodHelpBtn');
    refs.dialog = el('aiMethodDialog');
    refs.activeIssueCount = el('aiActiveIssueCount');
    refs.confirmedCount = el('aiConfirmedCount');
    refs.falsePositiveCount = el('aiFalsePositiveCount');
    refs.manualCount = el('aiManualCount');
    refs.confirmedList = el('aiConfirmedList');
    refs.falsePositiveList = el('aiFalsePositiveList');
    refs.clearConfirmed = el('aiClearConfirmedBtn');
    refs.clearFalsePositives = el('aiClearFalsePositivesBtn');
    refs.manualInput = el('aiManualInput');
    refs.manualDropZone = el('aiManualDropZone');
    refs.manualList = el('aiManualList');
    refs.learnedRuleList = el('aiLearnedRuleList');
    refs.manualProgress = el('aiManualProgress');
    refs.manualSearchInput = el('aiManualSearchInput');
    refs.manualSearch = el('aiManualSearchBtn');
    refs.manualSearchResults = el('aiManualSearchResults');
    refs.exportBrain = el('aiExportBrainBtn');
    refs.clearManuals = el('aiClearManualsBtn');
    refs.brainStats = el('aiBrainStats');

    const aiTab = document.querySelector('.tab[data-tab="ai"]');
    document.querySelectorAll('.tab[data-tab]').forEach(tab => tab.addEventListener('click', () => {
      const content = document.querySelector('.content');
      content?.classList.toggle('ai-workspace-mode', tab.dataset.tab === 'ai');
      if (tab.dataset.tab !== 'ai' && aiFocusMode) toggleAIFocus();
    }));

    refs.analyze?.addEventListener('click', () => analyzeCurrent({ skipAutoLearn: false }));
    refs.focus?.addEventListener('click', toggleAIFocus);
    refs.learn?.addEventListener('click', learnCurrent);
    refs.runTests?.addEventListener('click', runSelfTests);
    refs.eventDiagnostic?.addEventListener('click', () => { if (ensureCurrentAnalysis()) { renderEventDiagnostics(); openAIDetails('aiEventDetails'); setStatus('Diagnóstico individual dos eventos atualizado.', 'success'); } });
    refs.predict?.addEventListener('click', () => { if (ensureCurrentAnalysis()) { renderPredictions(); openAIDetails('aiPredictionDetails'); setStatus('Previsão do próximo passo atualizada.', 'success'); } });
    refs.report?.addEventListener('click', downloadAIReport);
    refs.copySummary?.addEventListener('click', copyExecutiveSummary);
    refs.ask?.addEventListener('click', () => handleAIQuestion());
    refs.askInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); handleAIQuestion(); } });
    document.querySelectorAll?.('[data-ai-question]').forEach(button => button.addEventListener('click', () => handleAIQuestion(button.dataset.aiQuestion)));
    refs.severityFilter?.addEventListener('change', renderAlerts);
    refs.categoryFilter?.addEventListener('change', renderAlerts);
    refs.autoLearn && (refs.autoLearn.checked = settings.autoLearn);
    refs.autoLearn?.addEventListener('change', () => { settings.autoLearn = refs.autoLearn.checked; saveSettings(); addAudit('Configuração', `Aprendizado automático ${settings.autoLearn ? 'ativado' : 'desativado'}.`); });
    refs.exportModel?.addEventListener('click', exportModel);
    refs.importInput?.addEventListener('change', event => importModelFile(event.target.files?.[0]));
    refs.resetModel?.addEventListener('click', resetModel);
    refs.help?.addEventListener('click', () => refs.dialog?.showModal());
    document.querySelectorAll('[data-ai-view]').forEach(button => button.addEventListener('click', () => switchAIView(button.dataset.aiView)));
    refs.clearConfirmed?.addEventListener('click', clearConfirmedForCurrent);
    refs.clearFalsePositives?.addEventListener('click', clearFalsePositivesForCurrent);
    refs.manualInput?.addEventListener('change', event => addManualFiles(event.target.files));
    refs.manualSearch?.addEventListener('click', renderManualSearch);
    refs.manualSearchInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); renderManualSearch(); } });
    refs.exportBrain?.addEventListener('click', exportBrain);
    refs.clearManuals?.addEventListener('click', clearAddedManuals);
    if (refs.manualDropZone) {
      refs.manualDropZone.addEventListener('dragover', event => { event.preventDefault(); refs.manualDropZone.classList.add('drag-over'); });
      refs.manualDropZone.addEventListener('dragleave', () => refs.manualDropZone.classList.remove('drag-over'));
      refs.manualDropZone.addEventListener('drop', event => { event.preventDefault(); refs.manualDropZone.classList.remove('drag-over'); addManualFiles(event.dataTransfer?.files); });
    }

    renderMessageMatrix();
    renderDimensions();
    renderAlerts();
    renderPredictions();
    renderEventDiagnostics();
    renderPatterns();
    renderAudit();
    renderConfirmedErrors();
    renderFalsePositives();
    renderManualBrain();
    switchAIView('errors');
    updateModelSummary();
    loadManualBrain().then(() => { if (getRawHistory()) analyzeCurrent({ skipAutoLearn:true }); });

    document.addEventListener('flightflow:history-session-reset', event => resetCurrentHistoryAI(event.detail || {}));

    const original = el('originalFullText');
    if (original) {
      const observer = new MutationObserver(scheduleAnalysisFromHistory);
      observer.observe(original, { childList: true, characterData: true, subtree: true });
    }
    const selected = el('selectedFileLabel');
    if (selected) {
      const observer = new MutationObserver(scheduleAnalysisFromHistory);
      observer.observe(selected, { childList: true, characterData: true, subtree: true });
    }

    if (getRawHistory()) scheduleAnalysisFromHistory();

    const query = new URLSearchParams(location.search);
    if (query.get('ffai-test') === '1') {
      const report = runSelfTests();
      document.documentElement.setAttribute('data-ffai-test-result', report.failed ? 'fail' : 'pass');
      const marker = document.createElement('meta');
      marker.id = 'ffai-test-marker';
      marker.dataset.total = String(report.total);
      marker.dataset.passed = String(report.passed);
      marker.dataset.failed = String(report.failed);
      document.head.appendChild(marker);
    }
  }

  window.__flightflowAI = Object.freeze({
    version: AI_ENGINE_VERSION,
    analyzeRaw,
    parseHistory,
    runSelfTests,
    getModel: () => JSON.parse(JSON.stringify(model)),
    getCurrentAnalysis: () => currentAnalysis ? JSON.parse(JSON.stringify(currentAnalysis)) : null,
    expectedNextMessages: analysis => expectedNextMessages(analysis),
    inferCycleState: analysis => inferCycleState(analysis),
    answerQuestion: (question, analysis) => answerAIQuestion(question, analysis),
    buildReport: (analysis, name) => buildAIReportText(analysis, name),
    getManualBrain: () => JSON.parse(JSON.stringify(manualBrain)),
    searchManuals: query => searchManualBrain(query),
    normativeSupport: alert => normativeSupportFor(alert),
    findMessageAnywhereAfter: (events, startIndex, expectedTokens, matcher) => findMessageAnywhereAfter(events, startIndex, expectedTokens, matcher),
    applyFalsePositiveMask: analysis => applyFalsePositiveMask(analysis),
    getConfirmedErrors: () => JSON.parse(JSON.stringify(model.confirmedErrors || [])),
    getFalsePositives: () => JSON.parse(JSON.stringify(model.falsePositives || [])),
    resetCurrentSession: detail => resetCurrentHistoryAI(detail || { mode: 'source' }),
    refreshReviewUI: view => { const target = view || activeAIView; refreshVisibleAIReview(target); return { view: target, active: activeAlertsBase().length, confirmed: confirmedForCurrent().length, falsePositives: falsePositivesForCurrent().length }; }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindDom, { once: true });
  else bindDom();
})();
