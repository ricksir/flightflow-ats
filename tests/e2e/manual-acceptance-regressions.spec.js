const { test, expect } = require('@playwright/test');

test('About identification and Velox palette follow the current development line', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.FlightFlowApplicationShellController?.meta?.version === '0.2.1-dev');

  await expect(page.locator('#aboutAppName')).toHaveText('FlightFlow ATS v0.2.1-dev');
  await expect(page).toHaveTitle('FlightFlow ATS v0.2.1-dev');
  await expect(page.locator('#appTitle')).toHaveText('FlightFlow ATS');

  const paletteButton = page.locator('#paletteVeloxBtn');
  await expect(paletteButton).toBeAttached();
  await paletteButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'velox');
  await expect(paletteButton).toHaveAttribute('aria-pressed', 'true');

  const persisted = await page.evaluate(() => localStorage.getItem('flightflow-shell-palette-v1'));
  expect(persisted).toBe('velox');

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.FlightFlowApplicationShellController?.getPalette?.() === 'velox');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'velox');
});

test('pre-TER Processed Route renders a derived dashed closure without changing movement state', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.FlightFlowTerminalContextVisual);

  const result = await page.evaluate(() => {
    const originalApi = window.FlightFlowRouteProcessedV7412;
    const originalBridge = window.__FlightFlowFirBridge;
    const existing = document.querySelector('#ffrpMap');
    if (existing) existing.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'ffrpMap';
    svg.innerHTML = `
      <g class="wp declared"><circle cx="120" cy="220" r="6"></circle></g>
      <g class="wp destination"><circle cx="420" cy="510" r="7"></circle></g>
    `;
    document.body.appendChild(svg);

    const snapshot = { points: [{ ident: 'UMGUL' }] };
    const terminal = {
      active: false,
      context: { nativeIndex: 71 },
      from: { ident: 'UMGUL', geo: { lat: -23.74, lon: -49.53 } },
      destination: { ident: 'SBCT', geo: { lat: -25.53, lon: -49.17 } },
    };
    window.FlightFlowRouteProcessedV7412 = {
      getModel: () => ({ resolvedSnapshots: [snapshot], currentSnapshotIndex: 0 }),
      terminalClosureState: () => terminal,
    };
    window.__FlightFlowFirBridge = null;

    window.FlightFlowTerminalContextVisual.refresh();
    const line = svg.querySelector('.route-terminal-context');
    const before = line ? {
      x1: line.getAttribute('x1'), y1: line.getAttribute('y1'),
      x2: line.getAttribute('x2'), y2: line.getAttribute('y2'),
    } : null;

    terminal.active = true;
    window.FlightFlowTerminalContextVisual.refresh();
    const afterActive = !!svg.querySelector('.route-terminal-context');

    window.FlightFlowRouteProcessedV7412 = originalApi;
    window.__FlightFlowFirBridge = originalBridge;
    svg.remove();
    return { before, afterActive };
  });

  expect(result.before).toEqual({ x1: '120', y1: '220', x2: '420', y2: '510' });
  expect(result.afterActive).toBe(false);
});

test('pre-TER main map context uses dashed visual layer only and yields to active TER rendering', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.FlightFlowTerminalContextVisual);

  const result = await page.evaluate(() => {
    const originalApi = window.FlightFlowRouteProcessedV7412;
    const originalBridge = window.__FlightFlowFirBridge;
    const originalL = window.L;
    const snapshot = { points: [{ ident: 'UMGUL' }] };
    const terminal = {
      active: false,
      context: { nativeIndex: 71 },
      from: { ident: 'UMGUL', geo: { lat: -23.7438, lon: -49.5358 } },
      destination: { ident: 'SBCT', geo: { lat: -25.5316, lon: -49.1761 } },
    };
    const calls = [];
    const fakeMap = {};
    const fakeLayer = {
      clearLayers() { calls.push(['clear']); },
      remove() { calls.push(['remove']); },
    };
    window.L = {
      layerGroup() { return { addTo(map) { calls.push(['group', map === fakeMap]); return fakeLayer; } }; },
      polyline(points, options) {
        calls.push(['polyline', points, options]);
        return {
          bindTooltip(text) { calls.push(['tooltip', text]); return this; },
          addTo(layer) { calls.push(['add', layer === fakeLayer]); return this; },
        };
      },
    };
    window.__FlightFlowFirBridge = { realMapState: { engine: 'leaflet', map: fakeMap } };
    window.FlightFlowRouteProcessedV7412 = {
      getModel: () => ({ resolvedSnapshots: [snapshot], currentSnapshotIndex: 0 }),
      terminalClosureState: () => terminal,
    };

    window.FlightFlowTerminalContextVisual.refresh();
    const polylineCall = calls.find((entry) => entry[0] === 'polyline');
    terminal.active = true;
    window.FlightFlowTerminalContextVisual.refresh();
    const removals = calls.filter((entry) => entry[0] === 'remove').length;

    window.FlightFlowRouteProcessedV7412 = originalApi;
    window.__FlightFlowFirBridge = originalBridge;
    window.L = originalL;
    return {
      dashArray: polylineCall?.[2]?.dashArray || '',
      points: polylineCall?.[1] || [],
      removals,
    };
  });

  expect(result.dashArray).toBe('7 9');
  expect(result.points).toEqual([[-23.7438, -49.5358], [-25.5316, -49.1761]]);
  expect(result.removals).toBeGreaterThanOrEqual(1);
});
