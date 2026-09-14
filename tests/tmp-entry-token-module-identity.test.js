'use strict';
const test = require('node:test');
const fs = require('node:fs');
const crypto = require('node:crypto');

test('temporary communication context identity diagnostic', () => {
  const source = fs.readFileSync('src/timeline/communication-context-utils.js', 'utf8');
  console.log('COMM_CONTEXT_IDENTITY|' + Buffer.byteLength(source, 'utf8') + '|' + crypto.createHash('sha256').update(source).digest('hex'));
});
