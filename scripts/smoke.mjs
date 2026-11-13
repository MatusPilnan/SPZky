// Browser smoke test: drives the real app in a headless Chromium browser
// (Edge or Chrome) through the main flows and fails on any broken step or
// uncaught page error.
//
//   npm run smoke              # builds, then tests the production build
//   MODE=dev node scripts/smoke.mjs   # test the dev server (readable stack traces)
//
// Browser: set BROWSER_PATH, otherwise common Edge/Chrome locations are tried.
// Screenshots go to .smoke/ (gitignored).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const projectDir = process.cwd();
const outDir = path.join(projectDir, '.smoke');
const PORT = 4174;
const BASE = `http://localhost:${PORT}`;

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

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const server = spawn(
	process.execPath,
	[path.join(projectDir, 'node_modules/vite/bin/vite.js'), process.env.MODE === 'dev' ? 'dev' : 'preview', '--port', String(PORT), '--strictPort'],
	{ cwd: projectDir, stdio: 'ignore' }
);

const results = [];
const check = (name, ok, detail = '') => results.push({ ok, line: `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}` });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
	for (let i = 0; i < 80; i++) {
		try {
			if ((await fetch(BASE)).ok) return;
		} catch {
			// not up yet
		}
		await sleep(250);
	}
	throw new Error('server did not start');
}

let browser;
try {
	await waitForServer();
	browser = await puppeteer.launch({
		executablePath: findBrowser(),
		headless: true,
		args: ['--no-first-run'],
		userDataDir: path.join(outDir, 'profile')
	});
	await browser.defaultBrowserContext().overridePermissions(BASE, ['geolocation']);
	const page = await browser.newPage();
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
	const text = () => page.evaluate(() => document.querySelector('main').innerText);
	async function typePlate(value) {
		await page.click(plateSel, { clickCount: 3 });
		await page.keyboard.press('Backspace');
		await page.type(plateSel, value);
		await sleep(150);
	}

	await page.goto(`${BASE}/add`, { waitUntil: 'networkidle0' });
	await page.waitForSelector(plateSel);
	await sleep(500); // let geolocation fire

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

	// SK 2023 plate without region
	await typePlate('AA-123BC');
	check('SK 2023 plate → no region', (await text()).includes('since 2023'));

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
	await shot('02-add-manual');
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
	check('quick grid counts found', t.includes('2 / 93 found'), t.match(/\d+ \/ \d+ found/)?.[0]);
	await page.evaluate(() => [...document.querySelectorAll('.grid button')].find((b) => b.innerText.startsWith('KE')).click());
	await page.waitForFunction(() => document.querySelector('main').innerText.includes('3 / 93 found'));
	check('quick tap logged', true);
	await shot('03-quick');
	await page.evaluate(() =>
		[...document.querySelectorAll('.toasts .toast button')].find((b) => b.innerText.toUpperCase().includes('UNDO')).click()
	);
	await page.waitForFunction(() => document.querySelector('main').innerText.includes('2 / 93 found'));
	check('undo removed quick entry', true);

	// history + edit
	await page.goto(`${BASE}/history`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('ul li');
	const items = await page.$$eval('ul li', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	check('history lists 3 sightings', items.length === 3, items.join(' || '));
	check('history shows location pin', items.some((i) => i.includes('📍')));
	await shot('04-history');
	await page.click('ul li:last-child a');
	await page.waitForFunction(
		() =>
			document.querySelector('main').innerText.includes('Edit sighting') &&
			document.querySelector('input[aria-label="Plate number"]')?.value
	);
	t = await text();
	check('edit page loads with location', t.includes('48.14860') && t.includes('±12 m'));
	await shot('05-edit');
	await page.type('input[placeholder^="e.g. highway"]', 'test note');
	await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText === 'Save changes').click());
	await page.waitForFunction(() => location.pathname === '/history');
	await page.waitForFunction(() => document.querySelector('main').innerText.includes('test note'));
	check('edit saved note', true);

	// Slovak UI
	await page.evaluate(() => localStorage.setItem('spz-ky.locale', 'sk'));
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
	t = await page.evaluate(() => document.body.innerText);
	check('home in Slovak with plural form', t.includes('3 zaznamenané ŠPZ'), t.split('\n').slice(0, 6).join(' | '));
	await shot('06-home-sk');
} catch (e) {
	check('script', false, e.stack);
} finally {
	await browser?.close().catch(() => {});
	server.kill();
}

for (const r of results) console.log(r.line);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No page/console errors');
process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
