(function () {
  'use strict';

  function shortMessageType(value) {
    return String(value || 'ATS').replace(/[^A-Z0-9/]/gi, '').slice(0, 8) || 'ATS';
  }

  function displayValue(value, empty = '—') {
    if (value === undefined || value === null || value === '') return empty;
    if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? Object.values(item).filter(Boolean).join(' · ') : String(item)).join(' | ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function cleanDisplay(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

  function humanize(value) { return String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase(); }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B','KB','MB','GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  window.FlightFlowCoreUtils = Object.freeze({
    shortMessageType,
    displayValue,
    cleanDisplay,
    humanize,
    clone,
    formatBytes,
  });
})();
