const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const indexHtml = fs.readFileSync('index.html', 'utf8');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function extractFunctionSource(name) {
  const marker = `function ${name}(`;
  const markerIndex = indexHtml.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${name} must remain present in index.html while this contract is frozen`);

  const start = indexHtml.lastIndexOf('\n', markerIndex) + 1;
  const open = indexHtml.indexOf('{', markerIndex);
  assert.notEqual(open, -1, `${name} must have a function body`);

  let depth = 0;
  for (let i = open; i < indexHtml.length; i += 1) {
    const char = indexHtml[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(start, i + 1);
    }
  }

  assert.fail(`${name} has an unbalanced function body`);
}

function runFunction(name, context) {
  const source = extractFunctionSource(name).trimStart();
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.__subject = ${name};`, context);
  return context.__subject;
}

const frozenSources = {
  updateLeafletAircraftMarker: {
    bytes: 658,
    lines: 8,
    sha: 'd1530498f06199260f9fc8ef6357760751b84b102b8e59f81b0b73377e8ecc92',
  },
  googlePlaneSymbol: {
    bytes: 646,
    lines: 1,
    sha: '8731f82b12e9dea69f8d67d7c2545705500598fffae3a7a8508cc9309bafede0',
  },
  updateGoogleAircraftMarker: {
    bytes: 592,
    lines: 5,
    sha: '8c8bdc76f4eca1f7e4dd9888d697ee12d556b7873004c3cae172d23c90682e6d',
  },
};

for (const [name, expected] of Object.entries(frozenSources)) {
  test(`${name} source identity is frozen before extraction`, () => {
    const source = extractFunctionSource(name);
    assert.equal(Buffer.byteLength(source), expected.bytes, `${name} byte count changed; actual SHA-256: ${sha256(source)}`);
    assert.equal(source.split('\n').length, expected.lines, `${name} line count changed; actual SHA-256: ${sha256(source)}`);
    assert.equal(sha256(source), expected.sha, `${name} source changed`);
  });
}

test('updateLeafletAircraftMarker creates once and reuses the Leaflet marker', () => {
  const aircraftLayer = { id: 'aircraft-layer' };
  let markerCreateCount = 0;
  const marker = {
    addTo(layer) { this.layer = layer; return this; },
    setLatLng(position) { this.position = position; return this; },
    setIcon(icon) { this.icon = icon; return this; },
  };
  const iconCalls = [];

  const context = {
    realMapState: {
      layers: { aircraft: aircraftLayer },
      map: { getZoom: () => 11 },
      planeMarker: null,
      lastPlaneData: null,
    },
    aircraftPixelSizeForZoom(zoom) {
      assert.equal(zoom, 11);
      return 26;
    },
    planeIconHtml(heading, callsign, size) {
      iconCalls.push({ heading, callsign, size });
      return `plane:${heading}:${callsign}:${size}`;
    },
    L: {
      divIcon(options) { return { type: 'divIcon', options }; },
      marker(position, options) {
        markerCreateCount += 1;
        marker.position = position;
        marker.options = options;
        return marker;
      },
    },
  };

  const update = runFunction('updateLeafletAircraftMarker', context);
  update(-15.8, -47.9, 91, 'GLO1234');

  assert.equal(markerCreateCount, 1);
  assert.strictEqual(context.realMapState.planeMarker, marker);
  assert.strictEqual(marker.layer, aircraftLayer);
  assert.equal(marker.position[0], -15.8);
  assert.equal(marker.position[1], -47.9);
  assert.equal(context.realMapState.lastPlaneData.lat, -15.8);
  assert.equal(context.realMapState.lastPlaneData.lng, -47.9);
  assert.equal(context.realMapState.lastPlaneData.heading, 91);
  assert.equal(context.realMapState.lastPlaneData.callsign, 'GLO1234');
  assert.equal(marker.options.zIndexOffset, 1000);
  assert.equal(marker.options.keyboard, false);
  assert.equal(marker.options.interactive, false);
  assert.equal(marker.options.icon.options.iconSize[0], 26);
  assert.equal(marker.options.icon.options.iconAnchor[0], 13);

  const originalMarker = context.realMapState.planeMarker;
  update(-16.1, -48.2, 135, 'GLO1234');

  assert.equal(markerCreateCount, 1, 'second update must reuse the existing Leaflet marker');
  assert.strictEqual(context.realMapState.planeMarker, originalMarker);
  assert.equal(marker.position[0], -16.1);
  assert.equal(marker.position[1], -48.2);
  assert.equal(marker.icon.options.html, 'plane:135:GLO1234:26');
  assert.equal(iconCalls.length, 2);
  assert.equal(iconCalls[0].heading, 91);
  assert.equal(iconCalls[1].heading, 135);
});

test('updateLeafletAircraftMarker is inert when the aircraft layer is unavailable', () => {
  let markerCreateCount = 0;
  const context = {
    realMapState: { layers: { aircraft: null }, map: { getZoom: () => 10 }, planeMarker: null },
    aircraftPixelSizeForZoom: () => 24,
    planeIconHtml: () => 'plane',
    L: {
      divIcon: () => ({}),
      marker: () => { markerCreateCount += 1; return {}; },
    },
  };

  const update = runFunction('updateLeafletAircraftMarker', context);
  update(1, 2, 3, 'TEST');
  assert.equal(markerCreateCount, 0);
  assert.equal(context.realMapState.planeMarker, null);
});

test('googlePlaneSymbol preserves zoom scaling, heading and anchor contract', () => {
  const context = {
    realMapState: { map: { getZoom: () => 5 } },
    clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
    google: { maps: { Point: function Point(x, y) { this.x = x; this.y = y; } } },
  };
  const symbolFor = runFunction('googlePlaneSymbol', context);

  const low = symbolFor(270);
  assert.equal(low.scale, 0.62);
  assert.equal(low.rotation, 270);
  assert.equal(low.fillColor, '#ffd143');
  assert.equal(low.strokeColor, '#2b3438');
  assert.equal(low.anchor.x, 0);
  assert.equal(low.anchor.y, 0);

  context.realMapState.map.getZoom = () => 30;
  assert.equal(symbolFor(0).scale, 1.38, 'symbol scale must remain clamped at the upper bound');

  context.realMapState.map = null;
  const fallback = symbolFor(undefined);
  assert.equal(fallback.scale, 0.875, 'missing map must preserve zoom 8 fallback');
  assert.equal(fallback.rotation, 0);
});

test('updateGoogleAircraftMarker creates once and reuses the Google marker', () => {
  let markerCreateCount = 0;
  let overlayAddCount = 0;

  function Marker(options) {
    markerCreateCount += 1;
    this.options = options;
    this.position = options.position;
    this.icon = options.icon;
    this.label = options.label;
    this.setPosition = (position) => { this.position = position; };
    this.setIcon = (icon) => { this.icon = icon; };
    this.setLabel = (label) => { this.label = label; };
  }

  const map = { id: 'google-map' };
  const context = {
    realMapState: { engine: 'google', map, googlePlane: null },
    googlePlaneSymbol: (heading) => ({ type: 'symbol', heading }),
    addGoogleOverlay(marker) {
      overlayAddCount += 1;
      assert.strictEqual(marker, context.realMapState.googlePlane);
    },
    google: { maps: { Marker } },
  };

  const update = runFunction('updateGoogleAircraftMarker', context);
  update(-23.4, -46.6, 45, 'TAM3774');

  const originalMarker = context.realMapState.googlePlane;
  assert.equal(markerCreateCount, 1);
  assert.equal(overlayAddCount, 1);
  assert.strictEqual(originalMarker.options.map, map);
  assert.equal(originalMarker.position.lat, -23.4);
  assert.equal(originalMarker.position.lng, -46.6);
  assert.equal(originalMarker.icon.heading, 45);
  assert.equal(originalMarker.label.text, 'TAM3774');
  assert.equal(originalMarker.options.zIndex, 1000);

  update(-22.9, -43.2, 180, 'TAM3774');
  assert.equal(markerCreateCount, 1, 'second update must reuse the existing Google marker');
  assert.equal(overlayAddCount, 1);
  assert.strictEqual(context.realMapState.googlePlane, originalMarker);
  assert.equal(originalMarker.position.lat, -22.9);
  assert.equal(originalMarker.position.lng, -43.2);
  assert.equal(originalMarker.icon.heading, 180);
  assert.equal(originalMarker.label.text, 'TAM3774');
});

test('updateGoogleAircraftMarker is inert outside the Google engine or without a map', () => {
  let markerCreateCount = 0;
  const context = {
    realMapState: { engine: 'leaflet', map: {}, googlePlane: null },
    googlePlaneSymbol: () => ({}),
    addGoogleOverlay: () => {},
    google: { maps: { Marker: function Marker() { markerCreateCount += 1; } } },
  };

  const update = runFunction('updateGoogleAircraftMarker', context);
  update(1, 2, 3, 'TEST');
  assert.equal(markerCreateCount, 0);

  context.realMapState.engine = 'google';
  context.realMapState.map = null;
  update(1, 2, 3, 'TEST');
  assert.equal(markerCreateCount, 0);
});
