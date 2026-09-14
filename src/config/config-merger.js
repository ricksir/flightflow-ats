(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowConfigMerger = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function createConfigMerger(options = {}) {
    const DEFAULT_CONFIG = options.defaultConfig;
    const FIELD_DEFS = options.fieldDefs;
    const clone = options.clone;
    const normalizeFontScale = options.normalizeFontScale;
    const normalizeFieldLayout = options.normalizeFieldLayout;
    if (
      !DEFAULT_CONFIG ||
      !FIELD_DEFS ||
      typeof clone !== 'function' ||
      typeof normalizeFontScale !== 'function' ||
      typeof normalizeFieldLayout !== 'function'
    ) {
      throw new Error('FlightFlowConfigMerger requer defaultConfig, fieldDefs, clone, normalizeFontScale e normalizeFieldLayout.');
    }

  function mergeConfig(input) {
    const merged = Object.assign({}, clone(DEFAULT_CONFIG), input || {});
    merged.theme = merged.theme === 'light' ? 'light' : 'dark';
    merged.fontScale = normalizeFontScale(merged.fontScale);
    merged.visibleFields = (merged.visibleFields || []).filter(key => FIELD_DEFS[key]);
    if (!merged.visibleFields.includes('idPlano')) {
      const callsignIndex = merged.visibleFields.indexOf('callsign');
      merged.visibleFields.splice(callsignIndex >= 0 ? callsignIndex + 1 : 0, 0, 'idPlano');
    }
    if (!merged.visibleFields.includes('etn')) {
      const eobtIndex = merged.visibleFields.indexOf('eobt');
      merged.visibleFields.splice(eobtIndex >= 0 ? eobtIndex + 1 : merged.visibleFields.length, 0, 'etn');
    }
    merged.customFields = Array.isArray(merged.customFields) ? merged.customFields : [];
    merged.fieldLayout = normalizeFieldLayout(merged.fieldLayout);
    merged.addressPatterns = Array.isArray(merged.addressPatterns) ? merged.addressPatterns : clone(DEFAULT_CONFIG.addressPatterns);
    return merged;
  }

    return Object.freeze({ mergeConfig });
  }

  return Object.freeze({ create: createConfigMerger });
});
