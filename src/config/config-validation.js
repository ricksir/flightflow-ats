(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowConfigValidation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function validateConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('o conteúdo deve ser um objeto JSON.');
    if (config.theme !== undefined && !['dark','light','velox'].includes(config.theme)) throw new Error("theme deve ser 'dark', 'light' ou 'velox'.");
    if (config.fontScale !== undefined && (Number(config.fontScale) < .9 || Number(config.fontScale) > 1.6)) throw new Error('fontScale deve ficar entre 0.9 e 1.6.');
    if (config.visibleFields && !Array.isArray(config.visibleFields)) throw new Error('visibleFields deve ser uma lista.');
    if (config.addressPatterns && !Array.isArray(config.addressPatterns)) throw new Error('addressPatterns deve ser uma lista.');
    if (config.baseIntervalMs !== undefined && Number(config.baseIntervalMs) < 300) throw new Error('baseIntervalMs deve ser igual ou superior a 300.');
    if (config.fpvShowFromProgress !== undefined && (Number(config.fpvShowFromProgress) < 0 || Number(config.fpvShowFromProgress) > 1)) throw new Error('fpvShowFromProgress deve ficar entre 0 e 1.');
    if (config.stripShowFromProgress !== undefined && (Number(config.stripShowFromProgress) < 0 || Number(config.stripShowFromProgress) > 1)) throw new Error('stripShowFromProgress deve ficar entre 0 e 1.');
  }

  return Object.freeze({ validateConfig });
});
