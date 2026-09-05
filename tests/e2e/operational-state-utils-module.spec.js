const { test, expect } = require('@playwright/test');

const PUBLIC_FUNCTIONS = ['themeSwatch', 'stripTheme', 'statusClass'];

test('FlightFlowOperationalStateUtils carrega antes do núcleo como API congelada', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate((names) => {
    const api = window.FlightFlowOperationalStateUtils;
    return {
      exists: !!api,
      frozen: api ? Object.isFrozen(api) : false,
      methods: names.filter(name => typeof api?.[name] === 'function'),
    };
  }, PUBLIC_FUNCTIONS);

  expect(contract.exists).toBe(true);
  expect(contract.frozen).toBe(true);
  expect(contract.methods).toEqual(PUBLIC_FUNCTIONS);
});

test('estado visual operacional preserva prioridades e corrige INATIVO no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.FlightFlowOperationalStateUtils;
    return {
      swatches: {
        alert: api.themeSwatch('theme-alert'),
        controlled: api.themeSwatch('theme-controlled'),
        noncontrolled: api.themeSwatch('theme-noncontrolled'),
        fallback: api.themeSwatch('unknown-theme'),
      },
      themes: {
        emergency: api.stripTheme({ snapshot: { status: 'ATIVO' }, operation: 'EMERG' }),
        inactiveEmergency: api.stripTheme({ snapshot: { status: 'INATIVO' }, operation: 'EMERG' }),
        rvsm: api.stripTheme({ snapshot: { status: 'ATIVO', rvsm: 'X' } }),
        inactiveRvsm: api.stripTheme({ snapshot: { status: 'INATIVO', rvsm: 'X' } }),
        preAuthorized: api.stripTheme({ snapshot: { status: 'PRÉ-ATIVO', authorizationState: 'AUTORIZADO' } }),
        active: api.stripTheme({ snapshot: { status: 'ATIVO' } }),
        inactive: api.stripTheme({ snapshot: { status: 'INATIVO' } }),
        inactiveArquivo: api.stripTheme({ snapshot: { status: 'INATIVO' }, operation: 'Criação pelo Arquivo de RPL' }),
        empty: api.stripTheme(null),
      },
      statuses: {
        preactive: api.statusClass('PRÉ-ATIVO'),
        inactive: api.statusClass('INATIVO'),
        active: api.statusClass('ATIVO'),
        terminated: api.statusClass('TERMINADO'),
        archived: api.statusClass('ARQUIVADO'),
        empty: api.statusClass(null),
      },
    };
  });

  expect(result).toEqual({
    swatches: {
      alert: '#c4151d',
      controlled: '#111111',
      noncontrolled: '#d6d6d6',
      fallback: '#d6d6d6',
    },
    themes: {
      emergency: 'theme-alert',
      inactiveEmergency: 'theme-alert',
      rvsm: 'theme-nonrvsm',
      inactiveRvsm: 'theme-nonrvsm',
      preAuthorized: 'theme-pre-dark',
      active: 'theme-controlled',
      inactive: 'theme-noncontrolled',
      inactiveArquivo: 'theme-noncontrolled',
      empty: 'theme-noncontrolled',
    },
    statuses: {
      preactive: 'status-preactive',
      inactive: 'status-inactive',
      active: 'status-active',
      terminated: 'status-terminated',
      archived: 'status-archived',
      empty: 'status-empty',
    },
  });
});
