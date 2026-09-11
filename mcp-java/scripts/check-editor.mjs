// Run after ./gradlew test and npm ci in the repository root.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const serverDir = fileURLToPath(new URL("../", import.meta.url));
const root = path.resolve(serverDir, "..");
const require = createRequire(path.join(root, "package.json"));
const { build } = require("esbuild");
const { JSDOM } = require("jsdom");
const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;
const output = path.join(serverDir, "build/interop/editor.cjs");
await build({
  entryPoints: [path.join(root, "src/services/xtfService.ts")],
  bundle: true, platform: "node", format: "cjs", outfile: output,
});
const { parseSingleXtfTransfer } = require(output);
const dataset = parseSingleXtfTransfer(readFileSync(path.join(serverDir, "build/interop/dataset.xtf"), "utf8"));
assert.equal(dataset.dataset.attributes.length, 2);
assert.equal(dataset.dataset.attributes[1].name, "FOO");
assert.equal(dataset.dataset.attributes[1].description, "Neue Bedeutung");
assert.equal(dataset.dataset.temporalCoverage.startDate, "2024-01-01");
const series = parseSingleXtfTransfer(readFileSync(path.join(serverDir, "build/interop/series.xtf"), "utf8"));
assert.equal(series.series.issues.at(-1).identifier, "new");
assert.equal(series.series.issues.at(-1).attributes[0].name, "FOO");
assert.ok(series.series.issues.length > 1);
console.log("Editor interoperability passed: dataset attributes and series issues preserved.");
