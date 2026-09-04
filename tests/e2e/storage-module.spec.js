const { test, expect } = require('@playwright/test');

test('Secure Storage externo publica API estável no navegador real', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const contract = await page.evaluate(() => {
    const api = window.FlightFlowStorage;
    return {
      exists: !!api,
      version: api?.version,
      schemaVersion: api?.schemaVersion,
      members: [
        'init', 'scheduleSnapshot', 'flush', 'snapshot', 'saveHistory',
        'exportBackup', 'importBackupFile', 'validateStorage', 'deleteRecord', 'getRecord'
      ].filter(name => typeof api?.[name] === 'function'),
    };
  });

  expect(contract.exists).toBe(true);
  expect(contract.version).toBe('FINAL-OFICIAL-SECURE-1.1');
  expect(contract.schemaVersion).toBe(1);
  expect(contract.members).toHaveLength(10);
});
