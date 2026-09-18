const { test, expect } = require('@playwright/test');

function number(value) {
  return Number.parseFloat(String(value || '0')) || 0;
}

test('Design System keeps map dominant and operational controls readable on desktop', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const metrics = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect() || null;
    const style = selector => {
      const node = document.querySelector(selector);
      return node ? getComputedStyle(node) : null;
    };
    const root = getComputedStyle(document.documentElement);
    return {
      accent: root.getPropertyValue('--ffds-accent').trim(),
      workspace: rect('.workspace-card'),
      inspector: rect('.inspector-card'),
      scene: rect('.scene-wrap'),
      caption: rect('.scene-caption'),
      topbarRadius: style('.topbar')?.borderTopLeftRadius || '',
      transportRadius: style('.transport')?.borderTopLeftRadius || '',
      mapControlFont: style('.real-map-control-group button')?.fontSize || '',
      tabFont: style('.tab')?.fontSize || '',
      sceneCaptionFont: style('.scene-caption p')?.fontSize || '',
    };
  });

  expect(metrics.accent).toBe('#35d7ff');
  expect(metrics.workspace).toBeTruthy();
  expect(metrics.inspector).toBeTruthy();
  expect(metrics.scene).toBeTruthy();
  expect(metrics.caption).toBeTruthy();
  expect(metrics.workspace.width).toBeGreaterThan(metrics.inspector.width * 2);
  expect(metrics.caption.width).toBeLessThan(metrics.scene.width * 0.7);
  expect(number(metrics.topbarRadius)).toBeGreaterThanOrEqual(14);
  expect(number(metrics.transportRadius)).toBeGreaterThanOrEqual(14);
  expect(number(metrics.mapControlFont)).toBeGreaterThanOrEqual(10.5);
  expect(number(metrics.tabFont)).toBeGreaterThanOrEqual(10.5);
  expect(number(metrics.sceneCaptionFont)).toBeGreaterThanOrEqual(10.5);
});

test('Design System preserves dark theme hierarchy and explicit keyboard focus', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });

  await page.locator('#configBtn').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('#configBtn')).toBeFocused();

  const visual = await page.evaluate(() => {
    const topbar = getComputedStyle(document.querySelector('.topbar'));
    const workspace = getComputedStyle(document.querySelector('.workspace-card'));
    const focused = getComputedStyle(document.querySelector('#configBtn'));
    return {
      topbarBackground: topbar.backgroundImage,
      workspaceBackground: workspace.backgroundImage,
      focusOutline: focused.outlineStyle,
      focusWidth: focused.outlineWidth,
    };
  });

  expect(visual.topbarBackground).toContain('linear-gradient');
  expect(visual.workspaceBackground).toContain('linear-gradient');
  expect(visual.focusOutline).not.toBe('none');
  expect(number(visual.focusWidth)).toBeGreaterThanOrEqual(2);
});

test('Design System collapses desktop zones into a vertical card flow below 900px', async ({ page }) => {
  await page.setViewportSize({ width: 880, height: 1100 });
  await page.goto('/index.html', { waitUntil: 'load' });

  const layout = await page.evaluate(() => {
    const content = getComputedStyle(document.querySelector('.content'));
    const workspace = document.querySelector('.workspace-card').getBoundingClientRect();
    const inspector = document.querySelector('.inspector-card').getBoundingClientRect();
    const scene = document.querySelector('.scene-wrap').getBoundingClientRect();
    const caption = document.querySelector('.scene-caption').getBoundingClientRect();
    return {
      columns: content.gridTemplateColumns,
      workspace,
      inspector,
      scene,
      caption,
    };
  });

  expect(layout.columns.trim().split(/\s+/)).toHaveLength(1);
  expect(Math.abs(layout.workspace.width - layout.inspector.width)).toBeLessThan(3);
  expect(layout.inspector.top).toBeGreaterThan(layout.workspace.top);
  expect(layout.caption.width).toBeGreaterThan(layout.scene.width * 0.85);
  expect(layout.caption.bottom).toBeLessThanOrEqual(layout.scene.bottom);
});


test('Velox reference preset is selectable, visually distinct and persists after reload', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.locator('#configBtn').click();
  await expect(page.locator('#themeVeloxBtn')).toBeVisible();
  await page.locator('#themeVeloxBtn').click();
  const selected = await page.evaluate(() => {
    const root = document.documentElement;
    const topbar = getComputedStyle(document.querySelector('.topbar'));
    const accent = getComputedStyle(root).getPropertyValue('--ffds-accent').trim();
    const saved = JSON.parse(localStorage.getItem('flightflow-config-v2') || '{}');
    return { theme:root.dataset.theme,palette:root.dataset.palette,accent,background:topbar.backgroundImage,savedTheme:saved.theme };
  });
  expect(selected.theme).toBe('dark');
  expect(selected.palette).toBe('velox');
  expect(selected.accent).toBe('#49e7ad');
  expect(selected.background).toContain('linear-gradient');
  expect(selected.savedTheme).toBe('velox');
  await page.reload({ waitUntil: 'load' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.palette)).toBe('velox');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('flightflow-config-v2') || '{}').theme)).toBe('velox');
});


test('modern preset changes dashboard proportions and visual hierarchy perceptibly', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.locator('#configBtn').click();
  await page.locator('#themeVeloxBtn').click();

  const metrics = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const style = selector => getComputedStyle(document.querySelector(selector));
    return {
      palette: document.documentElement.dataset.palette,
      workspace: rect('.workspace-card'),
      inspector: rect('.inspector-card'),
      scene: rect('.scene-wrap'),
      topbarBackground: style('.topbar').backgroundImage,
      workspaceBackground: style('.workspace-card').backgroundImage,
      inspectorBackground: style('.inspector-card').backgroundImage,
      captionWidth: rect('.scene-caption').width,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--ffds-accent').trim(),
      label: document.querySelector('#themeVeloxBtn b')?.textContent?.trim(),
    };
  });

  expect(metrics.palette).toBe('velox');
  expect(metrics.accent).toBe('#49e7ad');
  expect(metrics.label).toBe('Dashboard moderno');
  expect(metrics.workspace.width).toBeGreaterThan(metrics.inspector.width * 2.15);
  expect(metrics.captionWidth).toBeLessThan(metrics.scene.width * 0.72);
  expect(metrics.topbarBackground).toContain('linear-gradient');
  expect(metrics.workspaceBackground).toContain('linear-gradient');
  expect(metrics.inspectorBackground).toContain('linear-gradient');
});
