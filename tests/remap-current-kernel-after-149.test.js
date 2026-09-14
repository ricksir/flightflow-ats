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

test('fresh remap of low-coupling kernel candidates after PR 149', () => {
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
    'isLocationCode',
    'normalizeSearchText',
    'normalizeKnowledgeText',
    'initSourceManager'
  ]);

  const hardForbidden = /\b(goTo|renderCurrent|timeline|scrubber|autoplay|DEP|route|fix|aircraft|map|planner|interpol|coordinate|runway|airport|aerodrome|ground|bearing|centroid|polygon|motion|realMapState|leaflet|geometry)\b/i;
  const infraForbidden = /(state\.|els\.|document\.|window\.|localStorage|sessionStorage|indexedDB|fetch\(|setTimeout\(|setInterval\(|google\.|L\.)/;

  const rows = [];
  for (const decl of declarations) {
    const name = decl[1];
    if (alreadyExtracted.has(name)) continue;
    const source = extractFunction(kernel, name, decl.index);
    if (!source) continue;
    const bytes = Buffer.byteLength(source, 'utf8');
    if (bytes > 650) continue;
    const occurrences = [...kernel.matchAll(new RegExp('\\b' + name.replace(/[$]/g, '\\$&') + '\\b', 'g'))].length;
    const consumers = Math.max(0, occurrences - 1);
    const sensitive = hardForbidden.test(name) || hardForbidden.test(source);
    const infra = infraForbidden.test(source);
    if (sensitive || infra) continue;

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
      preview: source.replace(/\s+/g, ' ').slice(0, 220)
    });
  }

  rows.sort((a, b) => a.score - b.score || a.bytes - b.bytes || a.name.localeCompare(b.name));
  console.log('FRESH_REMAP_BEGIN');
  for (const row of rows.slice(0, 40)) console.log('FRESH_REMAP|' + JSON.stringify(row));
  console.log('FRESH_REMAP_END');
  assert.ok(rows.length > 0);
});
