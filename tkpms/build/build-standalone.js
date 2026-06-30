'use strict';
// Builds a fully self-contained, double-clickable tkpms-standalone.html:
//  - inlines React, ReactDOM and JsBarcode (production builds)
//  - swaps the Express/SQLite backend for an in-browser localStorage store
//  - pre-compiles the JSX with Babel so no transformer is needed at runtime
const fs = require('fs');
const path = require('path');
const Babel = require('@babel/standalone');

const root = path.join(__dirname, '..');
const served = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const clientStore = fs.readFileSync(path.join(__dirname, 'clientStore.js'), 'utf8');

// 1. Pull the CSS out of the served page.
const css = served.match(/<style>([\s\S]*?)<\/style>/)[1];

// 2. Pull the app's JSX (the babel script block) out of the served page.
const scriptMatch = served.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
let appSrc = scriptMatch[1];

// 3. Replace the fetch-based api() + API const with the localStorage store.
const startMarker = "      const API = '/api';";
const endMarker = "        return data;\n      }";
const startIdx = appSrc.indexOf(startMarker);
const endIdx = appSrc.indexOf(endMarker) + endMarker.length;
if (startIdx < 0 || endIdx < endMarker.length) {
  throw new Error('Could not locate the api() block to replace');
}
appSrc = appSrc.slice(0, startIdx) + clientStore + appSrc.slice(endIdx);

// 4. Standalone tweaks: footer label + add a "Reset demo data" affordance hook.
appSrc = appSrc.replace('Backend :5000', 'Local browser storage');

// 5. Compile JSX -> plain JS (classic runtime, no runtime Babel needed).
const compiled = Babel.transform(appSrc, {
  presets: [['react', { runtime: 'classic' }]],
}).code;

// 6. Inline the production libraries.
const react = fs.readFileSync(path.join(root, 'node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDom = fs.readFileSync(path.join(root, 'node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const jsbarcode = fs.readFileSync(path.join(root, 'node_modules/jsbarcode/dist/JsBarcode.all.min.js'), 'utf8');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TKPMS · Turkish Passenger Management System (Standalone)</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${react}</script>
    <script>${reactDom}</script>
    <script>${jsbarcode}</script>
    <script>window.__TKPMS_STANDALONE__ = true;</script>
    <script>
${compiled}
    </script>
  </body>
</html>
`;

const outPath = path.join(root, 'standalone', 'tkpms-standalone.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('Wrote ' + outPath + ' (' + kb + ' KB)');
