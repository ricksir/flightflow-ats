const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const kernel = scriptMatches
  .map(match => match[1])
  .sort((a, b) => b.length - a.length)[0];

function extractFunction(source, name, startIndex) {
  const marker = new RegExp('\\bfunction\\s+' + name.replace(/[$]/g, '\\$&') + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  marker.lastIndex = startIndex || 0;
  const match = marker.exec(source);
  if (!match) return null;
  const braceStart = match.index + match[0].length - 1;
  let depth = 0;
  let mode = 'code';
  for (let i = braceStart; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === 'code') {
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      else if (c === '/' && n === '/') { mode = 'line'; i++; }
      else if (c === '/' && n === '*') { mode = 'block'; i++; }
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return source.slice(match.index, i + 1);
      }
    } else if (mode === 'sq') {
      if (c === '\\') i++;
      else if (c === "'") mode = 'code';
    } else if (mode === 'dq') {
      if (c === '\\') i++;
      else if (c === '"') mode = 'code';
    } else if (mode === 'tpl') {
      if (c === '\\') i++;
      else if (c === '`') mode = 'code';
    } else if (mode === 'line') {
      if (c === '\n') mode = 'code';
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i++; }
    }
  }
  return null;
}

test('fresh remap of low-coupling kernel candidates after PR 177', () => {
  assert.ok(kernel && kernel.length > 100000);

  const declarations = [...kernel.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  const alreadyExtracted = new Set([
    'knowledgeCategoryLabel',
    'parseAddresses',
    'findKnowledgeEntryByKey',
    'findKnowledgeEntriesByCode',
    'knowledgeEntryDocumentLabel',
    'knowledgeEntryDocumentKey',
    'canonicalKnowledgeCode',
    'entryMatchesToken',
    'isLocationCode',
    'normalizeSearchText',
    'normalizeKnowledgeText',
    'initSourceManager',
    'normalizeFieldLayout',
    'knowledgeEntries',
    'renderKnowledgeFieldLabel',
    'fieldCardMarkup',
    'stripCell',
    'mergeConfig'
  ]);

  const sensitiveTerms = [
    'goto','rendercurrent','timeline','scrubber','autoplay','dep','route','fix','aircraft',
    'planner','interpol','coordinate','runway','airport','aerodrome','ground',
    'bearing','centroid','polygon','polyline','bounds','progress','motion',
    'realmap','googlemap','leaflet','geometry','currentevent'
  ];
  const infraForbidden = /(state\.|els\.|document\.|window\.|localStorage|sessionStorage|indexedDB|fetch\(|setTimeout\(|setInterval\(|requestAnimationFrame\(|navigator\.|google\.|L\.)/;

  const rows = [];
  const excluded = [];

  for (const decl of declarations) {
    const name = decl[1];
    if (alreadyExtracted.has(name)) continue;
    if (/^(handle|refresh)/.test(name)) continue;
    if (['clamp','clamp01','normalizeLocalityCode','stripValueMeaning'].includes(name)) continue;

    const source = extractFunction(kernel, name, decl.index);
    if (!source) continue;
    const bytes = Buffer.byteLength(source, 'utf8');
    if (bytes > 5000) continue;

    // Ignore Array.prototype.map() as a cartographic false positive, but still reject
    // an actual standalone map variable/token or explicit map-oriented identifiers.
    const mapSanitized = source.replace(/\.map\s*\(/g, '.ARRAY_MAP(');
    const haystack = (name + '\n' + mapSanitized).toLowerCase();
    const sensitiveHits = sensitiveTerms.filter(term => haystack.includes(term));
    const standaloneMap = /(^|[^.A-Za-z0-9_$])map([^A-Za-z0-9_$]|$)/i.test(mapSanitized);
    const infra = infraForbidden.test(source);

    if (sensitiveHits.length || standaloneMap || infra) {
      excluded.push({ name, bytes, sensitiveHits, standaloneMap, infra });
      continue;
    }

    const occurrences = [...kernel.matchAll(new RegExp('\\b' + name.replace(/[$]/g, '\\$&') + '\\b', 'g'))].length;
    const consumers = Math.max(0, occurrences - 1);
    const calls = [...source.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)]
      .map(m => m[1])
      .filter(x => !['function','if','for','while','switch','catch','String','Number','Boolean','Array','Object','Math','Date','RegExp','parseInt','parseFloat','isNaN','Set','Map'].includes(x));
    const uniqueCalls = [...new Set(calls)].filter(x => x !== name);
    const score = bytes + consumers * 30 + uniqueCalls.length * 45;

    rows.push({
      name,
      bytes,
      consumers,
      deps: uniqueCalls,
      sha256: crypto.createHash('sha256').update(source, 'utf8').digest('hex'),
      score,
      preview: source.replace(/\s+/g, ' ').slice(0, 320)
    });
  }

  rows.sort((a, b) => a.score - b.score || a.bytes - b.bytes || a.name.localeCompare(b.name));
  excluded.sort((a, b) => a.bytes - b.bytes || a.name.localeCompare(b.name));

  console.log('FRESH_REMAP_BEGIN');
  for (const row of rows.slice(0, 120)) console.log('FRESH_REMAP|' + JSON.stringify(row));
  console.log('FRESH_REMAP_END');

  console.log('FRESH_REMAP_EXCLUDED_BEGIN');
  for (const row of excluded.slice(0, 80)) console.log('FRESH_REMAP_EXCLUDED|' + JSON.stringify(row));
  console.log('FRESH_REMAP_EXCLUDED_END');

  // O primeiro resultado bruto, activateGoogleMapsMode, é rejeitado manualmente
  // porque troca a base do mapa real. relatedKnowledgeButtons é a primeira fronteira
  // restante pequena e sem acoplamento temporal/espacial aparente.
  const candidateName = 'relatedKnowledgeButtons';
  const candidateDecl = declarations.find(item => item[1] === candidateName);
  const candidateSource = candidateDecl ? extractFunction(kernel, candidateName, candidateDecl.index) : null;
  assert.ok(candidateSource, candidateName + ' deve existir para inspeção');

  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.',
    'goTo(', 'renderCurrent(', 'currentEvent(', 'route', 'planner', 'interpol', 'aircraft',
    'timeline', 'scrubber', 'autoplay', 'DEP', 'realMapState', 'leaflet', 'geometry'
  ]) {
    assert.equal(candidateSource.includes(token), false, 'acoplamento inesperado em ' + candidateName + ': ' + token);
  }

  console.log('TARGET_INSPECT_SOURCE_BEGIN|' + candidateName);
  console.log(candidateSource);
  console.log('TARGET_INSPECT_SOURCE_END|' + candidateName);

  const occurrenceRegex = new RegExp('\\b' + candidateName + '\\b', 'g');
  const occurrences = [...kernel.matchAll(occurrenceRegex)];
  console.log('TARGET_INSPECT_OCCURRENCES|' + candidateName + '|' + occurrences.length);
  occurrences.forEach((match, index) => {
    const start = Math.max(0, match.index - 700);
    const end = Math.min(kernel.length, match.index + candidateName.length + 1000);
    console.log('TARGET_INSPECT_CONTEXT|' + candidateName + '|' + index + '|' + kernel.slice(start, end).replace(/\\s+/g, ' '));
  });

  assert.ok(rows.length > 0);
});
