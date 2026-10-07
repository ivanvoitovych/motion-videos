#!/usr/bin/env node
// The take for the "tour" video: the sample app (examples/sample-app) used the way a person would.
// The dashboard, a new order through the dialog, the status filter, dark mode.
//
//   node examples/tour/record.mjs --dry    check that every step finds its target (seconds)
//   node examples/tour/record.mjs          record (about ten times the length of the video)
//   node render.mjs examples/tour --blur 2
//
// For your own app: give `base` (its address) in place of `serve`, and sign in your own way in
// `login`. Everything else is the same.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { record } from '../../lib/recorder.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

await record('tour', {
  serve: join(HERE, '..', 'sample-app'),
  start: '/',
  // A smaller window than the default 1600x900: the interface fills more of the frame.
  width: 1280, height: 720,
  // Signing in is not filmed. This goes through the form; setting a cookie would do as well.
  async login(page, base) {
    await page.goto(base + '/login.html');
    await page.type('input[name=email]', 'maya@example.com');
    await page.type('input[name=password]', 'not-a-real-password');
    await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
  },
}, async t => {
  // 1. The dashboard
  t.mark('dashboard');
  t.say('The real app, driven by a script', 3);
  await t.hold(2.2);
  await t.cam('.chart', 1.3, .9);
  await t.moveTo('.chart svg', [.8, .3]);
  await t.hold(1.4);
  await t.cam(null, 1, .8);

  // 2. A new order, through the dialog
  t.mark('orders');
  await t.click({ text: 'Orders', in: 'nav a' });
  await t.waitFor('#rows tr');
  await t.hold(.6);
  t.say('It clicks, types and drags like a person', 3.4);
  await t.click('#new');
  await t.waitFor('.veil.on');
  await t.cam('.dialog', 1.45, .8);
  await t.click({ label: 'Customer' });
  await t.type('Priya Raman', .07);
  await t.select({ label: 'Plant' }, 'Fiddle-leaf fig');
  await t.drag('input[name=quantity]', .02, .3);
  await t.check('input[name=gift]');
  await t.hold(.4);
  await t.click({ text: 'Save order', in: 'button' });
  await t.cam(null, 1, .8);

  // 3. The page answers: a new row, and a toast that leaves by itself
  t.mark('saved');
  await t.until(() => document.querySelector('#rows tr')?.textContent.includes('Priya Raman'));
  t.say('The page answers in its own time', 3);
  await t.cam('#rows tr', 1.2, .8, [.5, 2]);
  await t.hold(2.4);
  await t.cam(null, 1, .8);

  // 4. The status filter (a native <select>: the list itself cannot be filmed, the value changes)
  t.mark('filter');
  await t.select('#filter', 'Pending');
  await t.hold(1.2);

  // 5. Dark mode
  t.mark('dark');
  await t.click({ text: 'Settings', in: 'nav a' });
  await t.hold(.4);
  t.say('Changed the UI? Run the script again', 3.6);
  await t.check('.switch span');
  await t.hold(1);
  await t.click({ text: 'Dashboard', in: 'nav a' });
  await t.hold(2.6);
});
