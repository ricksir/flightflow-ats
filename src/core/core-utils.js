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


  function angleDifference(a,b) { return Math.abs(((Number(a)-Number(b)+540)%360)-180); }

  function hashString(value) { let h=2166136261; for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; }

  function seeded(seed,n) { const x=Math.sin((seed+1)*(n+11)*12.9898)*43758.5453; return x-Math.floor(x); }
  function getPath(object, path) {
    return String(path).split('.').reduce((value, key) => value == null ? '' : value[key], object);
  }

  function setPath(object, path, value) {
    const parts = String(path).split('.');
    let cursor = object;
    parts.slice(0, -1).forEach(part => {
      if (cursor[part] === undefined) cursor[part] = /^\d+$/.test(parts[parts.indexOf(part) + 1]) ? [] : {};
      cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
  }

  function normalizeSearchText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }

  window.FlightFlowCoreUtils = Object.freeze({
    shortMessageType,
    displayValue,
    cleanDisplay,
    humanize,
    clone,
    formatBytes,
    angleDifference,
    hashString,
    seeded,
    getPath,
    setPath,
    normalizeSearchText,
  });
})();
