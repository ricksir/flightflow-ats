(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowSearchExcerpt = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const normalizeSearchText = options.normalizeSearchText;
    const escapeHtml = options.escapeHtml;

    if (typeof normalizeSearchText !== 'function') {
      throw new Error('FlightFlowSearchExcerpt requer normalizeSearchText.');
    }
    if (typeof escapeHtml !== 'function') {
      throw new Error('FlightFlowSearchExcerpt requer escapeHtml.');
    }

    function makeSearchExcerpt(text, query, radius = 105) {
      const raw = String(text || '').replace(/\s+/g, ' ').trim();
      const normalizedRaw = normalizeSearchText(raw);
      const normalizedQuery = normalizeSearchText(query);
      const index = normalizedRaw.indexOf(normalizedQuery);
      if (index < 0) return raw.slice(0, radius * 2);
      const start = Math.max(0, index - radius);
      const end = Math.min(raw.length, index + query.length + radius);
      return `${start > 0 ? '…' : ''}${raw.slice(start, end)}${end < raw.length ? '…' : ''}`;
    }

    function highlightSearchExcerpt(text, query) {
      const source = String(text || '');
      const normalizedSource = normalizeSearchText(source);
      const normalizedQuery = normalizeSearchText(query);
      const index = normalizedSource.indexOf(normalizedQuery);
      if (index < 0 || !normalizedQuery) return escapeHtml(source);
      const before = source.slice(0, index);
      const hit = source.slice(index, index + query.length);
      const after = source.slice(index + query.length);
      return `${escapeHtml(before)}<mark>${escapeHtml(hit)}</mark>${escapeHtml(after)}`;
    }

    return Object.freeze({ makeSearchExcerpt, highlightSearchExcerpt });
  };

  return Object.freeze({ create });
});
