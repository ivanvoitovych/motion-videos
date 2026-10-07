#!/usr/bin/env node
// Says whether this machine has what the kit needs: Node 18+, Chrome or Chromium, ffmpeg and the
// one npm package. Run it first: `npm run check`.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from './lib/chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let ok = true;
const line = (good, what, help) => { if (!good) ok = false; console.log(`${good ? 'ok  ' : 'MISSING'}  ${what}${good ? '' : '\n         ' + help}`); };

const major = Number(process.versions.node.split('.')[0]);
line(major >= 18, `Node ${process.versions.node}`, 'Install Node 18 or newer: https://nodejs.org');

let chrome = '';
try { chrome = findChrome(); } catch (e) {}
line(!!chrome, chrome ? `Chrome at ${chrome}` : 'Chrome or Chromium', 'Install Chrome, or pass its path: node render.mjs <folder> --chrome /path/to/chrome');

const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
line(ff.status === 0, ff.status === 0 ? ff.stdout.split('\n')[0].split(' Copyright')[0] : 'ffmpeg', 'Install ffmpeg and make sure it is on the PATH: https://ffmpeg.org/download.html');

line(existsSync(join(HERE, 'node_modules', 'puppeteer-core')), 'puppeteer-core (npm package)', 'Run: npm install');

console.log(ok ? '\nReady. Try: npm run hello' : '\nFix the lines marked MISSING, then run this again.');
process.exit(ok ? 0 : 1);
