#!/usr/bin/env node
// build.js — injects checklist.html into worker.js as a string constant
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'src/checklist.html'), 'utf8');
const workerTemplate = fs.readFileSync(path.join(__dirname, 'src/worker.js'), 'utf8');

// Escape for use inside backtick-delimited template literal
const escaped = html
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\${/g, '\\${');

const output = workerTemplate.replace('`__HTML_PLACEHOLDER__`', '`' + escaped + '`');

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/worker.js'), output);

console.log(`✓ Built dist/worker.js (${output.length} bytes, HTML ${html.length} bytes)`);
