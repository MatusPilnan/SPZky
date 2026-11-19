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
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const startServer = () =>
	spawn(
		process.execPath,
		[path.join(projectDir, 'node_modules/vite/bin/vite.js'), PREVIEW ? 'preview' : 'dev', '--port', String(PORT), '--strictPort'],
		{ cwd: projectDir, stdio: 'ignore' }
	);
let server = startServer();

const results = [];
const check = (name, ok, detail = '') => results.push({ ok, line: `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}` });
const errors = [];
const failedRequests = [];
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
	// OpenStreetMap (address lookup + map tiles) is answered locally: no traffic to their
	// servers from tests. Only these two hosts are intercepted; everything else is untouched.
	// While `offline` is set, these requests fail like they would without a connection.
	const osm = { lookups: [], tiles: 0, offline: false };
	const osmCdp = await page.createCDPSession();
	await osmCdp.send('Fetch.enable', {
		patterns: [{ urlPattern: 'https://nominatim.openstreetmap.org/*' }, { urlPattern: 'https://tile.openstreetmap.org/*' }]
	});
	const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
	osmCdp.on('Fetch.requestPaused', (e) => {
		if (osm.offline) {
			void osmCdp.send('Fetch.failRequest', { requestId: e.requestId, errorReason: 'InternetDisconnected' }).catch(() => {});
			return;
		}
		const lookup = e.request.url.startsWith('https://nominatim.');
		if (lookup) osm.lookups.push({ at: Date.now(), url: e.request.url });
		else osm.tiles++;
		const body = lookup
			? Buffer.from(JSON.stringify({ address: { road: 'Hlavná', house_number: '1', city: 'Bratislava' } })).toString('base64')
			: PNG_1PX;
		void osmCdp
			.send('Fetch.fulfillRequest', {
				requestId: e.requestId,
				responseCode: 200,
				responseHeaders: [
					{ name: 'Content-Type', value: lookup ? 'application/json' : 'image/png' },
					{ name: 'Access-Control-Allow-Origin', value: '*' }
				],
				body
			})
			.catch(() => {});
	});
	// SLOW=4 throttles the CPU 4× to surface race conditions that only show on slow CI runners.
	if (process.env.SLOW) await page.emulateCPUThrottling(Number(process.env.SLOW));
	await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
	await page.setGeolocation({ latitude: 48.1486, longitude: 17.1077, accuracy: 12 });
	page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message || String(e))));
	// Failed requests with the last check before them, printed with any errors (diagnosis).
	page.on('requestfailed', (r) =>
		failedRequests.push(`${r.failure()?.errorText} ${r.method()} ${r.url()} (after: ${results.at(-1)?.line.slice(0, 60) ?? 'start'})`)
	);
	page.on('console', (m) => {
		// OpenStreetMap is answered by this test, which fails its requests on purpose while
		// offline: map tiles (the app then shows the offline pin) and address lookups (a
		// background lookup can be under way when the test switches offline; the app retries
		// later). Those failures are expected.
		const url = m.location()?.url ?? '';
		if (url.startsWith('https://tile.openstreetmap.org/') || url.startsWith('https://nominatim.openstreetmap.org/')) return;
		// With the URL, so a failed request in CI shows what was requested.
		if (m.type() === 'error') errors.push(`console: ${m.text()}${m.location()?.url ? ` (${m.location().url})` : ''}`);
	});
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
	check('no approximate-location hint for a precise fix (±12 m)', (await page.$('[data-testid=location] .coarse')) === null);
	await shot('01-add-sk');
	// Record whether the red "already logged" warning shows up at any moment during the save
	// (it used to flash: the list of plates updated before the input was cleared).
	await page.evaluate(() => {
		window.__warnFlash = false;
		new MutationObserver(() => {
			if (document.querySelector('.notice.warn')) window.__warnFlash = true;
		}).observe(document.querySelector('main'), { childList: true, subtree: true });
	});
	await page.keyboard.press('Enter');
	await page.waitForSelector('.toasts .toast');
	await sleep(500);
	check('no duplicate warning flashes after saving', !(await page.evaluate(() => window.__warnFlash)));
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
	// Personalised SK plate since 2023 (long badge text; used for the badge width check in History)
	await typePlate('AF66666');
	await page.keyboard.press('Enter');
	await page.waitForFunction(() => document.querySelector('.toasts')?.innerText.includes('AF66666'));

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
	// Android with "approximate location" reports ±2000 m: the app explains how to get precise.
	await page.setGeolocation({ latitude: 48.1486, longitude: 17.1077, accuracy: 2000 });
	await page.reload({ waitUntil: 'networkidle0' });
	await page.waitForSelector('[data-testid=location] .coarse', { timeout: 5000 }).catch(() => {});
	const coarseText = await page.$eval('[data-testid=location]', (e) => e.innerText).catch(() => '');
	check('approximate location (±2000 m) explains how to allow precise location', coarseText.includes('precise location'), coarseText);
	await shot('02b-add-coarse');
	await page.setGeolocation({ latitude: 48.1486, longitude: 17.1077, accuracy: 12 });
	await page.reload({ waitUntil: 'networkidle0' });
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('Location will be saved'));

	// CZ pre-2001 + CZ standard
	await typePlate('BN 12-34');
	t = await text();
	check('CZ vintage detected', t.includes('Benešov') && t.includes('before 2001'));
	const vintageInput = await page.$eval('.plate:has(input)', (p) => ({ plain: p.dataset.plain, band: !!p.querySelector('.band') }));
	check('pre-2001 plate: input without the EU band', vintageInput.plain === 'true' && !vintageInput.band, JSON.stringify(vintageInput));
	await typePlate('1A2 3456');
	const modernInput = await page.$eval('.plate:has(input)', (p) => !!p.querySelector('.band'));
	check('current CZ plate: input with the EU band', modernInput);
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
	check('quick grid counts found (nationwide not counted)', t.includes('2 / 74 found'), t.match(/\d+ \/ \d+ found/)?.[0]);
	check('quick mode shows the nationwide section', t.includes('Nationwide') && t.includes('2 plates'));
	await page.evaluate(() => [...document.querySelectorAll('.grid button')].find((b) => b.innerText.startsWith('KE')).click());
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('3 / 74 found'));
	check('quick tap logged', true);
	await page.evaluate(() =>
		[...document.querySelectorAll('.toasts .toast button')].find((b) => b.innerText.toUpperCase().includes('UNDO')).click()
	);
	await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('2 / 74 found'));
	check('undo removed quick entry', true);
	await page.evaluate(() => [...document.querySelectorAll('.nationwide button')].find((b) => b.innerText.includes('Electric')).click());
	await page.waitForFunction(() => document.querySelector('.nationwide').innerText.includes('3 plates'));
	t = await text();
	check('quick nationwide EV logged, region count unchanged', t.includes('2 / 74 found'));
	await shot('04-quick');

	// history + edit
	let badgeEm = 0;
	await page.goto(`${APP}/history`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('ul li');
	const items = await page.$$eval('ul li', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	// BA, AA (nationwide), AF66666 (nationwide), EL (CZ, EV), 1A2, ZA (manual), quick SK EV
	check('history lists 7 sightings', items.length === 7, items.join(' || '));
	// Plate badges: same size for every plate, and nothing cut off (AF66666 used to be clipped
	// on narrow phones). Checked at the normal width and at 360 px (small Android phones).
	for (const width of [400, 360]) {
		await page.setViewport({ width, height: 860, deviceScaleFactor: 1 });
		await sleep(150);
		const badges = await page.$$eval('ul li .plate', (els) =>
			els.map((e) => {
				const text = e.querySelector('.text');
				return {
					label: text.innerText,
					width: Math.round(e.getBoundingClientRect().width),
					em: e.getBoundingClientRect().width / parseFloat(getComputedStyle(e).fontSize),
					clipped: e.scrollWidth > e.clientWidth + 1 || text.scrollWidth > text.clientWidth + 1
				};
			})
		);
		const widths = new Set(badges.map((b) => b.width));
		if (width === 400) badgeEm = badges[0]?.em;
		check(`plate badges all have the same width (${width} px)`, widths.size === 1, badges.map((b) => `${b.label}=${b.width}`).join(', '));
		check(
			`plate badges are not clipped (${width} px)`,
			badges.every((b) => !b.clipped),
			badges.filter((b) => b.clipped).map((b) => b.label).join(', ')
		);
	}
	await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
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
	const editWithLocation = page.url();
	// Address (looked up in the background, saved on the sighting) and the street map.
	const placeShown = await page
		.waitForFunction(() => document.querySelector('[data-testid=place]')?.innerText.includes('Hlavná 1, Bratislava'), { timeout: 20_000 })
		.then(() => true, () => false);
	check('edit page shows the looked-up address', placeShown, await page.$eval('[data-testid=place]', (e) => e.innerText).catch(() => '?'));
	const streetMap = await page
		.waitForFunction(() => document.querySelectorAll('[data-testid=street-map] img.leaflet-tile-loaded').length > 0, { timeout: 10_000 })
		.then(() => true, () => false);
	const attribution = await page.$eval('[data-testid=street-map] .leaflet-control-attribution', (e) => e.innerText).catch(() => '');
	check('edit page shows a street map with the OpenStreetMap credit', streetMap && attribution.includes('OpenStreetMap'), attribution);
	const gaps = osm.lookups.slice(1).map((l, i) => l.at - osm.lookups[i].at);
	check('address lookups: at most one per second, street level', gaps.every((g) => g >= 1000) && osm.lookups.every((l) => l.url.includes('zoom=18')), `${osm.lookups.length} lookups, gaps ${gaps.join(',')} ms`);
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
	// Language "System default": no saved choice, the app follows the browser's languages
	// (Slovak for sk/cs, English for anything else). Then back to English for the rest.
	await page.select('[data-testid=language]', 'system');
	const systemLang = await page.evaluate(() => {
		const tags = navigator.languages.length ? navigator.languages : [navigator.language];
		const first = tags.map((t) => t.toLowerCase().split(/[-_]/)[0]).find((l) => ['sk', 'cs', 'en'].includes(l));
		return {
			saved: localStorage.getItem('spz-ky.locale'),
			lang: document.documentElement.lang,
			expected: first === 'sk' || first === 'cs' ? 'sk' : 'en',
			label: document.querySelector('[data-testid=language] option[value=system]')?.textContent
		};
	});
	check(
		'language: system default follows the browser, nothing saved',
		systemLang.saved === null && systemLang.lang === systemLang.expected && !!systemLang.label?.includes(systemLang.expected === 'sk' ? 'Slovenčina' : 'English'),
		JSON.stringify(systemLang)
	);
	await page.select('[data-testid=language]', 'en');
	check('language: an explicit choice is saved', (await page.evaluate(() => localStorage.getItem('spz-ky.locale'))) === 'en');
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
	// Data so far: SK BA, ZA, KE + 3 nationwide (AA-123BC, AF66666, quick EV); CZ A + 1 nationwide (EL-123AB)
	// Wait for the data (cards render before the database query delivers it).
	await page
		.waitForFunction(
			() => document.querySelectorAll('main ul li').length === 3 && document.querySelector('a.collection')?.innerText.includes('3 of 74'),
			{ timeout: 10000 }
		)
		.catch(() => {});
	// Countries (default: most recently spotted first, 3 large cards, the rest as tiles).
	const fullCards = () => page.$$eval('section a.collection', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	const tileLabels = () => page.$$eval('[data-testid=collection-tile]', (els) => els.map((e) => e.getAttribute('aria-label')));
	const cards = await fullCards();
	check(
		'home shows progress per country',
		cards.some((c) => c.includes('Slovakia') && c.includes('3 of 74 found') && c.includes('+ 3 nationwide plates')) &&
			cards.some((c) => c.includes('Czechia') && c.includes('1 of 14 found') && c.includes('+ 1 nationwide plate')),
		cards.join(' || ')
	);
	check('home lists recent sightings', (await page.$$('main ul li')).length === 3);
	// KE-111AA (SK) was the last plate added, then CZ: most recently spotted first.
	check(
		'home: 3 large cards, most recently spotted first',
		cards.length === 3 && cards[0].includes('Slovakia') && cards[1].includes('Czechia'),
		cards.map((c) => c.split(' ').slice(0, 2).join(' ')).join(', ')
	);
	const tiles = await tileLabels();
	// Countries without plates follow alphabetically: Austria is the 3rd card, Bulgaria the 1st tile.
	check('home: the other countries as tiles', tiles.length >= 8 && tiles[0] === 'Bulgaria: 0 of 30 found', tiles.join(', '));
	// Tiles are square; flag and percentage sit centred inside the donut's hole.
	const tileShape = await page.$$eval('[data-testid=collection-tile]', (els) =>
		els.map((t) => {
			const r = t.getBoundingClientRect();
			// The donut's square (the SVG is rotated, which doesn't change its square box).
			const d = t.querySelector('svg.donut').getBoundingClientRect();
			const parts = [...t.querySelectorAll('.flag, .pct')].map((e) => e.getBoundingClientRect());
			const left = Math.min(...parts.map((p) => p.left));
			const right = Math.max(...parts.map((p) => p.right));
			const top = Math.min(...parts.map((p) => p.top));
			const bottom = Math.max(...parts.map((p) => p.bottom));
			// Ring's outer diameter: (15.9 + 1.8) / 18 = 98 % of the box; the text may overlap
			// the ring a little but stays within it.
			const dx = Math.abs((left + right) / 2 - (d.left + d.width / 2));
			const dy = Math.abs((top + bottom) / 2 - (d.top + d.height / 2));
			return {
				square: Math.abs(r.width - r.height) <= 1,
				centred: dx <= 1 && dy <= 1,
				// The circle is centred in the SVG box with the box's shorter side as diameter.
				inside: Math.hypot(right - left, bottom - top) <= Math.min(d.width, d.height) * 0.98,
				named: !!t.querySelector('.name')?.textContent && t.querySelector('.name').scrollWidth <= t.querySelector('.name').clientWidth,
				w: Math.round(r.width),
				h: Math.round(r.height),
				dx: Math.round(dx * 10) / 10,
				dy: Math.round(dy * 10) / 10
			};
		})
	);
	const tileOk = (s) => s.square && s.centred && s.inside && s.named;
	check(
		'home tiles: square, full name, flag and % centred inside the donut',
		tileShape.length > 0 && tileShape.every(tileOk),
		JSON.stringify(tileShape.find((s) => !tileOk(s)) ?? tileShape[0])
	);
	await page
		.waitForFunction(() => document.querySelectorAll('section a.collection svg.map').length === 3, { timeout: 5000 })
		.catch(() => {});
	check('home: large cards show map thumbnails', (await page.$$('section a.collection svg.map')).length === 3);

	// Bonus collections: collapsed to a summary, open on tap.
	const bonusSummary = await page.$eval('[data-testid=bonus] summary', (s) => s.innerText.replace(/\s+/g, ' '));
	const bonusOpen = () => page.$eval('[data-testid=bonus]', (d) => d.open);
	check(
		'home: bonus collections collapsed to counts',
		!(await bonusOpen()) && /Bonus collections 4\b/.test(bonusSummary) && bonusSummary.includes('0 started') && bonusSummary.includes('4 not started'),
		bonusSummary
	);
	await page.click('[data-testid=bonus] summary');
	const bonusCards = await page.$$eval('[data-testid=bonus] a.collection', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	check('home: bonus collections open on tap', (await bonusOpen()) && bonusCards.some((c) => c.includes('pre-2001') && c.includes('0 of 96 found')), bonusCards.join(' || '));
	// Every card has a map thumbnail, except collections without a map (Poland before 2000).
	const withoutThumb = await page.$$eval('[data-testid=bonus] a.collection', (els) =>
		els.filter((c) => !c.querySelector('svg.map')).map((c) => c.querySelector('strong')?.innerText)
	);
	check('home: bonus cards show map thumbnails (except Poland pre-2000)', withoutThumb.join() === 'Poland (pre-2000)', withoutThumb.join());
	// The percentage never wraps ("0 %" on two lines next to a long name).
	const wrappedPct = await page.$$eval('a.collection .pct', (els) =>
		els.filter((e) => e.getClientRects().length > 1 || e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 1.5).map((e) => e.closest('a')?.querySelector('strong')?.textContent)
	);
	check('home: collection percentages stay on one line', wrappedPct.length === 0, wrappedPct.join(', '));
	await shot('09-home');

	// Continent map: every tracked country coloured by progress, tap opens its collection.
	await page.waitForSelector('[data-testid=continents] path.country', { timeout: 5000 }).catch(() => {});
	const continent = await page.$$eval('[data-testid=continents] path.country', (els) => ({
		labels: els.map((e) => e.getAttribute('aria-label')),
		started: els.filter((e) => e.classList.contains('started')).map((e) => e.dataset.code).sort(),
		land: !!document.querySelector('[data-testid=continents] path.land')?.getAttribute('d')
	}));
	check(
		'home: Europe map with every tracked country, coloured where plates were found',
		continent.labels.length === tiles.length + 3 && continent.labels.includes('Slovakia: 4 %') && continent.started.join() === 'CZ,SK' && continent.land,
		`${continent.labels.length} countries, started ${continent.started.join()}`
	);
	await page.$eval('[data-testid=continents] path[data-code=AT]', (p) => p.dispatchEvent(new MouseEvent('click', { bubbles: true })));
	const openedAt = await page
		.waitForFunction(() => location.pathname.endsWith('/country') && location.search === '?id=at', { timeout: 5000 })
		.then(() => true, () => false);
	check('home: tapping a country on the map opens its collection', openedAt);
	await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });

	// Settings: alphabetical order, no large cards → every country is a tile, Austria first.
	await page.goto(`${APP}/settings`, { waitUntil: 'networkidle0' });
	const setHome = async (order, full) => {
		await page.select('[data-testid=home-order]', order);
		await page.$eval(
			'[data-testid=home-full-count]',
			(el, n) => {
				el.value = String(n);
				el.dispatchEvent(new Event('change', { bubbles: true }));
			},
			full
		);
	};
	await setHome('alpha', 0);
	await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('[data-testid=collection-tile]');
	const alphaTiles = await tileLabels();
	check(
		'home settings: alphabetical, all as tiles',
		(await fullCards()).length === 0 && alphaTiles[0]?.startsWith('Austria') && alphaTiles.length === tiles.length + 3,
		alphaTiles.slice(0, 3).join(', ')
	);
	check('home: bonus section stays open (remembered)', await bonusOpen());
	await shot('09b-home-tiles');
	await page.goto(`${APP}/settings`, { waitUntil: 'networkidle0' });
	await setHome('recent', 3);
	await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('section a.collection');
	await page.evaluate(() => [...document.querySelectorAll('a.collection')].find((a) => a.innerText.includes('Slovakia')).click());
	await page.waitForFunction(() => location.pathname.endsWith('/country') && document.querySelector('main h1'));
	const gridSize = () => page.$$eval('.grid button', (b) => b.length);
	const filterTo = (label) =>
		page.evaluate((l) => [...document.querySelectorAll('.filters button')].find((b) => b.innerText === l).click(), label);
	const progressShown = await page
		.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('3 of 74 found'), { timeout: 5000 })
		.then(() => true, () => false);
	check('country screen shows progress', progressShown);
	check('country grid shows all codes', (await gridSize()) === 74);
	await filterTo('Found');
	await sleep(100);
	check('filter: found', (await gridSize()) === 3);
	await filterTo('Missing');
	await sleep(100);
	check('filter: missing', (await gridSize()) === 71);
	await filterTo('Found');
	await sleep(100);
	await page.evaluate(() => [...document.querySelectorAll('.grid button')].find((b) => b.innerText.startsWith('BA')).click());
	await page.waitForSelector('dialog[open]');
	let sheet = await page.$eval('dialog[open]', (d) => d.innerText.replace(/\s+/g, ' '));
	check('region details: count and plates', sheet.includes('Seen once') && sheet.includes('BA-123AB'), sheet);
	await shot('10-country-region');
	// Close and immediately open another sheet in the same tick: the browser's close event
	// arrives after the new sheet opened and must not close it (was a real bug, seen on CI).
	await page.evaluate(async () => {
		[...document.querySelectorAll('dialog[open] button')].find((b) => b.innerText === 'Close').click();
		// Let Svelte's effect run dialog.close() (microtasks), but not the queued close event (a task).
		for (let i = 0; i < 5; i++) await Promise.resolve();
		[...document.querySelectorAll('.nationwide button')].find((b) => b.innerText.includes('Electric')).click();
	});
	await sleep(300);
	check('quick re-open of details is not closed by the previous close', (await page.$('dialog[open]')) !== null);
	await page.waitForSelector('dialog[open]');
	sheet = await page.$eval('dialog[open]', (d) => d.innerText.replace(/\s+/g, ' '));
	const evItems = await page.$$eval('dialog[open] li', (l) => l.length);
	check('nationwide details list only this country and type', evItems === 1 && sheet.includes('Nationwide'), sheet);
	await page.keyboard.press('Escape');
	await page.waitForFunction(() => !document.querySelector('dialog[open]'));
	check('details close with Escape', true);

	// Collapsible history: closed by default, then only this country's plates
	check('country history starts collapsed', await page.$eval('details.history', (d) => !d.open));
	// Centre it first: scrolled only just into view it would sit under the fixed bottom nav.
	await page.$eval('details.history summary', (s) => s.scrollIntoView({ block: 'center' }));
	// Toasts (e.g. "New region: KE") sit above the bottom nav for a few seconds and catch taps.
	await page.waitForFunction(() => !document.querySelector('.toasts .toast'), { timeout: 8000 });
	await page.click('details.history summary');
	await page.waitForSelector('details.history[open] li');
	const countryHistory = await page.$$eval('details.history li', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ')));
	const summaryCount = await page.$eval('details.history summary .badge', (e) => e.innerText);
	check(
		'country history lists only this country',
		countryHistory.length === 6 && summaryCount === '6' && countryHistory.every((i) => !i.includes('CZ ') && !i.includes('Czechia')),
		countryHistory.join(' || ')
	);

	// Map: 79 SK districts; Bratislava I–V partial (only BA of BA/BL/BT), Košice I–IV + Žilina found
	await page.waitForSelector('svg.map.interactive path[role=button]');
	const mapState = await page.$$eval('svg.map.interactive path[role=button]', (ps) => ({
		total: ps.length,
		found: ps.filter((p) => p.classList.contains('found')).map((p) => p.dataset.area).sort(),
		partial: ps.filter((p) => p.classList.contains('partial')).map((p) => p.dataset.area).sort()
	}));
	check(
		'map colours found and partial districts',
		mapState.total === 79 &&
			mapState.found.join() === 'Košice I,Košice II,Košice III,Košice IV,Žilina' &&
			mapState.partial.join() === 'Bratislava I,Bratislava II,Bratislava III,Bratislava IV,Bratislava V',
		JSON.stringify(mapState)
	);
	check('map credits its data source', (await text()).includes('Map: Geoportal.SK'));
	await page.click('svg.map path[data-area="Bratislava I"]');
	await page.waitForSelector('dialog[open] .area-codes');
	sheet = await page.$eval('dialog[open]', (d) => d.innerText.replace(/\s+/g, ' '));
	check(
		'tapping a shared-code area lists its codes and plates',
		['BA', 'BL', 'BT', 'Seen once', 'Not spotted yet', 'BA-123AB'].every((s) => sheet.includes(s)),
		sheet
	);
	const outlined = await page.$$eval('svg.map path.outline', (ps) => ps.length);
	check('selected area is outlined on the map (all of Bratislava)', outlined === 5, String(outlined));
	await shot('11b-country-map');
	await page.keyboard.press('Escape');
	await page.waitForFunction(() => !document.querySelector('dialog[open]'));
	await page.click('svg.map path[data-area="Žilina"]');
	await page.waitForSelector('dialog[open]');
	sheet = await page.$eval('dialog[open]', (d) => d.innerText.replace(/\s+/g, ' '));
	check('tapping a single-code area opens that code', sheet.includes('ZA') && sheet.includes('Žilina') && sheet.includes('1234567'), sheet);
	// Taps inside the sheet keep it open; a tap on the darkened area above closes it.
	await page.click('dialog[open] h2');
	await sleep(200);
	check('a tap inside the details keeps them open', (await page.$('dialog[open]')) !== null);
	await page.mouse.click(200, 80);
	const closedOutside = await page
		.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 3000 })
		.then(() => true, () => false);
	check('a tap outside the details closes them', closedOutside);
	await shot('11-country');

	// Slovak UI
	await page.evaluate(() => localStorage.setItem('spz-ky.locale', 'sk'));
	await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });
	t = await page.evaluate(() => document.body.innerText);
	// 7 sightings above + KE-111AA → "many" plural form
	check('home in Slovak with plural form', t.includes('8 zaznamenaných ŠPZ'), t.split('\n').slice(0, 6).join(' | '));
	await shot('08-home-sk');

	// Nationwide tiles in Slovak (long words like "Personalizovaná"): nothing may overflow the
	// tile, and the count must keep its distance from the right edge.
	await page.goto(`${APP}/country?id=sk`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('.nationwide .type');
	for (const width of [400, 360]) {
		await page.setViewport({ width, height: 860, deviceScaleFactor: 1 });
		await sleep(150);
		const tiles = await page.$$eval('.nationwide .type', (els) =>
			els.map((b) => {
				const box = b.getBoundingClientRect();
				const count = b.querySelector('.count')?.getBoundingClientRect();
				// A word split across lines has more than one client rect.
				const textNode = b.querySelector('.label')?.firstChild;
				const brokenWords = [];
				if (textNode?.nodeType === Node.TEXT_NODE) {
					for (const m of textNode.textContent.matchAll(/\S+/g)) {
						const range = document.createRange();
						range.setStart(textNode, m.index);
						range.setEnd(textNode, m.index + m[0].length);
						const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
						if (lines.size > 1) brokenWords.push(m[0]);
					}
				}
				return {
					label: b.innerText.replace(/\s+/g, ' '),
					overflow: b.scrollWidth > b.clientWidth + 1,
					countGap: count ? Math.round(box.right - count.right) : null,
					brokenWords
				};
			})
		);
		const bad = tiles.filter((x) => x.overflow || (x.countGap !== null && x.countGap < 4) || x.brokenWords.length);
		check(`nationwide tiles fit in Slovak (${width} px)`, bad.length === 0, JSON.stringify(bad.length ? bad : tiles));
	}
	await shot('08b-country-sk');
	await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });

	// Austria: own band code "A"; SK/AT overlaps are listed, GPS (Bratislava) puts SK first
	// without the "fits more than one country" notice.
	await page.goto(`${APP}/add`, { waitUntil: 'networkidle0' });
	// The UI is Slovak here, so find the input by its plate frame, not its label.
	const typeAny = async (value) => {
		await page.click('.plate input', { clickCount: 3 });
		await page.keyboard.press('Backspace');
		await page.type('.plate input', value);
		await sleep(150);
	};
	await page.waitForSelector('.plate input');
	await typeAny('BA 123 AB');
	const overlap = await page.evaluate(() => ({
		candidates: [...document.querySelectorAll('.candidates .candidate')].map((c) => c.innerText.replace(/\s+/g, ' ')),
		notice: !!document.querySelector('p.notice:not(.warn)')
	}));
	check(
		'SK/AT overlap: both listed, Slovakia first, no notice with GPS in SK',
		overlap.candidates.length === 2 && /Slovensko|Slovakia/.test(overlap.candidates[0]) && !overlap.notice,
		JSON.stringify(overlap)
	);
	// A bare French plate (no department) in France: hint to add the band's number; with it,
	// it counts. (In Slovakia the same shape is a Slovak plate, so no hint there.)
	await page.setGeolocation({ latitude: 48.8566, longitude: 2.3522, accuracy: 12 });
	await page.reload({ waitUntil: 'networkidle0' });
	await page.waitForSelector('.plate input');
	await sleep(500);
	await typeAny('GH-456-JK');
	check('bare French plate in France: hint to add the department', (await page.$('[data-testid=fr-hint]')) !== null);
	await page.setGeolocation({ latitude: 48.1486, longitude: 17.1077, accuracy: 12 });
	await page.reload({ waitUntil: 'networkidle0' });
	await page.waitForSelector('.plate input');
	await sleep(500);
	await typeAny('GH-456-JK 2A');
	const fr = await page.$eval('.candidates .candidate', (c) => c.innerText.replace(/\s+/g, ' ')).catch(() => '');
	check('French plate with department: Corse-du-Sud', fr.includes('2A') && fr.includes('Corse-du-Sud'), fr);
	await typeAny('BA 123 AB');
	check('no French hint on a Slovak plate (GPS in SK)', (await page.$('[data-testid=fr-hint]')) === null);
	await typeAny('W 12345 A');
	const austrian = await page.evaluate(() => ({
		band: document.querySelector('.plate .cc')?.textContent,
		candidate: document.querySelector('.candidates .candidate')?.innerText.replace(/\s+/g, ' ')
	}));
	check('Austrian plate: Wien, band shows "A"', austrian.band === 'A' && /W\b.*Wien/.test(austrian.candidate ?? ''), JSON.stringify(austrian));
	await shot('02c-add-austria');

	// Bonus collection (CZ pre-2001): explanation with a band-less plate as wide as the others.
	await page.goto(`${APP}/country?id=cz-vintage`, { waitUntil: 'networkidle0' });
	await page.waitForSelector('[data-testid=about] .plate');
	const about = await page.$eval('[data-testid=about]', (s) => ({
		text: s.innerText,
		band: !!s.querySelector('.plate .band'),
		em: s.querySelector('.plate').getBoundingClientRect().width / parseFloat(getComputedStyle(s.querySelector('.plate')).fontSize)
	}));
	check(
		'pre-2001 collection explains the plates, plate shown without the EU band',
		about.text.includes('1960') && about.text.includes('Gottwaldov') && !about.band,
		about.text.slice(0, 80)
	);
	check(
		'band-less plate is as wide as the others (relative to font size)',
		Math.abs(about.em - badgeEm) < 0.05,
		`${about.em.toFixed(2)} vs ${badgeEm.toFixed(2)} em`
	);
	await shot('11c-vintage-about');
	// A rare code (✦) explains why in its detail sheet.
	await page.evaluate(() => [...document.querySelectorAll('.grid button')].find((b) => b.querySelector('.code')?.textContent === 'GT').click());
	const rareNote = await page
		.waitForSelector('dialog[open] [data-testid=rare-note]', { timeout: 3000 })
		.then((e) => e.evaluate((n) => n.innerText.replace(/\s+/g, ' ')), () => '');
	check('rare code explains why in its detail sheet', rareNote.includes('Zlín') && rareNote.includes('ZL'), rareNote);
	await shot('11d-rare-note');
	await page.keyboard.press('Escape');

	// Back stack: Home at the bottom, bottom-bar screens replace each other, detail screens
	// on top of where they were opened, Home tab jumps back. (System back = history.back().)
	{
		const where = () => page.evaluate((base) => location.pathname.slice(base.length).replace(/\/$/, '') || '/', BASE_PATH);
		const settle = async (before) => {
			await page.waitForFunction((b) => location.href !== b, { timeout: 5000 }, before);
			await sleep(250);
		};
		const tap = async (selector) => {
			const before = page.url();
			await page.click(selector);
			await settle(before);
		};
		const systemBack = async () => {
			const before = page.url();
			await page.evaluate(() => history.back());
			await settle(before);
		};
		const tab = (route) => `nav a[href$="${BASE_PATH}${route}"]`;

		await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });
		await tap(tab('/add'));
		await tap(tab('/history'));
		await tap(tab('/settings'));
		await tap(tab('/history'));
		await tap(tab('/add'));
		await systemBack();
		check('back after switching tabs back and forth goes straight Home', (await where()) === '/', await where());

		await tap(tab('/history'));
		await tap('main ul li:first-child a');
		check('edit page opens from History', (await where()) === '/sighting');
		await systemBack();
		check('back from the edit page returns to History', (await where()) === '/history', await where());
		await systemBack();
		check('…and then to Home', (await where()) === '/', await where());

		await tap(tab('/history'));
		await tap('main ul li:first-child a');
		await page.click('form button.primary[type=submit]'); // save without changes
		await page.waitForFunction((b) => location.pathname.startsWith(b + '/history'), {}, BASE_PATH);
		await sleep(250);
		await systemBack();
		check('saving on the edit page goes back (no extra History entry)', (await where()) === '/', await where());

		await tap('a.collection[href*="country"]');
		await tap(tab('/settings'));
		await systemBack();
		check('country → Settings tab → back lands on Home', (await where()) === '/', await where());

		await tap(tab('/history'));
		await tap('main ul li:first-child a');
		await tap(tab('/'));
		check('Home tab from a detail screen goes Home', (await where()) === '/', await where());
		await tap(tab('/settings'));
		await systemBack();
		check('…and the stack is sane afterwards (Settings → back → Home)', (await where()) === '/', await where());
	}

	// Export / import (Settings → Your data). Downloads land in .smoke/.
	{
		const liveCount = () =>
			page.evaluate(
				() =>
					new Promise((resolve) => {
						const req = indexedDB.open('spz-ky');
						req.onsuccess = () => {
							const all = req.result.transaction('sightings').objectStore('sightings').getAll();
							all.onsuccess = () => resolve(all.result.filter((s) => s.deleted === 0).length);
						};
					})
			);
		for (const f of readdirSync(outDir)) if (/^spz-ky-.*\.json$/.test(f)) rmSync(path.join(outDir, f), { force: true });
		const cdp = await browser.target().createCDPSession();
		await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
		await page.goto(`${APP}/settings`, { waitUntil: 'networkidle0' });
		await page.waitForSelector('[data-testid=data] [data-testid=export]');
		await page.click('[data-testid=data] [data-testid=export]');
		let exported = null;
		for (let i = 0; i < 40 && !exported; i++) {
			await sleep(250);
			exported = readdirSync(outDir).find((f) => /^spz-ky-\d{4}-\d{2}-\d{2}\.json$/.test(f)) ?? null;
		}
		const before = await liveCount();
		const backup = exported ? JSON.parse(readFileSync(path.join(outDir, exported), 'utf8')) : null;
		check(
			'export downloads a JSON file with every plate',
			backup?.app === 'spz-ky' && backup.format === 1 && backup.sightings.length === before,
			`${exported}: ${backup?.sightings.length} of ${before}`
		);

		// Import the file back plus one new plate and one broken entry: only the new plate is added.
		const importPath = path.join(outDir, 'import-test.json');
		const extra = { ...backup.sightings[0], plate: 'NR-777XY', regionCode: 'NR', plateType: 'sk-district' };
		writeFileSync(importPath, JSON.stringify({ ...backup, sightings: [...backup.sightings, extra, { broken: true }] }));
		const input = await page.$('[data-testid=data] input[type=file]');
		await input.uploadFile(importPath);
		await page.waitForSelector('dialog[aria-labelledby=import-title][open]');
		const previewText = await page.$eval('dialog[aria-labelledby=import-title]', (d) => d.innerText.replace(/\s+/g, ' '));
		check('import preview counts new and skipped entries', previewText.includes(`${before + 1} ŠPZ`) && previewText.includes(': 1.'), previewText);
		await shot('12-import');
		await page.click('dialog[aria-labelledby=import-title] .btn.primary');
		await page.waitForFunction(() => !document.querySelector('dialog[aria-labelledby=import-title][open]'));
		check('import (add) adds only the new plate', (await liveCount()) === before + 1, String(await liveCount()));

		writeFileSync(importPath, '{"app":"something-else"}');
		await input.uploadFile(importPath);
		await page.waitForSelector('[data-testid=data] .error');
		check('import rejects a foreign file', true);
	}

	// Offline: every page must load from the service worker cache, incl. the edit page with ?id=
	if (PREVIEW) {
		await page.setOfflineMode(true);
		osm.offline = true;
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
			// Offline, the location is a pin on the app's own map instead of the street map.
			await page.goto(editWithLocation, { waitUntil: 'load' });
			const pinShown = await page
				.waitForSelector('[data-testid=pin-map] circle.dot', { timeout: 5000 })
				.then(() => true, () => false);
			const savedPlace = await page.$eval('[data-testid=place]', (e) => e.innerText).catch(() => '');
			check('offline: location shown as a pin on the region map, address still there', pinShown && savedPlace.includes('Hlavná 1'), savedPlace);
			await shot('09b-offline-pin');
			// Map data is loaded on demand: it must come from the cache, too.
			await page.goto(`${APP}/country?id=cz-vintage`, { waitUntil: 'load' });
			const offlineMap = await page
				.waitForFunction(() => document.querySelectorAll('svg.map path[role=button]').length === 77, { timeout: 5000 })
				.then(() => true, () => false);
			check('offline: country map loads (77 CZ districts)', offlineMap);
			await shot('09-offline-edit');
		} finally {
			await page.setOfflineMode(false);
			osm.offline = false;
		}

		// A new release: rebuild with a different version, let the service worker find it.
		// "New version available" must be a centred modal over a darkened screen, and a tap
		// outside it closes it.
		execSync(`"${process.execPath}" node_modules/vite/bin/vite.js build`, {
			cwd: projectDir,
			stdio: 'ignore',
			env: { ...process.env, SMOKE_VERSION_SUFFIX: '-smoke-update' }
		});
		// The preview server reads the files once at startup: restart it to serve the new build.
		server.kill();
		await sleep(500);
		server = startServer();
		await waitForServer();
		await page.goto(`${APP}/`, { waitUntil: 'networkidle0' });
		await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
		const updateShown = await page
			.waitForSelector('dialog[data-testid=update][open]', { timeout: 20_000 })
			.then(() => true, () => false);
		const box = updateShown
			? await page.$eval('dialog[data-testid=update]', (d) => {
					const r = d.getBoundingClientRect();
					return {
						dx: Math.round(r.left + r.width / 2 - innerWidth / 2),
						dy: Math.round(r.top + r.height / 2 - innerHeight / 2),
						backdrop: getComputedStyle(d, '::backdrop').backgroundColor
					};
				})
			: null;
		check(
			'new version: centred modal with a darkened backdrop',
			!!box && Math.abs(box.dx) < 20 && Math.abs(box.dy) < 40 && /rgba\(0, 0, 0, 0\.[1-9]/.test(box.backdrop),
			JSON.stringify(box)
		);
		// "What's new" comes from the new deployment's changelog.json (fake entry for this build).
		const news = await page
			.waitForSelector('[data-testid=whats-new] li', { timeout: 5000 })
			.then((el) => el?.evaluate((li) => li.textContent), () => null);
		check("new version: shows what's new from the deployed changelog", news === 'Smoke test release', String(news));
		await shot('13-update');
		await page.mouse.click(8, 120);
		const dismissed = await page
			.waitForFunction(() => !document.querySelector('dialog[data-testid=update][open]'), { timeout: 3000 })
			.then(() => true, () => false);
		check('new version modal closes on a tap outside', dismissed);
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
if (errors.length && failedRequests.length) console.log('FAILED REQUESTS:\n' + failedRequests.join('\n'));
process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
