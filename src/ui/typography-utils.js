(function () {
  'use strict';

  function normalizeFontScale(value) {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) ? numeric : 1;
    return Math.min(1.6, Math.max(.9, Math.round(safe * 20) / 20));
  }

  function fontLayoutForScale(scale) {
    if (scale >= 1.5) return 'xlarge';
    if (scale >= 1.3) return 'stacked';
    if (scale >= 1.1) return 'large';
    return 'normal';
  }

  function fontLayoutDescription(layout) {
    if (layout === 'xlarge') return 'Painéis empilhados e campos organizados em coluna única.';
    if (layout === 'stacked') return 'Área de voo e painel de dados organizados verticalmente.';
    if (layout === 'large') return 'Colunas e espaçamentos ajustados para preservar a área útil.';
    return 'Painéis lado a lado.';
  }

  window.FlightFlowTypographyUtils = Object.freeze({
    normalizeFontScale,
    fontLayoutForScale,
    fontLayoutDescription,
  });
})();
