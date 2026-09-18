(function () {
  'use strict';

  const PANEL_ID = 'currentFlightAerodromeReview';
  const GRID_ID = 'currentFlightAerodromeCards';

  function getBridge() {
    return window.__FlightFlowFirBridge || null;
  }

  function getResolver() {
    return window.__flightflowGeoResolver || null;
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[char]);
  }

  function sourceLabel(airport) {
    const source = clean(airport?.source).toLowerCase();
    if (!airport) return 'Sem coordenadas cadastradas';
    if (source === 'official-aip') return 'Coordenadas oficiais disponíveis';
    if (source === 'user-confirmed') return 'Posição confirmada pelo operador';
    if (source === 'imported') return 'Coordenadas importadas';
    return 'Coordenadas disponíveis na base';
  }

  function coordinateLabel(airport) {
    const lat = Number(airport?.lat);
    const lon = Number(airport?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'Localização ainda não cadastrada';
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }

  function endpointCards() {
    const bridge = getBridge();
    const resolver = getResolver();
    const endpoints = resolver?.currentRouteEndpoints?.();
    if (!bridge?.state?.parsed || !endpoints) return [];

    const localities = bridge.state.localities || {};
    return [
      { role: 'ADEP', code: endpoints.dep, airport: endpoints.depAirport },
      { role: 'ADES', code: endpoints.arr, airport: endpoints.arrAirport }
    ].filter(item => clean(item.code)).map(item => {
      const code = clean(item.code).toUpperCase();
      const name = clean(localities[code] || item.airport?.name || code);
      const known = Boolean(item.airport && Number.isFinite(Number(item.airport.lat)) && Number.isFinite(Number(item.airport.lon)));
      return { ...item, code, name, known };
    });
  }

  function render() {
    const panel = document.getElementById(PANEL_ID);
    const grid = document.getElementById(GRID_ID);
    if (!panel || !grid) return;

    const cards = endpointCards();
    panel.dataset.hasFlight = cards.length ? 'true' : 'false';

    if (!cards.length) {
      grid.innerHTML = '<div class="current-flight-aerodrome-empty">Carregue um histórico para revisar ADEP e ADES.</div>';
      return;
    }

    grid.innerHTML = cards.map(item => `
      <article class="current-flight-aerodrome-card" data-role="${escapeHtml(item.role)}" data-known="${item.known ? 'true' : 'false'}">
        <div class="current-flight-aerodrome-head">
          <span class="current-flight-aerodrome-role">${escapeHtml(item.role)}</span>
          <span class="current-flight-aerodrome-status">${escapeHtml(sourceLabel(item.airport))}</span>
        </div>
        <strong class="current-flight-aerodrome-code">${escapeHtml(item.code)}</strong>
        <span class="current-flight-aerodrome-name">${escapeHtml(item.name)}</span>
        <small class="current-flight-aerodrome-coord">${escapeHtml(coordinateLabel(item.airport))}</small>
        <button class="btn btn-secondary current-flight-aerodrome-review-btn" type="button" data-review-aerodrome="${escapeHtml(item.code)}">
          ${item.known ? 'Revisar localização' : 'Cadastrar localização'}
        </button>
      </article>
    `).join('');
  }

  function reviewAerodrome(code) {
    const normalized = clean(code).toUpperCase();
    if (!normalized) return;

    const localityList = document.getElementById('localityList');
    if (!localityList) return;

    const existing = Array.from(localityList.querySelectorAll('[data-locate-locality]'))
      .find(button => clean(button.dataset.locateLocality).toUpperCase() === normalized);

    if (existing) {
      existing.click();
      return;
    }

    // O editor existente usa delegação de clique em #localityList. Um botão
    // transitório permite reutilizar exatamente o mesmo fluxo inclusive quando
    // o código ainda não possui linha própria na lista de localidades.
    const proxy = document.createElement('button');
    proxy.type = 'button';
    proxy.hidden = true;
    proxy.dataset.locateLocality = normalized;
    localityList.appendChild(proxy);
    proxy.click();
    proxy.remove();
  }

  function scheduleRender(delay = 0) {
    window.setTimeout(render, delay);
  }

  function bind() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.addEventListener('click', event => {
      const button = event.target.closest('[data-review-aerodrome]');
      if (!button) return;
      reviewAerodrome(button.dataset.reviewAerodrome);
    });

    document.getElementById('configBtn')?.addEventListener('click', () => scheduleRender());
    document.getElementById('fieldsBtn')?.addEventListener('click', () => scheduleRender());
    document.getElementById('aerodromeLocationModal')?.addEventListener('close', () => scheduleRender(120));
    document.addEventListener('flightflow:history-session-reset', () => scheduleRender(40));

    const observer = new MutationObserver(() => scheduleRender(30));
    const routeNodes = [document.getElementById('adepTitle'), document.getElementById('adesTitle')].filter(Boolean);
    routeNodes.forEach(node => observer.observe(node, { childList: true, characterData: true, subtree: true }));

    scheduleRender();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  window.FlightFlowCurrentAerodromeReview = Object.freeze({ render });
})();
