// Finds the Chrome or Chromium to drive. puppeteer-core does not download a browser, so one has to
// be installed already; pass a path when it is not in one of these places.
import { existsSync } from 'node:fs';

const USUAL = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

export function findChrome(given) {
  if (given) {
    if (!existsSync(given)) throw new Error('No Chrome at ' + given);
    return given;
  }
  const found = USUAL.find(existsSync);
  if (!found) throw new Error('Chrome not found. Install Chrome or Chromium, or pass its path (--chrome for render.mjs, opts.chrome for a scenario).');
  return found;
}
