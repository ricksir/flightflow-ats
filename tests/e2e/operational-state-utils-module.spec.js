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

test('estado visual operacional preserva comportamento no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.FlightFlowOperationalStateUtils;
    return {
      swatches: {
        alert: api.themeSwatch('theme-alert'),
        controlled: api.themeSwatch('theme-controlled'),
        fallback: api.themeSwatch('unknown-theme'),
      },
      themes: {
        emergency: api.stripTheme({ snapshot: { status: 'ATIVO' }, operation: 'EMERG' }),
        rvsm: api.stripTheme({ snapshot: { status: 'ATIVO', rvsm: 'X' } }),
        preAuthorized: api.stripTheme({ snapshot: { status: 'PRÉ-ATIVO', authorizationState: 'AUTORIZADO' } }),
        active: api.stripTheme({ snapshot: { status: 'ATIVO' } }),
        inactiveCurrentBehavior: api.stripTheme({ snapshot: { status: 'INATIVO' } }),
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
      fallback: '#d6d6d6',
    },
    themes: {
      emergency: 'theme-alert',
      rvsm: 'theme-nonrvsm',
      preAuthorized: 'theme-pre-dark',
      active: 'theme-controlled',
      // Equivalência deliberada: correção funcional de INATIVO não pertence à extração.
      inactiveCurrentBehavior: 'theme-controlled',
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
