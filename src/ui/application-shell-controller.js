(() => {
  'use strict';

  if (window.FlightFlowApplicationShellController) return;

  const APP_DISPLAY = Object.freeze({
    name: 'FlightFlow ATS',
    version: '0.2.1-dev',
    subtitle: 'Monitoramento e revisualização de históricos ATS',
    developerCredit: 'Desenvolvido por 2S BCO Richard',
  });
  const PALETTE_KEY = 'flightflow-shell-palette-v1';
  const PALETTES = new Set(['flightflow', 'velox']);

  function ensureStylesheet() {
    if (document.querySelector('link[data-flightflow-dashboard-reference]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'src/ui/dashboard-reference.css';
    link.dataset.flightflowDashboardReference = 'true';
    document.head.appendChild(link);
  }

  function applyIdentity() {
    document.title = `${APP_DISPLAY.name} v${APP_DISPLAY.version}`;

    const title = document.getElementById('appTitle');
    if (title) {
      title.replaceChildren();
      const product = document.createElement('span');
      product.className = 'brand-product';
      product.textContent = APP_DISPLAY.name;
      title.append(product);
      title.title = `${APP_DISPLAY.name} v${APP_DISPLAY.version}`;
    }

    const credit = document.getElementById('appCredit');
    if (credit) credit.textContent = APP_DISPLAY.developerCredit;

    const aboutName = document.getElementById('aboutAppName');
    if (aboutName) aboutName.textContent = `${APP_DISPLAY.name} v${APP_DISPLAY.version}`;

    const aboutDeveloper = document.getElementById('aboutDeveloper');
    if (aboutDeveloper) aboutDeveloper.textContent = APP_DISPLAY.developerCredit;

    const aboutCard = aboutName?.closest('.about-card');
    const aboutSubtitle = aboutCard?.querySelector('span');
    if (aboutSubtitle) aboutSubtitle.textContent = APP_DISPLAY.subtitle;

    const note = document.querySelector('.about-edit-note');
    if (note) note.textContent = 'Versão de desenvolvimento do main. A identificação exibida acompanha a linha v0.2.1 em validação operacional.';
  }

  function normalizePalette(value) {
    return PALETTES.has(value) ? value : 'flightflow';
  }

  function readPalette() {
    try { return normalizePalette(localStorage.getItem(PALETTE_KEY)); }
    catch (_) { return 'flightflow'; }
  }

  function setPressedState(palette) {
    document.querySelectorAll('[data-shell-palette]').forEach((button) => {
      const active = button.dataset.shellPalette === palette;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyPalette(value, { persist = true } = {}) {
    const palette = normalizePalette(value);
    document.documentElement.dataset.palette = palette;
    setPressedState(palette);
    if (persist) {
      try { localStorage.setItem(PALETTE_KEY, palette); } catch (_) {}
    }
    return palette;
  }

  function paletteButton({ id, palette, title, description, previewClass }) {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.className = 'theme-option palette-option';
    button.dataset.shellPalette = palette;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      <span aria-hidden="true" class="theme-preview palette-preview ${previewClass}"><i></i><i></i><i></i></span>
      <span><b>${title}</b><small>${description}</small></span>
    `;
    button.addEventListener('click', () => applyPalette(palette));
    return button;
  }

  function ensurePaletteControls() {
    const appearance = document.querySelector('.appearance-settings');
    const themeSwitch = appearance?.querySelector('.theme-switch');
    if (!appearance || !themeSwitch || document.getElementById('shellPaletteSwitch')) return;

    const heading = document.createElement('div');
    heading.className = 'palette-heading';
    heading.innerHTML = '<h4>Paleta do dashboard</h4><p>Escolha a identidade visual da interface. As cores operacionais de STRIP, etiqueta e semântica ATS permanecem preservadas.</p>';

    const group = document.createElement('div');
    group.id = 'shellPaletteSwitch';
    group.className = 'theme-switch palette-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Selecionar paleta do dashboard');
    group.append(
      paletteButton({
        id: 'paletteFlightFlowBtn',
        palette: 'flightflow',
        title: 'FlightFlow',
        description: 'Azul e ciano operacional',
        previewClass: 'palette-preview-flightflow',
      }),
      paletteButton({
        id: 'paletteVeloxBtn',
        palette: 'velox',
        title: 'Velox / Esmeralda',
        description: 'Visual inspirado no dashboard de referência',
        previewClass: 'palette-preview-velox',
      }),
    );

    themeSwitch.insertAdjacentElement('afterend', heading);
    heading.insertAdjacentElement('afterend', group);
    applyPalette(readPalette(), { persist: false });
  }

  function boot() {
    ensureStylesheet();
    applyIdentity();
    ensurePaletteControls();
    applyPalette(readPalette(), { persist: false });
  }

  window.FlightFlowApplicationShellController = Object.freeze({
    boot,
    applyIdentity,
    applyPalette,
    getPalette: () => normalizePalette(document.documentElement.dataset.palette || readPalette()),
    meta: APP_DISPLAY,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
