(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightFlowSearchExcerpt = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const create = (options = {}) => {
    const normalizeSearchText = options.normalizeSearchText;

    if (typeof normalizeSearchText !== 'function') {
      throw new Error('FlightFlowSearchExcerpt requer normalizeSearchText.');
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

    return Object.freeze({ makeSearchExcerpt });
  };

  return Object.freeze({ create });
});
