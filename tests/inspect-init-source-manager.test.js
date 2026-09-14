const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const kernel = scriptMatches.map(m => m[1]).sort((a,b)=>b.length-a.length)[0];

function extractFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' must exist');
  const start = match.index;
  const braceStart = start + match[0].length - 1;
  let depth = 0, mode = 'code';
  for (let i = braceStart; i < source.length; i++) {
    const c = source[i], n = source[i+1];
    if (mode === 'code') {
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      else if (c === '/' && n === '/') { mode = 'line'; i++; }
      else if (c === '/' && n === '*') { mode = 'block'; i++; }
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return { source: source.slice(start, i+1), start, end: i+1 };
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
  throw new Error('unterminated ' + name);
}

test('inspect initSourceManager boundary', () => {
  assert.ok(kernel && kernel.length > 100000);
  const target = extractFunction(kernel, 'initSourceManager');
  const occurrences = [...kernel.matchAll(/\binitSourceManager\b/g)].map(m => m.index);
  const refs = occurrences.map(index => ({
    index,
    context: kernel.slice(Math.max(0,index-180), Math.min(kernel.length,index+260)).replace(/\s+/g,' ')
  }));
  const calls = [...target.source.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(m=>m[1])
    .filter(x=>x !== 'function' && x !== 'initSourceManager');
  const forbidden = ['goTo(', 'renderCurrent(', 'currentEvent(', 'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'setTimeout(', 'setInterval(', 'google.', 'L.', 'realMapState', 'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP'];
  console.log('INSPECT_INIT_SOURCE_MANAGER|' + JSON.stringify({
    source: target.source,
    bytes: Buffer.byteLength(target.source,'utf8'),
    sha256: crypto.createHash('sha256').update(target.source,'utf8').digest('hex'),
    occurrences: occurrences.length,
    consumers: Math.max(0, occurrences.length - 1),
    calls: [...new Set(calls)],
    forbiddenHits: forbidden.filter(token => target.source.includes(token)),
    refs
  }));
});
