(() => {
  'use strict';

  if (window.FlightFlowTerminalContextVisual) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let nativeContextLayer = null;
  let nativeMapRef = null;
  let refreshQueued = false;
  let modalObserver = null;

  function api() {
    return window.FlightFlowRouteProcessedV7412 || null;
  }

  function currentSnapshot() {
    const routeApi = api();
    const model = routeApi?.getModel?.();
    if (!model?.resolvedSnapshots?.length) return null;
    const index = Number.isFinite(Number(model.currentSnapshotIndex))
      ? Math.max(0, Math.min(model.resolvedSnapshots.length - 1, Number(model.currentSnapshotIndex)))
      : model.resolvedSnapshots.length - 1;
    return model.resolvedSnapshots[index] || model.resolvedSnapshots.at(-1) || null;
  }

  function terminalState() {
    const routeApi = api();
    const snapshot = currentSnapshot();
    if (!routeApi || !snapshot || typeof routeApi.terminalClosureState !== 'function') return null;
    try { return routeApi.terminalClosureState(snapshot); }
    catch (_) { return null; }
  }

  function validTerminal(state) {
    const a = state?.from?.geo;
    const b = state?.destination?.geo;
    if (!state?.context || !a || !b) return false;
    return [a.lat, a.lon, b.lat, b.lon].every((value) => Number.isFinite(Number(value)));
  }

  function clearNativeLayer() {
    if (nativeContextLayer) {
      try { nativeContextLayer.clearLayers?.(); } catch (_) {}
      try { nativeContextLayer.remove?.(); } catch (_) {}
    }
    nativeContextLayer = null;
    nativeMapRef = null;
  }

  function renderNativeContext() {
    const state = terminalState();
    const bridge = window.__FlightFlowFirBridge;
    const rms = bridge?.realMapState;
    const map = rms?.map;

    if (!map || rms?.engine !== 'leaflet' || !window.L || !validTerminal(state) || state.active) {
      clearNativeLayer();
      return false;
    }

    if (!nativeContextLayer || nativeMapRef !== map) {
      clearNativeLayer();
      nativeMapRef = map;
      nativeContextLayer = window.L.layerGroup().addTo(map);
    }

    nativeContextLayer.clearLayers();
    const points = [
      [Number(state.from.geo.lat), Number(state.from.geo.lon)],
      [Number(state.destination.geo.lat), Number(state.destination.geo.lon)],
    ];
    const line = window.L.polyline(points, {
      color: '#d59a20',
      weight: 3.4,
      opacity: .94,
      dashArray: '7 9',
      lineCap: 'round',
      lineJoin: 'round',
      interactive: true,
      pane: 'overlayPane',
    });
    line.bindTooltip(
      'Trajeto terminal até o ADES não especificado no histórico · referência visual derivada · sem ETIM/STAR/fixos inventados',
      { sticky: true, className: 'ff-terminal-context-tip' },
    );
    line.addTo(nativeContextLayer);
    return true;
  }

  function pointCircle(svg, selector) {
    const list = [...svg.querySelectorAll(selector)];
    return list.length ? list.at(-1) : null;
  }

  function createSvgLine(className, from, to) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', className);
    line.setAttribute('x1', from.getAttribute('cx'));
    line.setAttribute('y1', from.getAttribute('cy'));
    line.setAttribute('x2', to.getAttribute('cx'));
    line.setAttribute('y2', to.getAttribute('cy'));
    line.dataset.terminalContext = 'true';
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = 'Trajeto terminal até o ADES não especificado no histórico · referência visual derivada · sem ETIM/STAR/fixos inventados';
    line.appendChild(title);
    return line;
  }

  function renderModalContext() {
    const svg = document.querySelector('#ffrpMap');
    if (!svg) return false;

    svg.querySelectorAll('[data-terminal-context="true"]').forEach((node) => node.remove());
    const state = terminalState();
    if (!validTerminal(state) || state.active) return false;

    const from = pointCircle(svg, '.wp.declared circle') || pointCircle(svg, '.wp:not(.destination) circle');
    const destination = pointCircle(svg, '.wp.destination circle');
    if (!from || !destination) return false;

    const underlay = createSvgLine('route-terminal-context-underlay', from, destination);
    const line = createSvgLine('route-terminal-context', from, destination);
    const firstPoint = svg.querySelector('.wp');
    if (firstPoint) {
      svg.insertBefore(underlay, firstPoint);
      svg.insertBefore(line, firstPoint);
    } else {
      svg.append(underlay, line);
    }
    return true;
  }

  function installStyle() {
    if (document.getElementById('ff-terminal-context-style')) return;
    const style = document.createElement('style');
    style.id = 'ff-terminal-context-style';
    style.textContent = `
      #ffrpMap .route-terminal-context-underlay{fill:none;stroke:#d59a20;stroke-width:1.4;stroke-opacity:.28;stroke-linecap:round;pointer-events:none}
      #ffrpMap .route-terminal-context{fill:none;stroke:#d59a20;stroke-width:4;stroke-dasharray:7 9;stroke-linecap:round;filter:drop-shadow(0 0 3px rgba(213,154,32,.18));pointer-events:none}
    `;
    document.head.appendChild(style);
  }

  function refreshNow() {
    refreshQueued = false;
    renderNativeContext();
    renderModalContext();
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => requestAnimationFrame(refreshNow));
  }

  function observeModal() {
    if (modalObserver) return;
    modalObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.dataset?.terminalContext === 'true'))) return;
      scheduleRefresh();
    });
    modalObserver.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    installStyle();
    observeModal();
    document.addEventListener('click', scheduleRefresh, true);
    document.addEventListener('input', scheduleRefresh, true);
    document.addEventListener('change', scheduleRefresh, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === ' ') scheduleRefresh();
    }, true);
    scheduleRefresh();
    setTimeout(scheduleRefresh, 250);
    setTimeout(scheduleRefresh, 900);
  }

  window.FlightFlowTerminalContextVisual = Object.freeze({
    boot,
    refresh: refreshNow,
    terminalState,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
