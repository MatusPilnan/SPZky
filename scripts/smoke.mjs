// Browser smoke test: drives the real app in a headless Chromium browser
// (Edge or Chrome) through the main flows and fails on any broken step or
// uncaught page error.
//
//   npm run smoke              # builds, then tests the production build
//   MODE=dev node scripts/smoke.mjs   # test the dev server (readable stack traces)
//
// BASE_PATH (e.g. /SPZky) tests a build made for a sub-path; build with the same value.
// Browser: set BROWSER_PATH, otherwise common Edge/Chrome locations are tried.
// Screenshots go to .smoke/ (gitignored).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const projectDir = process.cwd();
const outDir = path.join(projectDir, '.smoke');
const PORT = 4174;
const ORIGIN = `http://localhost:${PORT}`;
const BASE_PATH = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
const APP = ORIGIN + BASE_PATH;
const PREVIEW = process.env.MODE !== 'dev';

function findBrowser() {
	const candidates = [
		process.env.BROWSER_PATH,
		'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
		'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
		'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/microsoft-edge'
	];
	const found = candidates.find((p) => p && existsSync(p));
	if (!found) throw new Error('No Chromium-based browser found. Set BROWSER_PATH.');
	return found;
}

// Fresh output folder: remove old screenshots only (a browser profile could be locked on Windows).
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith('.png')) rmSync(path.join(outDir, f), { force: true });
// Fresh browser profile per run, so no IndexedDB/service worker state leaks between runs.
const profileDir = mkdtempSync(path.join(os.tmpdir(), 'spzky-smoke-'));

const server = spawn(
	process.execPath,
	[path.join(projectDir, 'node_modules/vite/bin/vite.js'), PREVIEW ? 'preview' : 'dev', '--port', String(PORT), '--strictPort'],
	{ cwd: projectDir, stdio: 'ignore' }
);

const results = [];
const check = (name, ok, detail = '') => results.push({ ok, line: `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}` });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
	for (let i = 0; i < 80; i++) {
		try {
			if ((await fetch(`${APP}/`)).ok) return;
		} catch {
			// not up yet
		}
		await sleep(250);
	}
	throw new Error('server did not start');
}

let browser;
/** @type {import('puppeteer-core').Page | undefined} */
let page;
try {
	await waitForServer();
	browser = await puppeteer.launch({
		executablePath: findBrowser(),
		headless: true,
		// CI runners (Ubuntu 24.04) restrict the user namespaces Chrome's sandbox needs.
		args: ['--no-first-run', ...(process.env.CI ? ['--no-sandbox'] : [])],
		userDataDir: profileDir
	});
	await browser.defaultBrowserContext().overridePermissions(ORIGIN, ['geolocation']);
	page = await browser.newPage();
	// SLOW=4 throttles the CPU 4× to surface race conditions that only show on slow CI runners.
	if (process.env.SLOW) await page.emulateCPUThrottling(Number(process.env.SLOW));
	await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
	await page.setGeolocation({ latitude: 48.1486, longitude: 17.1077, accuracy: 12 });
	page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message || String(e))));
	page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
	// Start in English with location saving on; later steps may change these.
	await page.evaluateOnNewDocument(() => {
		if (!localStorage.getItem('spz-ky.locale')) localStorage.setItem('spz-ky.locale', 'en');
		if (!localStorage.getItem('spz-ky.prefs'))
			localStorage.setItem('spz-ky.prefs', JSON.stringify({ saveLocation: true, addMode: 'plate', quickCollection: 'sk' }));
	});

	const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
	const plateSel = 'input[aria-label="Plate number"]';
	const text = () => page.evaluate(() => (document.querySelector('main')?.innerText ?? ''));
	async function typePlate(value) {
		await page.click(plateSel, { clickCount: 3 });
		await page.keyboard.press('Backspace');
		await page.type(plateSel, value);
		await sleep(150);
	}

	await page.goto(`${APP}/add`, { waitUntil: 'networkidle0' });
	await page.waitForSelector(plateSel);
	await sleep(500); // let geolocation fire

	// Service worker (production build only; disabled in dev)
	if (PREVIEW) {
		const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
		check('service worker active with app scope', scope === `${ORIGIN}${BASE_PATH}/`, scope);

		// "Ready to work offline" closes itself after a countdown (mouse is not over it).
		const offlineText = 'ready to work offline';
		const shown = await page
			.waitForFunction((s) => document.body.innerText.includes(s), { timeout: 5000 }, offlineText)
			.then(() => true, () => false);
		check('offline-ready message shown with countdown bar', shown && (await page.$('.countdown')) !== null);
		await shot('00-offline-ready');
		const started = Date.now();
		const closed = await page
			.waitForFunction((s) => !document.body.innerText.includes(s), { timeout: 9000 }, offlineText)
			.then(() => true, () => false);
		check('offline-ready message closes by itself', closed, `${((Date.now() - started) / 1000).toFixed(1)} s`);
	}

	// SK district plate
	await typePlate('ba-123ab');
	let t = await text();
	check('SK plate detected', /BA\s*Bratislava/.test(t) && /new!/i.test(t));
	check('location ready', t.includes('Location will be saved'));
	await shot('01-add-sk');
	await page.keyboard.press('Enter');
	await page.waitForSelector('.toasts .toast');
	const toast1 = await page.$eval('.toasts .toast', (e) => e.innerText);
	check('save shows new-region toast', toast1.includes('New region: BA'), toast1);
	check('input cleared after save', (await page.$eval(plateSel, (e) => e.value)) === '');

	// duplicate
	await typePlate('BA 123 AB');
	t = await text();
	check('duplicate warned', t.includes('already logged this plate'));
	check('save disabled on duplicate', await page.$eval('button.save', (b) => b.disabled));

	// SK 2023 plate without region → nationwide, saveable
	await typePlate('AA-123BC');
	t = await text();
	check('SK 2023 plate → nationwide candidate', t.includes('Slovakia · Nationwide') && t.includes('not counted'));
	await page.keyboard.press('Enter');
	await page.waitForFunction(() => document.querySelector('.toasts')?.innerText.includes('(nationwide)'));
	check('nationwide plate saved', true);

	// EL plates fit SK and CZ: GPS country first (Bratislava → SK, Praha → CZ)
	const firstCandidate = () => page.$eval('.candidates .candidate', (e) => e.innerText.replace(/\s+/g, ' '));
	await typePlate('EL-123AB');
	t = await text();
	check('EL plate asks for the country', t.includes('fits more than one country') && t.includes('green letters'));
	check('EL plate: GPS in SK → Slovakia first', (await firstCandidate()).includes('Slovakia'), await firstCandidate());
	await shot('02-add-ev-sk');
	await page.setGeolocation({ latitude: 50.0755, longitude: 14.4378, accuracy: 12 });
	await page.reload({ waitUntil: 'networkidle0' });
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('Location will be saved'));
	await typePlate('EL-123AB');
	check('EL plate: GPS in CZ → Czechia first', (await firstCandidate()).includes('Czechia'), await firstCandidate());
	await page.keyboard.press('Enter');
	await page.waitForFunction(() => document.querySelector('.toasts')?.innerText.includes('EL-123AB'));
	await page.setGeolocation({ latitude: 48.1486, longitude: 17.1077, accuracy: 12 });
	await page.reload({ waitUntil: 'networkidle0' });
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('Location will be saved'));

	// CZ pre-2001 + CZ standard
	await typePlate('BN 12-34');
	t = await text();
	check('CZ vintage detected', t.includes('Benešov') && t.includes('before 2001'));
	await typePlate('1A2 3456');
	check('CZ standard detected', (await text()).includes('Hlavní město Praha'));
	await page.keyboard.press('Enter');
	await sleep(300);

	// unrecognised → manual picker
	await typePlate('1234567');
	check('unrecognised shows manual picker', (await text()).includes('not recognised'));
	await shot('03-add-manual');
	await page.evaluate(() =>
		[...document.querySelectorAll('.manual .grid button')].find((b) => b.innerText.startsWith('ZA')).click()
	);
	await sleep(150);
	check('manual pick enables save', !(await page.$eval('button.save', (b) => b.disabled)));
	await page.keyboard.press('Enter');
	await sleep(300);

	// quick mode + undo
	await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].find((b) => b.innerText.includes('Quick')).click());
	await page.waitForSelector('.grid button');
	t = await text();
	// BA + ZA; the nationwide AA-123BC is not counted
	check('quick grid counts found (nationwide not counted)', t.includes('2 / 93 found'), t.match(/\d+ \/ \d+ found/)?.[0]);
	check('quick mode shows the nationwide section', t.includes('Nationwide') && t.includes('1 plate'));
	await page.evaluate(() => [...document.querySelectorAll('.grid button')].find((b) => b.innerText.startsWith('KE')).click());
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('3 / 93 found'));
	check('quick tap logged', true);
	await page.evaluate(() =>
		[...document.querySelectorAll('.toasts .toast button')].find((b) => b.innerText.toUpperCase().includes('UNDO')).click()
	);
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('2 / 93 found'));
	check('undo removed quick entry', true);
	await page.evaluate(() => [...document.querySelectorAll('.nationwide button')].find((b) => b.innerText.includes('Electric')).click());
	await page.waitForFunction(() => document.querySelector('.nationwide').innerText.includes('2 plates'));
	t = await text();
	check('quick nationwide EV logged, region count unchanged', t.includes('2 / 93 found'));
	await shot('04-quick');

	// history + edit
	await page.goto(`${APP}/history`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('ul li');
	const items = await page.$$eval('ul li', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	// BA, AA (nationwide), EL (CZ, EV), 1A2, ZA (manual), quick SK EV
	check('history lists 6 sightings', items.length === 6, items.join(' || '));
	check('history shows location pin', items.some((i) => i.includes('📍')));
	check('history highlights EV plates', items.filter((i) => i.includes('⚡')).length === 2);
	check('history labels nationwide plates', items.some((i) => i.includes('AA-123BC') && i.includes('Nationwide')));
	await shot('05-history');
	await page.click('ul li:last-child a');
	await page.waitForFunction(
		() =>
			(document.querySelector('main')?.innerText ?? '').includes('Edit sighting') &&
			document.querySelector('input[aria-label="Plate number"]')?.value
	);
	t = await text();
	check('edit page loads with location', t.includes('48.14860') && t.includes('±12 m'));
	await shot('06-edit');
	await page.type('input[placeholder^="e.g. highway"]', 'test note');
	await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText === 'Save changes').click());
	await page.waitForFunction(() => location.pathname.endsWith('/history'));
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('test note'));
	check('edit saved note', true);

	// Setting: return home after adding a plate
	await page.goto(`${APP}/settings`, { waitUntil: 'networkidle0' });
	await page.evaluate(() =>
		[...document.querySelectorAll('label.switch')]
			.find((l) => l.innerText.includes('Return to the home screen'))
			.querySelector('input[role=switch]')
			.click()
	);
	const switchOn = await page.evaluate(() =>
		[...document.querySelectorAll('label.switch')]
			.find((l) => l.innerText.includes('Return to the home screen'))
			.querySelector('input[role=switch]').checked
	);
	check('settings switch turns on', switchOn);
	await shot('07-settings');
	await page.goto(`${APP}/add`, { waitUntil: 'networkidle0' });
	await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].find((b) => b.innerText.includes('Plate')).click());
	await page.waitForSelector(plateSel);
	await typePlate('KE-111AA');
	await page.keyboard.press('Enter');
	const wentHome = await page
		.waitForFunction((home) => location.pathname === home, { timeout: 5000 }, `${BASE_PATH}/`)
		.then(() => true, () => false);
	const toastOnHome = await page.$eval('.toasts', (e) => e.innerText).catch(() => '');
	check('returns home after adding (setting on)', wentHome && toastOnHome.includes('KE'), toastOnHome);

	// Progress: home overview → country screen → region / nationwide details
	// Data so far: SK BA, ZA, KE + 2 nationwide (AA-123BC, quick EV); CZ A + 1 nationwide (EL-123AB)
	// Wait for the data (cards render before the database query delivers it).
	await page
		.waitForFunction(
			() => document.querySelectorAll('main ul li').length === 3 && document.querySelector('a.collection')?.innerText.includes('3 of 93'),
			{ timeout: 10000 }
		)
		.catch(() => {});
	const cards = await page.$$eval('a.collection', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	check(
		'home shows progress per country',
		cards.some((c) => c.includes('Slovakia') && c.includes('3 of 93 found') && c.includes('+ 2 nationwide plates')) &&
			cards.some((c) => c.includes('Czechia') && c.includes('1 of 14 found') && c.includes('+ 1 nationwide plate')) &&
			cards.some((c) => c.includes('pre-2001') && c.includes('0 of 96 found')),
		cards.join(' || ')
	);
	check('home lists recent sightings', (await page.$$('main ul li')).length === 3);
	await shot('09-home');
	await page.evaluate(() => [...document.querySelectorAll('a.collection')].find((a) => a.innerText.includes('Slovakia')).click());
	await page.waitForFunction(() => location.pathname.endsWith('/country') && document.querySelector('main h1'));
	const gridSize = () => page.$$eval('.grid button', (b) => b.length);
	const filterTo = (label) =>
		page.evaluate((l) => [...document.querySelectorAll('.filters button')].find((b) => b.innerText === l).click(), label);
	const progressShown = await page
		.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('3 of 93 found'), { timeout: 5000 })
		.then(() => true, () => false);
	check('country screen shows progress', progressShown);
	check('country grid shows all codes', (await gridSize()) === 93);
	await filterTo('Found');
	await sleep(100);
	check('filter: found', (await gridSize()) === 3);
	await filterTo('Missing');
	await sleep(100);
	check('filter: missing', (await gridSize()) === 90);
	await filterTo('Found');
	await sleep(100);
	await page.evaluate(() => [...document.querySelectorAll('.grid button')].find((b) => b.innerText.startsWith('BA')).click());
	await page.waitForSelector('dialog[open]');
	let sheet = await page.$eval('dialog[open]', (d) => d.innerText.replace(/\s+/g, ' '));
	check('region details: count and plates', sheet.includes('Seen once') && sheet.includes('BA-123AB'), sheet);
	await shot('10-country-region');
	await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')].find((b) => b.innerText === 'Close').click());
	await page.waitForFunction(() => !document.querySelector('dialog[open]'));
	await page.evaluate(() => [...document.querySelectorAll('.nationwide button')].find((b) => b.innerText.includes('Electric')).click());
	await page.waitForSelector('dialog[open]');
	sheet = await page.$eval('dialog[open]', (d) => d.innerText.replace(/\s+/g, ' '));
	const evItems = await page.$$eval('dialog[open] li', (l) => l.length);
	check('nationwide details list only this country and type', evItems === 1 && sheet.includes('Nationwide'), sheet);
	await page.keyboard.press('Escape');
	await page.waitForFunction(() => !document.querySelector('dialog[open]'));
	check('details close with Escape', true);
	await shot('11-country');

	// Slovak UI
	await page.evaluate(() => localStorage.setItem('spz-ky.locale', 'sk'));
	await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });
	t = await page.evaluate(() => document.body.innerText);
	// 6 sightings above + KE-111AA → "many" plural form
	check('home in Slovak with plural form', t.includes('7 zaznamenaných ŠPZ'), t.split('\n').slice(0, 6).join(' | '));
	await shot('08-home-sk');

	// Offline: every page must load from the service worker cache, incl. the edit page with ?id=
	if (PREVIEW) {
		await page.setOfflineMode(true);
		try {
			for (const route of ['/', '/add', '/settings', '/country?id=cz', '/history']) {
				await page.goto(`${APP}${route}`, { waitUntil: 'load' });
				await page.waitForSelector('nav', { timeout: 5000 });
				const ok = await page.evaluate(() => document.querySelector('main')?.innerText.trim().length > 0);
				check(`offline: ${route} loads`, ok);
			}
			// Full navigation (not the client router) so the request goes through the service worker.
			await page.waitForSelector('ul li a');
			const editUrl = await page.$eval('ul li:first-child a', (a) => a.href);
			await page.goto(editUrl, { waitUntil: 'load' });
			await page.waitForFunction(() => document.querySelector('main')?.innerText.includes('Upraviť záznam'));
			check('offline: edit page with ?id= loads', true);
			await shot('09-offline-edit');
		} finally {
			await page.setOfflineMode(false);
		}
	}
} catch (e) {
	check('script', false, e.stack);
	// Show where the run stopped (uploaded as a CI artifact on failure).
	await page?.screenshot({ path: path.join(outDir, 'zz-failure.png'), fullPage: true }).catch(() => {});
	const url = await Promise.resolve(page?.url()).catch(() => '?');
	console.log(`stopped at: ${url}`);
} finally {
	await browser?.close().catch(() => {});
	server.kill();
	try {
		rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
	} catch {
		// Windows may still hold files for a moment; it's in the temp folder anyway.
	}
}

for (const r of results) console.log(r.line);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No page/console errors');
process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
