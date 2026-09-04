(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUS_MAP = Object.freeze({
    INA: 'INATIVO',
    PRE: 'PRÉ-ATIVO',
    ATV: 'ATIVO',
    ACT: 'ATIVO',
    TER: 'TERMINADO',
    ARQ: 'ARQUIVADO',
    CNL: 'CANCELADO'
  });

  const TRACKED_FIELDS = Object.freeze([
    'receivedAt', 'creationMethod', 'callsign', 'rule', 'adep', 'ades', 'eobt', 'etn',
    'status', 'ssr', 'dof', 'messageType', 'originator', 'recipients', 'operation',
    'idPlano', 'rfl', 'cfl', 'aircraftType', 'speedWake', 'route', 'sid', 'star',
    'runwayDeparture', 'runwayArrival', 'groundState', 'authorizationState',
    'sector', 'service', 'position', 'environment', 'protocol', 'flightType',
    'planType', 'remarks', 'etot', 'registration', 'equipment', 'surveillance',
    'rvsm', 'pbn', 'arrivalTime'
  ]);

  function clean(value) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\u0000/g, '').replace(/[\t ]+$/gm, '').trim();
  }

  function safeMatch(text, regex, group = 1) {
    const match = regex.exec(text || '');
    return match ? clean(match[group]) : '';
  }

  function normalizeText(text) {
    return String(text || '')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u0000/g, '')
      .replace(/\u00a0/g, ' ');
  }

  function decodeHistoryBuffer(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      try {
        return new TextDecoder('windows-1252').decode(bytes);
      } catch (_) {
        let result = '';
        for (const b of bytes) result += String.fromCharCode(b);
        return result;
      }
    }
  }

  function splitTokens(line) {
    if (!line) return [];
    return line.trim().split(/\s{2,}|\t+/).map(clean).filter(Boolean);
  }

  function parseDateTime(block) {
    const eventLine = /data:\s*([^\n]+?)\s+hora:\s*([^\n]+?)\s+posi(?:ç|c)ão:\s*([^\n]+?)\s+ambiente:\s*([^\n]+)/i.exec(block);
    if (!eventLine) return { date: '', time: '', position: '', environment: '', timestamp: '' };
    const date = clean(eventLine[1]);
    const time = clean(eventLine[2]);
    const position = clean(eventLine[3]);
    const environment = clean(eventLine[4]);
    return { date, time, position, environment, timestamp: `${date} ${time}`.trim() };
  }

  function tag(content, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Alguns ACK chegam em uma única linha com vários pares -TAG VALOR.
    // A captura termina antes do próximo marcador ou do fim da linha.
    return safeMatch(content, new RegExp(`(?:^|[ \t])-${escaped}[ \t]+([^\n]*?)(?=[ \t]+-[A-Z][A-Z0-9]*[ \t]|[ \t]*$)`, 'mi'));
  }

  function parseHeader(headerText) {
    const text = normalizeText(headerText);
    const headerDate = safeMatch(text, /\*\s*Data:\s*([^\n*]+?)(?:\s{2,}|\t+)Hora/i);
    const headerTime = safeMatch(text, /Hora\s*([^\n*]+)/i);
    return {
      reportDate: headerDate,
      reportTime: headerTime,
      callsign: safeMatch(text, /Indicativo do plano:\s*([A-Z0-9-]+)/i),
      planNumber: safeMatch(text, /N[úu]mero:\s*([A-Z0-9-]+)/i),
      adep: safeMatch(text, /ADEP:\s*([A-Z0-9]{4})/i),
      dof: safeMatch(text, /DOF:\s*([0-9]{6,8})/i),
      eobt: safeMatch(text, /EOBT:\s*([0-9]{4})/i)
    };
  }

  function parsePoints(block) {
    const pointsLine = safeMatch(block, /^PONTOS\s*:\s*(.+)$/mi);
    if (!pointsLine) return null;
    const points = splitTokens(pointsLine);
    const etim = splitTokens(safeMatch(block, /^ETIM\s*:\s*(.+)$/mi));
    const cfl = splitTokens(safeMatch(block, /^CFL\s*:\s*(.+)$/mi));
    const rows = points.map((point, i) => ({
      point,
      estimate: etim[i] || '',
      cfl: cfl[i] || ''
    }));
    return rows.length ? rows : null;
  }

  function detectMessageType(operation, content, block) {
    const msgtyp = tag(content, 'MSGTYP');
    const title = tag(content, 'TITLE');
    const eventTag = tag(content, 'EVENT');
    const ttyType = safeMatch(content, /^\s*\((FPV[A-Z/]+)/i).toUpperCase();
    const parenthetical = safeMatch(content, /^\s*\((FPL|DLA|CHG|CNL|DEP|ARR|EST|ACP|LAM|ABI|ACT|REV|RQP|PAC|CRQ|CRP)/i).toUpperCase();
    const opType = safeMatch(operation, /Mensagem\s+(FPL|DLA|CHG|CNL|DEP|ARR|EST|ACP|LAM|ABI|ACT|REV|RQP|PAC|CRQ|CRP|INF|ATS)/i).toUpperCase();
    const explicit = safeMatch(block, /^Mensagem[ \t]*:[ \t]*([^\n]*)$/mi).toUpperCase();
    if (title.toUpperCase() === 'ACK') return `ACK/${(msgtyp || parenthetical || opType || 'ATS').toUpperCase()}`;
    if (title.toUpperCase() === 'INF' && eventTag) return `INF ${eventTag.toUpperCase()}`;
    if (ttyType) return ttyType;
    if (msgtyp) return msgtyp.toUpperCase();
    if (title && title.toUpperCase() !== 'INF') return title.toUpperCase();
    if (parenthetical) return parenthetical;
    if (opType && opType !== 'ATS' && opType !== 'INF') return opType;
    if (explicit) return explicit;
    if (/Atualiza(?:ç|c)ão de Estimados/i.test(operation)) return 'ESTIMADOS';
    if (/Transi(?:ç|c)ão de Estados/i.test(operation)) return 'ESTADO';
    if (/Correla(?:ç|c)ão/i.test(operation)) return 'CORRELAÇÃO';
    if (/Arquivamento/i.test(operation)) return 'ARQUIVAMENTO';
    if (/Libera(?:ç|c)ão de SSR/i.test(operation)) return 'SSR';
    return 'EVENTO';
  }

  function detectProtocol(operation, content) {
    if (/ADEXP/i.test(operation)) return 'ADEXP';
    if (/TTY/i.test(operation)) return 'TTY';
    if (/^\s*\(/.test(content)) return 'ATS/ICAO';
    if (/^\s*-TITLE/m.test(content)) return 'FORMATO ESTRUTURADO';
    if (/Mensagem ATS/i.test(operation)) return 'CANAL ATS';
    if (/Mensagem (?:LAM|PAC|CRQ|CRP|RQP|INF)/i.test(operation)) return 'MENSAGEM OPERACIONAL';
    return 'EVENTO INTERNO';
  }

  function parseEtnFromPlanTable(block) {
    // O ETN é lido somente na tabela fixa do histórico:
    // ETB | ETN | FIRN | FIRX | IFL | CFL | BPN | BPX.
    // Isso impede que qualquer outro texto contendo "ETN" seja interpretado como horário estimado.
    const lines = normalizeText(block).split('\n');
    for (let index = 0; index < lines.length - 1; index += 1) {
      const header = lines[index];
      if (!/^\s*ETB\s+ETN\s+FIRN\s+FIRX\s+IFL\s+CFL\s+BPN\s+BPX\s*$/i.test(header)) continue;
      const columns = [...header.matchAll(/\S+/g)].map(match => ({ name: match[0].toUpperCase(), start: match.index }));
      const etnIndex = columns.findIndex(column => column.name === 'ETN');
      if (etnIndex < 0 || etnIndex >= columns.length - 1) continue;
      const start = columns[etnIndex].start;
      const end = columns[etnIndex + 1].start;
      const valueLine = lines[index + 1] || '';
      const value = clean(valueLine.slice(start, end));
      if (/^\d{4}$/.test(value)) return value;
    }
    return '';
  }

  function parseCreationFields(block) {
    const ssrMatch = /^C[óo]digo SSR solicitado[ \t]*:[ \t]*([A-Z0-9]*)[ \t]+alocado[ \t]*:[ \t]*([A-Z0-9]*)[ \t]*$/im.exec(block);
    const requested = ssrMatch ? clean(ssrMatch[1]) : '';
    const allocated = ssrMatch ? clean(ssrMatch[2]) : '';
    const speed = safeMatch(block, /Velocidade[ \t]*:[ \t]*([A-Z0-9]+)/i);
    const wake = safeMatch(block, /Turbul[êe]ncia[ \t]*:[ \t]*([A-Z0-9]+)/i);
    const rfl = safeMatch(block, /N[íi]vel[ \t]*:[ \t]*F?([0-9]{2,3})/i);
    return {
      callsign: safeMatch(block, /Indicativo[ \t]*:[ \t]*([A-Z0-9-]+)/i),
      flightType: safeMatch(block, /Tipo de voo[ \t]*:[ \t]*([A-Z0-9]+)/i),
      rule: safeMatch(block, /Regra de voo[ \t]*:[ \t]*([A-Z0-9]+)/i),
      aircraftType: safeMatch(block, /Tipo de aeronave[ \t]*:[ \t]*([A-Z0-9]+)/i),
      ades: safeMatch(block, /ADES[ \t]*:[ \t]*([A-Z0-9]{4})/i),
      adep: safeMatch(block, /ADEP[ \t]*:[ \t]*([A-Z0-9]{4})/i),
      speedWake: [speed, wake].filter(Boolean).join('/'),
      dof: safeMatch(block, /Data do voo[ \t]*:[ \t]*([0-9]{6,8})/i),
      eobt: safeMatch(block, /EOBT[ \t]*:[ \t]*([0-9]{4})/i),
      etn: parseEtnFromPlanTable(block),
      planType: safeMatch(block, /Tipo de Plano[ \t]*:[ \t]*([A-Z0-9]+)/i),
      rfl: rfl ? `F${rfl}` : '',
      cfl: rfl ? `F${rfl}` : '',
      ssr: allocated || requested,
      route: safeMatch(block, /^Rota[ \t]*:[ \t]*(.*)$/mi),
      remarks: safeMatch(block, /^Observa(?:ç|c)ão[ \t]*:[ \t]*(.*)$/mi),
      sid: safeMatch(block, /^SID[ \t]*:[ \t]*(.*)$/mi),
      star: safeMatch(block, /^STAR[ \t]*:[ \t]*(.*)$/mi),
      idPlano: safeMatch(block, /^IDPLANO[ \t]*:[ \t]*([A-Z0-9]+)/mi),
      equipment: safeMatch(block, /Equip\. aux\.[ \t]*:[ \t]*([A-Z0-9]+)/i),
      surveillance: safeMatch(block, /Equip\. vig\.[ \t]*:[ \t]*([A-Z0-9]+)/i),
      registration: safeMatch(block, /(?:REG\/|Matr[ií]cula[ \t]*:[ \t]*)([A-Z0-9-]+)/i)
    };
  }

  function parseStructuredFields(content, block) {
    const cfl = safeMatch(content, /-CFL\s*\n\s*-FL\s+F?([0-9]{2,3})/i) || safeMatch(block, /N[íi]vel Autorizado:\s*F?([0-9]{2,3})/i);
    const ssr = tag(content, 'SSRCODE');
    const rule = tag(content, 'FLTRUL');
    const type = tag(content, 'ARCTYP');
    const wake = tag(content, 'WKTRC');
    const speed = safeMatch(tag(content, 'ROUTE'), /^([KNM][0-9]{4})/i);
    const idPlano = tag(content, 'IDPLANO') || safeMatch(content, /IDPLANO[\s/]+([A-Z0-9]+)/i);
    const rawRoute = tag(content, 'ROUTE');
    return {
      callsign: tag(content, 'ARCID'),
      adep: tag(content, 'ADEP'),
      ades: tag(content, 'ADES'),
      eobt: tag(content, 'EOBT'),
      dof: tag(content, 'EOBD'),
      ssr,
      rule,
      aircraftType: type,
      speedWake: [speed, wake].filter(Boolean).join('/'),
      route: rawRoute,
      cfl: cfl ? `F${cfl}` : '',
      idPlano,
      sid: tag(content, 'SID'),
      star: tag(content, 'STAR'),
      runwayDeparture: tag(content, 'RWYDEP'),
      runwayArrival: tag(content, 'RWYARR'),
      etot: tag(content, 'ETOT'),
      registration: tag(content, 'REG'),
      clearanceTime: tag(content, 'CLG'),
      pushbackTime: tag(content, 'PBG'),
      taxiTime: tag(content, 'TXC'),
      holdingTime: tag(content, 'ENDHLDT'),
      takeoffClearanceTime: tag(content, 'DCDT'),
      equipment: tag(content, 'CEQPT'),
      surveillance: tag(content, 'SEQPT')
    };
  }

  function parseIcaoFields(content) {
    const output = {};
    output.dof = safeMatch(content, /DOF\/([0-9]{6,8})/i);
    output.idPlano = safeMatch(content, /IDPLANO\s+([A-Z0-9]+)/i);

    let m = /\(DLA-([A-Z0-9]+)-([A-Z0-9]{4})([0-9]{4})-([A-Z0-9]{4})/i.exec(content);
    if (m) Object.assign(output, { callsign: m[1], adep: m[2], eobt: m[3], ades: m[4] });

    m = /\(FPL-([A-Z0-9]+)-([A-Z])[^\n]*\n-([A-Z0-9]+)\/[^\n]*\n-([A-Z0-9]{4})([0-9]{4})\n-([^\n]+)\n-([A-Z0-9]{4})([0-9]{4})/i.exec(content);
    if (m) {
      const speedLevelRoute = clean(m[6]);
      Object.assign(output, {
        callsign: m[1], rule: m[2], aircraftType: m[3], adep: m[4], eobt: m[5],
        ades: m[7], route: speedLevelRoute,
        rfl: safeMatch(speedLevelRoute, /F([0-9]{2,3})/i) ? `F${safeMatch(speedLevelRoute, /F([0-9]{2,3})/i)}` : ''
      });
    }

    m = /\(ARR[^\n]*?-([A-Z0-9]+)-([A-Z0-9]{4})-([A-Z0-9]{4})([0-9]{4})\)/i.exec(content);
    if (m) Object.assign(output, { callsign: m[1], adep: m[2], ades: m[3], arrivalTime: m[4] });

    m = /\(DEP-?([A-Z0-9]+)?-?([A-Z0-9]{4})?([0-9]{4})?/i.exec(content);
    if (m && m[1]) output.callsign = m[1];
    return output;
  }

  function parseStatus(block) {
    const stateLine = /^Estado:\s*([A-Z]{3})\b([^\n]*)$/mi.exec(block);
    if (!stateLine) return { statusCode: '', status: '', sector: '' };
    const statusCode = clean(stateLine[1]).toUpperCase();
    const tail = clean(stateLine[2]);
    const currentSector = safeMatch(tail, /atual:\s*([^\n]+?)(?:\s+seguinte:|$)/i);
    return { statusCode, status: STATUS_MAP[statusCode] || statusCode, sector: currentSector };
  }

  function parseBlock(block, index) {
    const text = normalizeText(block);
    const operation = safeMatch(text, /^OPERA(?:Ç|C)ÃO\s*:\s*(.+)$/mi) || `Registro ${index + 1}`;
    const eventTime = parseDateTime(text);
    const statusInfo = parseStatus(text);
    const content = safeMatch(text, /^Conte(?:ú|u)do\s*:\s*\n([\s\S]*)$/mi);
    const creation = parseCreationFields(text);
    const structured = parseStructuredFields(content, text);
    const icao = parseIcaoFields(content);
    const originator = safeMatch(text, /^Originador\s*:\s*([^\n]*)$/mi);
    const recipients = safeMatch(text, /^Destinat(?:á|a)rios\s*:\s*([^\n]*)$/mi);
    const reception = safeMatch(text, /^Data de Recep(?:ç|c)ão\s*:\s*([^\n]*)$/mi);
    const currentState = safeMatch(text, /^Estado atual:\s*([^\n]+)$/mi);
    const previousState = safeMatch(text, /^Estado anterior:\s*([^\n]+)$/mi);
    const isGroundState = /Piloto|Push|Taxi|Holding|Decolagem|Pouso/i.test(currentState);
    const points = parsePoints(text);
    const messageType = detectMessageType(operation, content, text);
    const protocol = detectProtocol(operation, content);
    const operationLower = operation.toLowerCase();
    const creationMethod = /cria(?:ç|c)ão/i.test(operation) ? operation : '';

    const updates = Object.assign(
      {},
      nonEmptyObject(creation),
      nonEmptyObject(structured),
      nonEmptyObject(icao),
      nonEmptyObject({
        receivedAt: reception || eventTime.timestamp,
        creationMethod,
        operation,
        messageType,
        originator,
        recipients,
        status: statusInfo.status,
        statusCode: statusInfo.statusCode,
        sector: statusInfo.sector,
        position: eventTime.position,
        environment: eventTime.environment,
        protocol,
        groundState: isGroundState ? currentState : '',
        authorizationState: currentState && !isGroundState ? currentState : '',
        previousControlState: previousState,
        routePoints: points,
        reportReason: safeMatch(text, /^MOTIVO\s*:\s*([^\n]+)$/mi)
      }),
      { rawMessage: content, rawBlock: text }
    );

    const equipmentText = String(updates.equipment || creation.equipment || structured.equipment || '');
    const remarksText = String(updates.remarks || creation.remarks || content || '');
    if (!updates.rvsm && /W/i.test(equipmentText)) updates.rvsm = 'W';
    if (!updates.pbn) {
      if (/PBN\//i.test(remarksText)) {
        const hasG = /G/i.test(equipmentText);
        const hasR = /R/i.test(equipmentText) || /PBN\/[A-Z0-9]*[A-Z]/i.test(remarksText);
        updates.pbn = hasG && hasR ? 'GR' : (hasR ? 'R' : (hasG ? 'G' : 'R'));
      } else if (/\bG\b/i.test(equipmentText)) updates.pbn = 'G';
    }
    if (!updates.registration) updates.registration = safeMatch(remarksText, /REG\/([A-Z0-9-]+)/i);
    if (/libera(?:ç|c)ão de SSR/i.test(operationLower)) updates.ssr = 'LIBERADO';
    return {
      index,
      date: eventTime.date,
      time: eventTime.time,
      timestamp: eventTime.timestamp,
      operation,
      content,
      rawBlock: text,
      statusCode: statusInfo.statusCode,
      messageType,
      protocol,
      updates
    };
  }

  function nonEmptyObject(object) {
    const output = {};
    for (const [key, value] of Object.entries(object || {})) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string' && value.trim() === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;
      output[key] = value;
    }
    return output;
  }

  function valuesEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) || typeof a === 'object') {
      try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; }
    }
    return String(a ?? '') === String(b ?? '');
  }

  function diffSnapshots(previous, current) {
    const changes = [];
    for (const key of TRACKED_FIELDS) {
      const before = previous ? previous[key] : undefined;
      const after = current ? current[key] : undefined;
      if (!valuesEqual(before, after) && after !== undefined && after !== '') {
        changes.push({ key, before: before ?? '', after });
      }
    }
    return changes;
  }

  function deriveFPV(snapshot, event, previousFPV) {
    const points = snapshot.routePoints || [];
    const dv = points.slice(0, 4).map(row => {
      const chunks = [row.point, row.cfl ? `F${String(row.cfl).replace(/^F/i, '')}` : '', row.estimate].filter(Boolean);
      return chunks.join(' · ');
    });
    while (dv.length < 4) dv.push('');

    const eventTime = event.time ? event.time.slice(0, 5).replace(':', '') : '';
    const status = snapshot.status || '';
    const isActive = ['ATIVO', 'TERMINADO', 'ARQUIVADO'].includes(status);
    const entryTime = isActive ? (previousFPV && previousFPV.entryTime ? previousFPV.entryTime : eventTime) : '';
    const exitTime = ['TERMINADO', 'ARQUIVADO'].includes(status) ? eventTime : '';
    const sectorName = clean(snapshot.sector).split(/\s+/)[0];
    const service = snapshot.rule === 'V' ? 'VIG VFR' : (snapshot.rule ? 'VIG IFR' : '');
    const annotations = [
      snapshot.groundState,
      snapshot.authorizationState,
      snapshot.runwayDeparture ? `RWY DEP ${snapshot.runwayDeparture}` : '',
      snapshot.runwayArrival ? `RWY ARR ${snapshot.runwayArrival}` : ''
    ].filter(Boolean).join(' | ');
    const eta = snapshot.arrivalTime || (points.length ? String(points[points.length - 1].estimate || '').replace(/^\d{2}-/, '').replace(':', '') : '');
    const routeToken = (snapshot.sid || snapshot.route || '').split(/\s+/).filter(Boolean)[0] || '';
    const speed = String(snapshot.speedWake || '').split('/')[0].replace(/^[KNM]/, '');
    const wake = String(snapshot.speedWake || '').split('/')[1] || '';
    const fpv = {
      acft: snapshot.callsign || '',
      rfl: snapshot.rfl || '',
      cfl: snapshot.cfl || '',
      proc: snapshot.adep || '',
      dest: snapshot.ades || '',
      awy: routeToken,
      type: snapshot.aircraftType || '',
      velWake: [speed, wake].filter(Boolean).join('/'),
      ssr: snapshot.ssr || '',
      eobtEta: [snapshot.eobt, eta].filter(Boolean).join('/'),
      dv,
      orgao: inferFpvOrgan(snapshot, event),
      data: formatDof(snapshot.dof),
      annotations,
      rmk: [snapshot.idPlano ? `IDPLANO ${snapshot.idPlano}` : '', snapshot.remarks || ''].filter(Boolean).join(' | '),
      sectorTimes: sectorName && entryTime ? `${sectorName}/${entryTime}${exitTime ? `/${exitTime}` : ''}` : '',
      service,
      operator: snapshot.position || '',
      entryTime,
      exitTime,
      visible: event.progress >= 0.08 || /CRQ|CRP|PAC|DEP|ARR/.test(event.messageType || '')
    };
    fpv.changes = [];
    if (previousFPV) {
      for (const key of Object.keys(fpv)) {
        if (key === 'changes') continue;
        if (!valuesEqual(previousFPV[key], fpv[key]) && fpv[key] !== '') {
          fpv.changes.push({ key, before: previousFPV[key] ?? '', after: fpv[key] });
        }
      }
    }
    return fpv;
  }

  function inferFpvOrgan(snapshot, event) {
    const addresses = `${snapshot.originator || ''} ${snapshot.recipients || ''}`;
    if (/ZTZX/.test(addresses)) return event.progress > 0.75 ? `TWR ${snapshot.ades || ''}`.trim() : `TWR ${snapshot.adep || ''}`.trim();
    if (/ZXCS|ZAZX/.test(addresses)) return event.progress > 0.75 ? `APP ${snapshot.ades || ''}`.trim() : `APP ${snapshot.adep || ''}`.trim();
    if (event.progress >= 0.08) return `APP ${snapshot.adep || ''}`.trim();
    return '';
  }

  function formatDof(dof) {
    const value = String(dof || '').replace(/\D/g, '');
    if (value.length === 6) return `${value.slice(4, 6)}/${value.slice(2, 4)}/${value.slice(0, 2)}`;
    if (value.length === 8) return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(2, 4)}`;
    return dof || '';
  }

  function initialProgressFor(event, activeOrdinal, activeCount, inactiveOrdinal, inactiveCount) {
    const status = event.snapshot.status || '';
    const op = event.operation || '';
    const msg = event.messageType || '';
    const ground = event.snapshot.groundState || '';
    if (status === 'ARQUIVADO' || /Arquivamento/i.test(op)) return 1;
    if (status === 'TERMINADO' || /^ARR/.test(msg)) return 0.965;
    if (status === 'ATIVO') {
      if (/Pouso Autorizado/i.test(ground) || /INF ARC/i.test(op)) return 0.865;
      if (/DEP/.test(msg)) return Math.max(0.41, 0.41 + (activeOrdinal / Math.max(activeCount - 1, 1)) * 0.25);
      const ratio = activeOrdinal / Math.max(activeCount - 1, 1);
      return 0.36 + ratio * 0.48;
    }
    if (status === 'PRÉ-ATIVO') {
      if (/Piloto Autorizado/i.test(ground)) return 0.13;
      if (/Push-Back/i.test(ground)) return 0.17;
      if (/Taxi Autorizado/i.test(ground)) return 0.23;
      if (/Holding Point/i.test(ground)) return 0.29;
      if (/Decolagem Autorizada/i.test(ground)) return 0.33;
      if (/CRQ|CRP/.test(msg)) return 0.11;
      if (/Pré-Ativação/i.test(op)) return 0.085;
      return 0.10;
    }
    if (status === 'INATIVO' || !status) {
      const ratio = inactiveOrdinal / Math.max(inactiveCount - 1, 1);
      return 0.025 + ratio * 0.045;
    }
    return 0.03;
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  function isDepartureCorrelationEvent(event) {
    const text = normalizeSearchText([
      event && event.operation,
      event && event.messageType,
      event && event.content,
      event && event.rawBlock
    ].filter(Boolean).join('\n'));
    const explicitDepartureCorrelation = /DECOLAGEM\s*(?:-|\/|:)\s*CORRELACAO|DECOLAGEM\s+CORRELACAO/.test(text);
    const automaticCorrelation = /CORRELACAO(?:\/DESCORRELACAO)?\s+AUTOMATICA/.test(text) &&
      /CORRELACIONADO\s*:\s*SIM/.test(text);
    return Boolean(event && event.snapshot && event.snapshot.status === 'ATIVO' &&
      (explicitDepartureCorrelation || automaticCorrelation));
  }

  function applyDepartureCorrelationGate(events) {
    if (!Array.isArray(events) || !events.length) return events;
    const triggerIndex = events.findIndex(isDepartureCorrelationEvent);
    const groundStart = 0.018;
    const runwayHold = 0.105;
    const takeoffStart = 0.120;

    if (triggerIndex < 0) {
      // Regra operacional conservadora: sem DECOLAGEM-CORRELAÇÃO, a aeronave não abandona a pista.
      events.forEach(event => {
        const semantic = Math.max(0, Math.min(1, Number(event.progress) || 0));
        event.motionProgress = Number((groundStart + Math.min(1, semantic / .36) * (runwayHold - groundStart)).toFixed(4));
        event.departureCorrelationReceived = false;
      });
      return events;
    }

    const triggerSemantic = Math.max(.0001, Number(events[triggerIndex].progress) || .36);
    events.forEach((event, index) => {
      const semantic = Math.max(0, Math.min(1, Number(event.progress) || 0));
      let motionProgress;
      if (index < triggerIndex) {
        const ratio = Math.min(1, semantic / triggerSemantic);
        motionProgress = groundStart + ratio * (runwayHold - groundStart);
      } else {
        const ratio = Math.max(0, Math.min(1, (semantic - triggerSemantic) / Math.max(.0001, 1 - triggerSemantic)));
        motionProgress = takeoffStart + ratio * (1 - takeoffStart);
      }
      event.motionProgress = Number(motionProgress.toFixed(4));
      event.departureCorrelationReceived = index >= triggerIndex;
      event.departureCorrelationEvent = index === triggerIndex;
    });
    return events;
  }

  function stageForProgress(progress, event) {
    if (progress >= 0.995) return { id: 'archived', label: 'ARQUIVADO', scene: 'Registro concluído e arquivado.' };
    if (progress >= 0.94) return { id: 'landed', label: 'POUSO E TÉRMINO', scene: 'A aeronave pousa, libera a pista e o plano é encerrado.' };
    if (progress >= 0.82) return { id: 'approach', label: 'DESCIDA / APROXIMAÇÃO', scene: 'A aeronave entra na terminal de chegada e recebe os eventos finais.' };
    if (progress >= 0.57) return { id: 'cruise', label: 'CRUZEIRO', scene: 'A aeronave progride na rota entre os órgãos de controle.' };
    if (progress >= 0.43) return { id: 'climb', label: 'SUBIDA', scene: 'A aeronave sobe após a decolagem e entra na fase em rota.' };
    if (progress >= 0.35) return { id: 'takeoff', label: 'DECOLAGEM', scene: 'A aeronave acelera na pista e inicia o voo.' };
    if (progress >= 0.27) return { id: 'holding', label: 'PONTO DE ESPERA', scene: 'A aeronave aguarda ou recebe autorização para ingressar na pista.' };
    if (progress >= 0.18) return { id: 'taxi', label: 'TÁXI', scene: 'A aeronave se desloca pelo pátio e taxiways.' };
    if (progress >= 0.14) return { id: 'pushback', label: 'PUSHBACK', scene: 'A aeronave inicia o afastamento da posição de estacionamento.' };
    if (progress >= 0.075) return { id: 'preactive', label: 'PRÉ-ATIVAÇÃO / AUTORIZAÇÃO', scene: 'O plano é distribuído e preparado para a operação.' };
    return { id: 'planning', label: 'PLANEJAMENTO / PÁTIO', scene: 'A aeronave permanece no pátio enquanto o plano é criado e atualizado.' };
  }

  function describeEvent(event) {
    const s = event.snapshot;
    const actors = [s.originator, s.recipients].filter(Boolean).join(' → ');
    const message = event.messageType && event.messageType !== 'EVENTO' ? `Mensagem ${event.messageType}` : event.operation;
    const status = s.status ? `Estado ${s.status}` : 'sem alteração de estado operacional';
    const movement = event.stage.scene;
    const exchange = actors ? `${message} trafega em ${actors}, no formato ${event.protocol}.` : `${message} é processada como ${event.protocol}.`;
    return `${movement} ${exchange} O plano permanece em ${status}.`;
  }

  function parseHistoryText(inputText, options = {}) {
    const text = normalizeText(inputText);
    const segments = text.split(/^\s*#{20,}\s*$/m).map(s => s.trim()).filter(Boolean);
    let headerText = '';
    let blockTexts = [];
    if (segments.length && !/^OPERA(?:Ç|C)ÃO\s*:/mi.test(segments[0])) {
      headerText = segments[0];
      blockTexts = segments.slice(1);
    } else {
      blockTexts = segments;
    }
    const header = parseHeader(headerText || text.slice(0, 1000));
    const rawEvents = blockTexts.map(parseBlock).filter(event => event.operation);
    if (!rawEvents.length) throw new Error('Nenhum bloco de OPERAÇÃO foi reconhecido no arquivo.');

    let persistent = nonEmptyObject({
      callsign: header.callsign,
      adep: header.adep,
      dof: header.dof,
      eobt: header.eobt
    });
    let previousSnapshot = {};
    const events = [];

    for (const rawEvent of rawEvents) {
      const persistentUpdates = nonEmptyObject(rawEvent.updates);
      // Campos eventuais são redefinidos a cada registro para não parecerem mensagens ainda em trânsito.
      const eventSpecific = {
        operation: rawEvent.operation,
        messageType: rawEvent.messageType,
        originator: rawEvent.updates.originator || '',
        recipients: rawEvent.updates.recipients || '',
        receivedAt: rawEvent.updates.receivedAt || rawEvent.timestamp,
        protocol: rawEvent.protocol
      };
      const carryUpdates = Object.assign({}, persistentUpdates);
      delete carryUpdates.operation;
      delete carryUpdates.messageType;
      delete carryUpdates.originator;
      delete carryUpdates.recipients;
      delete carryUpdates.receivedAt;
      delete carryUpdates.protocol;
      delete carryUpdates.rawMessage;
      delete carryUpdates.rawBlock;
      persistent = Object.assign({}, persistent, carryUpdates);
      const snapshot = Object.assign({}, persistent, eventSpecific);
      const event = Object.assign({}, rawEvent, { snapshot });
      event.changes = diffSnapshots(previousSnapshot, snapshot);
      events.push(event);
      previousSnapshot = snapshot;
    }

    const activeCount = events.filter(e => e.snapshot.status === 'ATIVO').length;
    const inactiveCount = events.filter(e => e.snapshot.status === 'INATIVO' || !e.snapshot.status).length;
    let activeOrdinal = 0;
    let inactiveOrdinal = 0;
    let previousProgress = 0;
    for (const event of events) {
      if (event.snapshot.status === 'ATIVO') activeOrdinal += 1;
      if (event.snapshot.status === 'INATIVO' || !event.snapshot.status) inactiveOrdinal += 1;
      let progress = initialProgressFor(event, Math.max(activeOrdinal - 1, 0), activeCount, Math.max(inactiveOrdinal - 1, 0), inactiveCount);
      progress = Math.max(previousProgress, Math.min(1, progress));
      event.progress = Number(progress.toFixed(4));
      event.stage = stageForProgress(event.progress, event);
      previousProgress = event.progress;
    }
    applyDepartureCorrelationGate(events);

    let previousFPV = null;
    for (const event of events) {
      event.fpv = deriveFPV(event.snapshot, event, previousFPV);
      event.description = describeEvent(event);
      previousFPV = event.fpv;
    }

    const meta = {
      sourceFormat: 'SAGITARIO-TXT',
      parsedAt: new Date().toISOString(),
      reportDate: header.reportDate,
      reportTime: header.reportTime,
      planNumber: header.planNumber,
      callsign: events[events.length - 1].snapshot.callsign || header.callsign,
      adep: events[events.length - 1].snapshot.adep || header.adep,
      ades: events[events.length - 1].snapshot.ades || '',
      dof: events[events.length - 1].snapshot.dof || header.dof,
      eventCount: events.length,
      parserVersion: '1.1.1',
      warnings: []
    };
    if (!meta.callsign) meta.warnings.push('Indicativo não identificado.');
    if (!meta.adep || !meta.ades) meta.warnings.push('ADEP/ADES incompletos.');
    return { meta, header, events, rawText: options.includeRawText === false ? undefined : text };
  }

  function normalizeJson(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (!data || !Array.isArray(data.events)) throw new Error('JSON inválido: a propriedade events deve ser uma lista.');
    const events = data.events.map((item, index) => {
      const snapshot = Object.assign({}, item.snapshot || item.fields || {}, {
        operation: item.operation || (item.snapshot && item.snapshot.operation) || `Evento ${index + 1}`,
        messageType: item.messageType || (item.snapshot && item.snapshot.messageType) || 'EVENTO',
        originator: item.originator || (item.snapshot && item.snapshot.originator) || '',
        recipients: item.recipients || (item.snapshot && item.snapshot.recipients) || '',
        receivedAt: item.receivedAt || item.timestamp || '',
        protocol: item.protocol || (item.snapshot && item.snapshot.protocol) || 'EVENTO INTERNO'
      });
      const progress = Number.isFinite(Number(item.progress)) ? Math.max(0, Math.min(1, Number(item.progress))) : index / Math.max(data.events.length - 1, 1);
      const event = {
        index,
        date: item.date || '',
        time: item.time || '',
        timestamp: item.timestamp || item.receivedAt || '',
        operation: snapshot.operation,
        content: item.content || item.rawMessage || '',
        rawBlock: item.rawBlock || item.content || '',
        messageType: snapshot.messageType,
        protocol: snapshot.protocol,
        snapshot,
        progress,
        stage: item.stage && item.stage.label ? item.stage : stageForProgress(progress, item),
        changes: item.changes || [],
        description: item.description || ''
      };
      return event;
    });
    applyDepartureCorrelationGate(events);
    let previous = {};
    let previousFPV = null;
    for (const event of events) {
      if (!event.changes.length) event.changes = diffSnapshots(previous, event.snapshot);
      if (!event.description) event.description = describeEvent(event);
      event.fpv = event.fpv || deriveFPV(event.snapshot, event, previousFPV);
      previous = event.snapshot;
      previousFPV = event.fpv;
    }
    return {
      meta: Object.assign({ sourceFormat: 'JSON', eventCount: events.length, parserVersion: '1.1.1', warnings: [] }, data.meta || {}),
      header: data.header || {},
      events,
      rawText: data.rawText || ''
    };
  }

  function exportNormalized(parsed, includeRaw = false) {
    const result = {
      meta: parsed.meta,
      header: parsed.header,
      events: parsed.events.map(event => ({
        index: event.index,
        timestamp: event.timestamp,
        operation: event.operation,
        messageType: event.messageType,
        protocol: event.protocol,
        progress: event.progress,
        stage: event.stage,
        snapshot: event.snapshot,
        changes: event.changes,
        fpv: event.fpv,
        description: event.description,
        content: event.content,
        ...(includeRaw ? { rawBlock: event.rawBlock } : {})
      }))
    };
    return result;
  }

  return {
    STATUS_MAP,
    TRACKED_FIELDS,
    decodeHistoryBuffer,
    parseHistoryText,
    normalizeJson,
    exportNormalized,
    formatDof,
    stageForProgress,
    applyDepartureCorrelationGate,
    isDepartureCorrelationEvent
  };
});
