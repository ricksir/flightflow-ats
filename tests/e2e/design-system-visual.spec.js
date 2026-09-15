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

  const visual = await page.evaluate(() => {
    const topbar = getComputedStyle(document.querySelector('.topbar'));
    const workspace = getComputedStyle(document.querySelector('.workspace-card'));
    const button = document.querySelector('#configBtn');
    button.focus();
    const focused = getComputedStyle(button);
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
    const status = document.querySelector('.real-map-status').getBoundingClientRect();
    return {
      columns: content.gridTemplateColumns,
      workspace,
      inspector,
      scene,
      caption,
      status,
    };
  });

  expect(layout.columns.trim().split(/\s+/)).toHaveLength(1);
  expect(Math.abs(layout.workspace.width - layout.inspector.width)).toBeLessThan(3);
  expect(layout.inspector.top).toBeGreaterThan(layout.workspace.top);
  expect(layout.caption.width).toBeGreaterThan(layout.scene.width * 0.85);
  expect(layout.status.width).toBeGreaterThan(layout.scene.width * 0.85);
  expect(layout.status.top).toBeGreaterThan(layout.caption.top);
});
