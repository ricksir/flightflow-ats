import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const server = readFileSync(new URL("../tools/dev-server.mjs", import.meta.url), "utf8");

test("npm start exposes the local FlightFlow server", () => {
  assert.equal(pkg.scripts.start, "node tools/dev-server.mjs");
  assert.match(server, /const HOST = "127\.0\.0\.1"/);
  assert.match(server, /process\.env\.PORT \|\| "4173"/);
  assert.match(server, /server\.listen\(PORT, HOST/);
});

test("local server uses only Node built-in imports", () => {
  const imports = [...server.matchAll(/from ["']([^"']+)["']/g)].map(match => match[1]);
  assert.ok(imports.length > 0);
  assert.ok(imports.every(specifier => specifier.startsWith("node:")));
});
