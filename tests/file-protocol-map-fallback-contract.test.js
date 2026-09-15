import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("file protocol activates vector fallback before Leaflet online tiles", () => {
  const loader = html.indexOf("function loadLeafletNonBlocking()");
  const fileGuard = html.indexOf("window.location.protocol==='file:'", loader);
  const leafletInit = html.indexOf("if(window.L){initializeLeafletMap()", loader);

  assert.ok(loader >= 0);
  assert.ok(fileGuard > loader);
  assert.ok(leafletInit > fileGuard);
});

test("file protocol guidance points users to npm start local server", () => {
  assert.match(
    html,
    /Mapa vetorial offline ativo · para cartografia online execute npm start e abra http:\/\/127\.0\.0\.1:4173/
  );
});
