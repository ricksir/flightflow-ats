const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CSS = path.join(ROOT, 'src', 'ui', 'shell-visual-refinement.css');
const DOC = path.join(ROOT, 'docs', 'DESIGN_SYSTEM.md');

function designSystemSection() {
  const source = fs.readFileSync(CSS, 'utf8');
  const marker = 'FlightFlow ATS Design System 1.0';
  const index = source.indexOf(marker);
  assert.ok(index >= 0, 'marcador do Design System deve existir');
  return source.slice(index);
}

test('Design System define foundations reutilizáveis de spacing, type, radius e semântica', () => {
  const css = designSystemSection();
  for (const token of [
    '--ffds-space-1', '--ffds-space-5', '--ffds-radius-sm', '--ffds-radius-lg',
    '--ffds-type-micro', '--ffds-type-xs', '--ffds-type-sm', '--ffds-type-md',
    '--ffds-accent', '--ffds-warning', '--ffds-success', '--ffds-danger',
  ]) {
    assert.ok(css.includes(token), `${token} deve existir no Design System`);
  }
});

test('Design System mantém mapa dominante e separa overlays inferiores', () => {
  const css = designSystemSection();
  assert.match(css, /\.content\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)\s+minmax\(350px,380px\)/s);
  assert.match(css, /\.scene-caption\s*\{[^}]*width:\s*min\(610px,56%\)/s);
  assert.match(css, /\.real-map-status\s*\{[^}]*max-width:\s*39%/s);
  assert.match(css, /\.protocol-card\s*\{[^}]*top:\s*58px/s);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*\.content\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test('Design System melhora legibilidade operacional sem apagar estados existentes', () => {
  const css = designSystemSection();
  assert.match(css, /\.real-map-control-group button\s*\{[^}]*font-size:\s*var\(--ffds-type-xs\)/s);
  assert.match(css, /\.field-label\s*\{[^}]*font-size:\s*\.625rem/s);
  assert.match(css, /\.field-value\s*\{[^}]*font-size:\s*\.78rem/s);
  assert.match(css, /\.timeline-op\s*\{[^}]*font-size:\s*var\(--ffds-type-sm\)/s);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ffds-accent\)/s);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('Design System contempla temas, Rota Processada e janelas operacionais sem alterar lógica', () => {
  const css = designSystemSection();
  assert.match(css, /html\[data-theme="dark"\] body/);
  assert.match(css, /html\[data-theme="light"\] body/);
  assert.match(css, /html body \.ffrp-window/);
  assert.match(css, /\.fpv-window,\s*\n\.strip-window/);
  assert.doesNotMatch(css, /\bgoTo\s*\(/);
  assert.doesNotMatch(css, /syntheticProgress/);
  assert.doesNotMatch(css, /eventRoutes/);
});

test('documentação registra fontes, responsividade e fronteiras operacionais', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  assert.match(doc, /arounda\.agency\/works\/velox/);
  assert.match(doc, /behance\.net\/gallery\/247623775/);
  assert.match(doc, /não controla parser, timeline, rota, ETIM, `goTo\(\)`/i);
  assert.match(doc, /900 px ou menos/);
  assert.match(doc, /FPV e STRIP/);
  assert.match(doc, /fechamento terminal derivado por Ordem TER/);
});
