(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowStripColorMeaning = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const colorMeanings = options.colorMeanings;

    if (!colorMeanings || typeof colorMeanings !== 'object') {
      throw new Error('FlightFlowStripColorMeaning requer colorMeanings.');
    }

    function stripColorMeaning(target, theme) {
      const parts = [colorMeanings[theme] || 'Cor operacional do estado atual do plano.'];
      if (target.classList.contains('updated')) parts.push('Azul-claro: o conteúdo deste campo foi alterado no evento atual e ainda não foi reconhecido pelo operador.');
      if (target.classList.contains('new-field')) parts.push('Ciano: informação nova ou recém-recebida.');
      if (target.classList.contains('pending')) parts.push('Lilás: requisição ou coordenação pendente.');
      if (target.classList.contains('white-border')) parts.push('Borda branca: confirmação ou reconhecimento do recebimento ainda pendente.');
      if (target.classList.contains('warning')) parts.push('Borda amarela: condição que exige atenção operacional.');
      return parts.join(' ');
    }

    return Object.freeze({ stripColorMeaning });
  };

  return Object.freeze({ create });
});
