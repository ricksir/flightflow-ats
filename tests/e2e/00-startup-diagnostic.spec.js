'use strict';

const { test, expect } = require('@playwright/test');

test.only('diagnóstico temporário do startup após extração de currentEvent', async ({ page }) => {
  const diagnostics = [];
  page.on('pageerror', error => diagnostics.push(`PAGEERROR: ${error.message}\n${error.stack || ''}`));
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      diagnostics.push(`CONSOLE_${message.type().toUpperCase()}: ${message.text()}`);
    }
  });

  await page.goto('/index.html?demo=1');
  await page.waitForTimeout(1500);

  const state = await page.evaluate(() => ({
    bridge: typeof window.__FlightFlowFirBridge,
    reader: typeof window.__flightflowKnowledgeEntries,
    selector: typeof window.FlightFlowCurrentEventSelector,
    parsed: window.__FlightFlowFirBridge?.state?.parsed?.events?.length ?? null,
    index: window.__FlightFlowFirBridge?.state?.index ?? null,
    scrubberDisabled: document.querySelector('#scrubber')?.disabled ?? null,
    scrubberMax: document.querySelector('#scrubber')?.max ?? null,
    toast: Array.from(document.querySelectorAll('.toast')).map(node => node.textContent).join(' | '),
  }));

  console.log('STARTUP_DIAGNOSTICS=' + JSON.stringify({ diagnostics, state }));
  expect(state.parsed, JSON.stringify({ diagnostics, state }, null, 2)).toBeGreaterThan(0);
});
