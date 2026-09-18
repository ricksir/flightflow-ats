const { test, expect } = require('@playwright/test');

const TAM3774_ROUTE_FIXTURE = String.raw`
Indicativo do plano: TAM3774
ADEP: SBBR
ADES: SBCT
Rota: KUKOL UZ5 UMGUL

############################################################
OPERAÇÃO : Criação pelo Arquivo de RPL
data:   08/07/2026      hora:   18:00:34      posição: SPA01      ambiente: OpA

PONTOS : SBBR        UMSUB       KUKOL       SIRUL       VUDOT       EDMIN
CFL/IFL: 340         340         340         340         340         340
ETIM   : 08-23:45    08-23:50    08-23:55    09-00:04    09-00:09    09-00:11

PONTOS : 1853S04832W UDIGI       MEVIK       ASTOB       VUPOG       UPONA
CFL/IFL: 340         340         340         340         340         340
ETIM   : 09-00:13    09-00:16    09-00:25    09-00:28    09-00:28    09-00:32

PONTOS : 2127S04856W ISISA       ENPEG       PALCA       ANSOK       IMTBI
CFL/IFL: 340         340         340         340         340         340
ETIM   : 09-00:34    09-00:36    09-00:36    09-00:39    09-00:42    09-00:43
############################################################
`;

async function loadDemo(page) {
  await page.goto('/index.html', { waitUntil: 'load' });
  const overlayDemo = page.locator('#overlayDemoBtn');
  if (await overlayDemo.isVisible()) await overlayDemo.click();
  else await page.locator('#demoBtn').click();

  await expect(page.locator('#scrubber')).toBeEnabled();
  await expect(page.locator('.timeline-item')).not.toHaveCount(0);
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Pausar/, { timeout: 5_000 });
  await page.locator('#restartBtn').click();
  await expect(page.locator('#playBtn')).toHaveAttribute('title', /Reproduzir/);
}

async function readTerminalState(page) {
  return page.evaluate(() => {
    const api = window.FlightFlowRouteProcessedV7412;
    const bridge = window.__FlightFlowFirBridge;
    const model = api?.getModel?.();
    const snapshot = model?.resolvedSnapshots?.at?.(-1);
    const index = Number(bridge?.state?.index ?? -1);
    const terminal = snapshot ? api.terminalClosureState(snapshot, index) : { active: false };

    const svg = document.querySelector('#ffrpMap');
    const lines = svg ? Array.from(svg.querySelectorAll('.route-terminal')) : [];
    const underlays = svg ? Array.from(svg.querySelectorAll('.route-terminal-underlay')) : [];
    const destination = svg?.querySelector('.wp.destination circle') || null;
    const declared = svg ? Array.from(svg.querySelectorAll('.wp.declared circle')).at(-1) : null;
    const line = lines[0] || null;
    const underlay = underlays[0] || null;

    const num = (node, attr) => {
      if (!node) return null;
      const value = Number(node.getAttribute(attr));
      return Number.isFinite(value) ? value : null;
    };
    const same = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-9;

    const geometry = line && destination && declared ? {
      startMatches: same(num(line, 'x1'), num(declared, 'cx')) && same(num(line, 'y1'), num(declared, 'cy')),
      endpointMatches: same(num(line, 'x2'), num(destination, 'cx')) && same(num(line, 'y2'), num(destination, 'cy')),
      underlayMatches: Boolean(underlay)
        && same(num(line, 'x1'), num(underlay, 'x1'))
        && same(num(line, 'y1'), num(underlay, 'y1'))
        && same(num(line, 'x2'), num(underlay, 'x2'))
        && same(num(line, 'y2'), num(underlay, 'y2')),
      coords: {
        x1: num(line, 'x1'),
        y1: num(line, 'y1'),
        x2: num(line, 'x2'),
        y2: num(line, 'y2'),
      },
    } : null;

    const terminalStatus = document.querySelector('#ffrpTerminalStatus');

    return {
      index,
      expectedVisible: Boolean(terminal?.visible),
      expectedActive: Boolean(terminal?.active),
      statusHidden: terminalStatus ? terminalStatus.hidden : null,
      statusState: terminalStatus?.dataset?.state || null,
      statusText: terminalStatus?.textContent?.replace(/\s+/g, ' ').trim() || '',
      statusAria: terminalStatus?.getAttribute('aria-label') || '',
      statusFontSize: terminalStatus ? Number.parseFloat(getComputedStyle(terminalStatus).fontSize) : null,
      statusBorderStyle: terminalStatus ? getComputedStyle(terminalStatus).borderStyle : '',
      statusTransitionDuration: terminalStatus ? getComputedStyle(terminalStatus).transitionDuration : '',
      statusColor: terminalStatus ? getComputedStyle(terminalStatus).color : '',
      statusBackgroundColor: terminalStatus ? getComputedStyle(terminalStatus).backgroundColor : '',
      statusBoxShadow: terminalStatus ? getComputedStyle(terminalStatus).boxShadow : '',
      lineCount: lines.length,
      underlayCount: underlays.length,
      terminalState: line?.getAttribute('data-terminal-state') || null,
      terminalFrom: line?.getAttribute('data-terminal-from') || null,
      terminalDestination: line?.getAttribute('data-terminal-destination') || null,
      terminalEtim: line?.getAttribute('data-etim') ?? null,
      terminalCfl: line?.getAttribute('data-cfl') ?? null,
      terminalStar: line?.getAttribute('data-star') ?? null,
      geometry,
      destinationIdent: terminal?.destination?.ident || null,
      destinationLat: Number(terminal?.destination?.geo?.lat),
      destinationLon: Number(terminal?.destination?.geo?.lon),
      fromIdent: terminal?.from?.ident || null,
    };
  });
}

async function expectTerminal(page, expectedIndex, active, visible = true) {
  await expect.poll(() => page.evaluate(() => Number(window.__FlightFlowFirBridge?.state?.index ?? -1))).toBe(expectedIndex);
  await expect.poll(async () => (await readTerminalState(page)).lineCount).toBe(visible ? 1 : 0);

  const state = await readTerminalState(page);
  expect(state.expectedVisible).toBe(visible);
  expect(state.expectedActive).toBe(active);
  expect(state.lineCount).toBe(visible ? 1 : 0);
  expect(state.underlayCount).toBe(visible ? 1 : 0);

  if (visible) {
    expect(state.statusHidden).toBe(false);
    expect(state.statusState).toBe(active ? 'active' : 'preview');
    expect(state.statusText).toContain(active ? 'Destino alcançado por Ordem TER' : 'Destino previsto');
    expect(state.statusText).toContain('SBCT');
    expect(state.statusAria).toContain(active ? 'Destino alcançado por Ordem TER' : 'Destino previsto');
    expect(state.statusFontSize).toBeGreaterThanOrEqual(10.5);
    expect(state.statusBorderStyle).toBe(active ? 'solid' : 'dashed');
    expect(state.statusColor).not.toBe(state.statusBackgroundColor);
    expect(state.destinationIdent).toBe('SBCT');
    expect(state.fromIdent).toBe('UMGUL');
    expect(state.geometry).not.toBeNull();
    expect(state.geometry.startMatches).toBe(true);
    expect(state.geometry.endpointMatches).toBe(true);
    expect(state.geometry.underlayMatches).toBe(true);
    expect(state.terminalState).toBe(active ? 'active' : 'preview');
    expect(state.terminalFrom).toBe('UMGUL');
    expect(state.terminalDestination).toBe('SBCT');
    expect(state.terminalEtim).toBe('');
    expect(state.terminalCfl).toBe('');
    expect(state.terminalStar).toBe('');
  } else {
    expect(state.statusHidden).toBe(true);
    expect(state.statusState).toBeNull();
    expect(state.statusText).toBe('');
  }
  return state;
}

test('Ordem TER mantém um único fechamento UMGUL → SBCT estável em Próximo/Anterior sem frame geométrico inválido', async ({ page }) => {
  await loadDemo(page);

  const setup = await page.evaluate(async fixture => {
    const api = window.FlightFlowRouteProcessedV7412;
    const bridge = window.__FlightFlowFirBridge;
    if (!api || !bridge?.state?.parsed?.events?.length) throw new Error('FlightFlow/rota não inicializados');

    const model = api.getModel();
    if (model.passiveTimer) clearInterval(model.passiveTimer);
    model.passiveTimer = null;
    model.passiveBusy = true;

    const events = bridge.state.parsed.events;
    if (events.length < 4) throw new Error('histórico de demonstração sem eventos suficientes');

    const terIndex = events.length - 2;
    const stripTer = value => String(value || '').replace(/ORDEM\s+TER/gi, 'EVENTO FINAL');

    events.forEach((event, index) => {
      if (index === terIndex) return;
      event.operation = stripTer(event.operation);
      event.rawBlock = stripTer(event.rawBlock);
      event.content = stripTer(event.content);
      event.messageType = stripTer(event.messageType);
    });

    events[terIndex].operation = 'Ordem TER';
    events[terIndex].rawBlock = 'OPERAÇÃO : Ordem TER\nPlano encerrado por Ordem TER';
    events[terIndex].content = 'Ordem TER';
    events[terIndex].messageType = 'TER';

    await api.analyzeText(fixture, 'TAM3774-order-ter-e2e.txt');
    const context = api.terminalClosureContext();
    api.jumpToFlightEvent(terIndex - 1, { snap: true });

    return {
      terIndex,
      total: events.length,
      closureIndex: Number(context?.nativeIndex ?? -1),
      closureSource: context?.source || null,
    };
  }, TAM3774_ROUTE_FIXTURE);

  expect(setup.terIndex).toBeGreaterThan(0);
  expect(setup.terIndex + 1).toBeLessThan(setup.total);
  expect(setup.closureIndex).toBe(setup.terIndex);
  expect(setup.closureSource).toBe('native');

  await expect.poll(() => page.evaluate(() => Number(window.__FlightFlowFirBridge?.state?.index ?? -1))).toBe(setup.terIndex - 1);
  // analyzeText() é chamado diretamente pelo contrato, sem passar pelo fluxo visual
  // de seleção de fonte. O botão pode permanecer hidden mesmo com o modelo válido;
  // acione o mesmo handler sem depender dessa política de visibilidade.
  await page.locator('#ffrpOpen').evaluate(button => button.click());
  await expect(page.locator('#ffrpModal')).toBeVisible();

  await page.evaluate(() => {
    const svg = document.querySelector('#ffrpMap');
    if (!svg) throw new Error('mapa SVG da Rota Processada não encontrado');

    const sample = () => {
      const api = window.FlightFlowRouteProcessedV7412;
      const bridge = window.__FlightFlowFirBridge;
      const model = api.getModel();
      const snapshot = model.resolvedSnapshots.at(-1);
      const index = Number(bridge.state.index);
      const terminal = api.terminalClosureState(snapshot, index);
      const line = svg.querySelector('.route-terminal');
      const underlay = svg.querySelector('.route-terminal-underlay');
      const destination = svg.querySelector('.wp.destination circle');
      const declared = Array.from(svg.querySelectorAll('.wp.declared circle')).at(-1);
      const lineCount = svg.querySelectorAll('.route-terminal').length;
      const underlayCount = svg.querySelectorAll('.route-terminal-underlay').length;
      const n = (node, attr) => node ? Number(node.getAttribute(attr)) : null;
      const eq = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;

      return {
        index,
        expectedVisible: Boolean(terminal.visible),
        expectedActive: Boolean(terminal.active),
        lineCount,
        underlayCount,
        startMatches: !line || !declared ? false : eq(n(line, 'x1'), n(declared, 'cx')) && eq(n(line, 'y1'), n(declared, 'cy')),
        endpointMatches: !line || !destination ? false : eq(n(line, 'x2'), n(destination, 'cx')) && eq(n(line, 'y2'), n(destination, 'cy')),
        underlayMatches: !line || !underlay ? false
          : eq(n(line, 'x1'), n(underlay, 'x1'))
            && eq(n(line, 'y1'), n(underlay, 'y1'))
            && eq(n(line, 'x2'), n(underlay, 'x2'))
            && eq(n(line, 'y2'), n(underlay, 'y2')),
      };
    };

    window.__orderTerTerminalSamples = [];
    window.__orderTerTerminalSampling = true;
    window.__orderTerTerminalObserver = new MutationObserver(() => {
      if (window.__orderTerTerminalSamples.length < 600) window.__orderTerTerminalSamples.push(sample());
    });
    window.__orderTerTerminalObserver.observe(svg, { childList: true, subtree: true, attributes: true });

    const frame = () => {
      if (!window.__orderTerTerminalSampling) return;
      if (window.__orderTerTerminalSamples.length < 600) window.__orderTerTerminalSamples.push(sample());
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  const before = await expectTerminal(page, setup.terIndex - 1, false);

  const setVisualMode = async (theme, palette = '') => {
    await page.evaluate(({ theme, palette }) => {
      const root = document.documentElement;
      root.dataset.theme = theme;
      if (palette) root.dataset.palette = palette;
      else delete root.dataset.palette;
    }, { theme, palette });
    return readTerminalState(page);
  };

  const lightPreview = await setVisualMode('light');
  expect(lightPreview.statusBorderStyle).toBe('dashed');
  expect(lightPreview.statusFontSize).toBeGreaterThanOrEqual(10.5);
  expect(lightPreview.statusColor).not.toBe(lightPreview.statusBackgroundColor);

  const darkPreview = await setVisualMode('dark');
  expect(darkPreview.statusBorderStyle).toBe('dashed');
  expect(darkPreview.statusFontSize).toBeGreaterThanOrEqual(10.5);
  expect(darkPreview.statusColor).not.toBe(darkPreview.statusBackgroundColor);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedPreview = await readTerminalState(page);
  expect(reducedPreview.statusTransitionDuration.split(',').every(value => value.trim() === '0s')).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.locator('#nextBtn').evaluate(button => button.click());
  const atTer = await expectTerminal(page, setup.terIndex, true);

  const darkActive = await setVisualMode('dark');
  const modernActive = await setVisualMode('dark', 'velox');
  expect(modernActive.statusState).toBe('active');
  expect(modernActive.statusBorderStyle).toBe('solid');
  expect(modernActive.statusBoxShadow).not.toBe(darkActive.statusBoxShadow);

  await page.locator('#nextBtn').evaluate(button => button.click());
  const afterTer = await expectTerminal(page, setup.terIndex + 1, true);
  expect(afterTer.geometry.coords).toEqual(atTer.geometry.coords);
  expect(afterTer.destinationLat).toBe(atTer.destinationLat);
  expect(afterTer.destinationLon).toBe(atTer.destinationLon);

  await page.locator('#prevBtn').evaluate(button => button.click());
  const backToTer = await expectTerminal(page, setup.terIndex, true);
  expect(backToTer.geometry.coords).toEqual(atTer.geometry.coords);

  await page.locator('#prevBtn').evaluate(button => button.click());
  await expectTerminal(page, setup.terIndex - 1, false);

  await page.locator('#nextBtn').evaluate(button => button.click());
  const terAgain = await expectTerminal(page, setup.terIndex, true);
  expect(terAgain.geometry.coords).toEqual(atTer.geometry.coords);

  await page.waitForTimeout(120);

  const samples = await page.evaluate(() => {
    window.__orderTerTerminalSampling = false;
    window.__orderTerTerminalObserver?.disconnect?.();
    return window.__orderTerTerminalSamples || [];
  });

  expect(samples.length).toBeGreaterThan(0);
  const invalid = samples.filter(sample => {
    if (sample.expectedVisible) {
      return sample.lineCount !== 1
        || sample.underlayCount !== 1
        || !sample.startMatches
        || !sample.endpointMatches
        || !sample.underlayMatches;
    }
    return sample.lineCount !== 0 || sample.underlayCount !== 0;
  });

  expect(invalid, 'nenhum frame lógico pode ter fechamento ausente, duplicado ou desalinhado').toEqual([]);
  expect(before.expectedActive).toBe(false);
  expect(before.expectedVisible).toBe(true);
  expect(before.lineCount).toBe(1);
  expect(before.geometry.coords).toEqual(atTer.geometry.coords);
});
