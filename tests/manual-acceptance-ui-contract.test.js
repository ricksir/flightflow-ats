'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('development identity follows the v0.2.1 line and removes legacy visible metadata', () => {
  const packageJson = JSON.parse(read('package.json'));
  const shell = read('src/ui/application-shell-controller.js');

  assert.equal(packageJson.version, '0.2.1-dev');
  assert.match(shell, /name:\s*'FlightFlow ATS'/);
  assert.match(shell, /version:\s*'0\.2\.1-dev'/);
  assert.doesNotMatch(shell, /v?7\.3\.2|TIOP Cindacta1/i);
});

test('appearance exposes an independent persisted Velox emerald palette', () => {
  const shell = read('src/ui/application-shell-controller.js');
  const css = read('src/ui/dashboard-reference.css');

  assert.match(shell, /flightflow-shell-palette-v1/);
  assert.match(shell, /data-shell-palette/);
  assert.match(shell, /Velox \/ Esmeralda/);
  assert.match(shell, /localStorage\.setItem\(PALETTE_KEY/);
  assert.match(css, /html\[data-palette="velox"\]/);
  assert.match(css, /--ff-shell-accent:\s*#67e6b5/);
  assert.match(css, /Explicitly preserve regulated\/semantic visual areas/);
});

test('terminal context is visual-only before Order TER and does not alter navigation', () => {
  const module = read('src/route/terminal-context-visual.js');

  assert.match(module, /if \(!map .* state\.active\)/s);
  assert.match(module, /if \(!validTerminal\(state\) \|\| state\.active\) return false/);
  assert.match(module, /dashArray:\s*'7 9'/);
  assert.match(module, /sem ETIM\/STAR\/fixos inventados/);
  assert.doesNotMatch(module, /\bgoTo\s*\(/);
  assert.doesNotMatch(module, /syntheticProgress|movementProfile\s*=|etim\s*=/);
});

test('bootstrap loads acceptance controllers without changing operational theme mapping', () => {
  const operational = read('src/ui/operational-state-utils.js');

  assert.match(operational, /application-shell-controller\.js/);
  assert.match(operational, /terminal-context-visual\.js/);
  assert.match(operational, /theme-controlled':'#111111'/);
  assert.match(operational, /theme-alert':'#c4151d'/);
});
