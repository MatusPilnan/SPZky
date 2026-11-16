// End-to-end sync test: builds the app against the LOCAL Supabase stack, then
// drives several "devices" (separate browser contexts = separate storage)
// through sign-in with an email code (read from the stack's Mailpit), the
// sign-in conflict choices, offline changes, sign-out and cloud deletion.
//
//   npm run db:start          # local stack (Docker), once
//   npm run sync:e2e
//
// Uses the API URL and publishable key from `supabase status`. BASE_PATH and
// BROWSER_PATH work as in smoke.mjs. Screenshots go to .smoke/sync-*.png.
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const projectDir = process.cwd();
const outDir = path.join(projectDir, '.smoke');
mkdirSync(outDir, { recursive: true });
const PORT = 4175;
const ORIGIN = `http://localhost:${PORT}`;
const BASE_PATH = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
const APP = ORIGIN + BASE_PATH;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const status = JSON.parse(execSync('npx supabase status -o json', { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const API_URL = status.API_URL;
const KEY = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const MAILPIT = status.MAILPIT_URL ?? status.INBUCKET_URL;
if (!API_URL || !KEY || !MAILPIT) throw new Error(`Local Supabase stack not running? ${JSON.stringify(status)}`);

if (!process.env.SKIP_BUILD) {
	console.log('Building against the local stack…');
	execSync(`"${process.execPath}" node_modules/vite/bin/vite.js build`, {
		cwd: projectDir,
		stdio: 'inherit',
		env: { ...process.env, PUBLIC_SUPABASE_URL: API_URL, PUBLIC_SUPABASE_KEY: KEY }
	});
}

function findBrowser() {
	const candidates = [
		process.env.BROWSER_PATH,
		'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
		'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
		'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/microsoft-edge'
	];
	const found = candidates.find((p) => p && existsSync(p));
	if (!found) throw new Error('No Chromium-based browser found. Set BROWSER_PATH.');
	return found;
}

const server = spawn(
	process.execPath,
	[path.join(projectDir, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
	{ cwd: projectDir, stdio: 'ignore' }
);

const results = [];
const check = (name, ok, detail = '') => {
	results.push({ ok, line: `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}` });
	if (!ok) throw new Error(`check failed: ${name} ${detail}`);
};
const errors = [];

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

/** Latest sign-in code mailed to `email` (Mailpit API), newer than `after`. */
async function codeFor(email, after) {
	for (let i = 0; i < 60; i++) {
		const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
		const { messages = [] } = await res.json();
		const fresh = messages.filter((m) => Date.parse(m.Created) >= after - 1000);
		if (fresh.length) {
			const msg = await (await fetch(`${MAILPIT}/api/v1/message/${fresh[0].ID}`)).json();
			const code = /\b(\d{6})\b/.exec(msg.Text ?? msg.HTML ?? '')?.[1];
			if (code) return code;
		}
		await sleep(500);
	}
	throw new Error(`no code mailed to ${email}`);
}

const run = Date.now().toString(36);
const EMAIL = `e2e-${run}@example.test`;

let browser;
let current = 'setup';
const devices = [];
try {
	await waitForServer();
	browser = await puppeteer.launch({
		executablePath: findBrowser(),
		headless: true,
		args: ['--no-first-run', ...(process.env.CI ? ['--no-sandbox'] : [])],
		// Own temp profile: puppeteer's default one can't always be deleted on Windows (EPERM).
		userDataDir: mkdtempSync(path.join(os.tmpdir(), 'spzky-sync-'))
	});

	/** A fresh "device": own storage, English UI, plate mode, stays on Add after saving. */
	async function device(name) {
		const context = await browser.createBrowserContext();
		const page = await context.newPage();
		await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
		page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.stack || e.message || e}`));
		page.on('console', (m) => {
			// The browser logs failed requests while offline; that's expected here.
			if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource|Failed to fetch/.test(m.text()))
				errors.push(`${name} console: ${m.text()}`);
		});
		page.on('dialog', (d) => void d.accept());
		await page.evaluateOnNewDocument(() => {
			if (!localStorage.getItem('spz-ky.locale')) localStorage.setItem('spz-ky.locale', 'en');
			if (!localStorage.getItem('spz-ky.prefs'))
				localStorage.setItem('spz-ky.prefs', JSON.stringify({ saveLocation: false, addMode: 'plate', returnHomeAfterAdd: false }));
		});
		const d = { name, context, page };
		devices.push(d);
		return d;
	}

	/** Live plates in the device's IndexedDB. */
	const plates = (d) =>
		d.page.evaluate(
			() =>
				new Promise((resolve, reject) => {
					const req = indexedDB.open('spz-ky');
					req.onerror = () => reject(req.error);
					req.onsuccess = () => {
						const all = req.result.transaction('sightings').objectStore('sightings').getAll();
						all.onsuccess = () => resolve(all.result.filter((s) => s.deleted === 0).map((s) => s.plate).sort());
						all.onerror = () => reject(all.error);
					};
				})
		);

	async function addPlate(d, plate) {
		const { page } = d;
		if (!page.url().endsWith('/add')) await goto(d, '/add');
		const sel = 'input[aria-label="Plate number"]';
		await page.waitForSelector(sel);
		await page.click(sel, { clickCount: 3 });
		await page.keyboard.press('Backspace');
		await page.type(sel, plate);
		await page.waitForFunction((s, p) => document.querySelector(s)?.value === p, {}, sel, plate);
		await sleep(150);
		await page.keyboard.press('Enter');
		// Saved: the input clears (the toast says "Saved …" or "New region: …").
		await page.waitForFunction((s) => document.querySelector(s)?.value === '', {}, sel);
	}

	/** Full page load (like reopening the app), then wait until it has started. */
	async function goto(d, route) {
		await d.page.goto(`${APP}${route}`, { waitUntil: 'networkidle0' }).catch(() => {}); // offline: no idle network
		await d.page.waitForSelector('nav a.active');
		await sleep(300);
	}

	async function openSettings(d) {
		await goto(d, '/settings');
		await d.page.waitForSelector('[data-testid=account]');
	}

	/** Signs in with the email code; returns once signed in (conflict dialog may follow). */
	async function signIn(d, email = EMAIL) {
		const { page } = d;
		await openSettings(d);
		await page.type('input[name=email]', email);
		let sentAt = Date.now();
		// Supabase allows one code per address per 60 s; like a user, retry after the error.
		for (let attempt = 0; ; attempt++) {
			sentAt = Date.now();
			await page.click('[data-testid=account] form button[type=submit]');
			await page.waitForSelector('input[name=code], [data-testid=account] .error');
			if (await page.$('input[name=code]')) break;
			if (attempt > 15) throw new Error('code could not be sent');
			await sleep(5000);
		}
		const code = await codeFor(email, sentAt);
		await page.type('input[name=code]', code);
		await page.click('[data-testid=account] form button[type=submit]');
		await page.waitForFunction(() => document.querySelector('[data-testid=account]')?.innerText.includes('Signed in as'));
	}

	const conflictOpen = (d) => d.page.waitForSelector('[data-testid=conflict][open]', { timeout: 15_000 });

	async function choose(d, value) {
		await d.page.click(`[data-testid=conflict] input[value=${value}]`);
		await d.page.evaluate(() =>
			[...document.querySelectorAll('[data-testid=conflict] button')].find((b) => b.innerText === 'Continue').click()
		);
		await d.page.waitForSelector('[data-testid=conflict]:not([open])');
	}

	/** Waits until the device shows "Synced" with nothing pending. */
	async function synced(d) {
		await d.page.waitForFunction(
			() => {
				const box = document.querySelector('[data-testid=account]');
				return box?.querySelector('.status')?.getAttribute('data-status') === 'idle' && !box.innerText.includes('waiting to sync');
			},
			{ timeout: 20_000 }
		);
	}

	async function syncNow(d) {
		await openSettings(d);
		await synced(d); // the sync on opening the app
		await d.page.evaluate(() =>
			[...document.querySelectorAll('[data-testid=account] button')].find((b) => b.innerText === 'Sync now').click()
		);
		await synced(d);
	}

	async function signOut(d, keep) {
		const { page } = d;
		await page.evaluate(() =>
			[...document.querySelectorAll('[data-testid=account] button')].find((b) => b.innerText === 'Sign out').click()
		);
		await page.waitForSelector('dialog[aria-labelledby=signout-title][open]');
		if (keep) await page.click('dialog[aria-labelledby=signout-title] input[value=keep]');
		await page.click('dialog[aria-labelledby=signout-title] .btn.primary');
		await page.waitForSelector('input[name=email]');
	}

	const shot = (d, name) => d.page.screenshot({ path: path.join(outDir, `sync-${name}.png`), fullPage: true });

	// 1. Phone: plates before signing in; empty account → no question.
	current = 'phone sign-in';
	const phone = await device('phone');
	await addPlate(phone, 'BA-111AA');
	await signIn(phone);
	await synced(phone);
	check('phone: signs in with the mailed code, no question for an empty account', true);
	await shot(phone, '01-signed-in');

	// 2. Tablet with different plates → conflict dialog, merge.
	current = 'tablet merge';
	const tablet = await device('tablet');
	await addPlate(tablet, 'KE-222BB');
	await signIn(tablet);
	await conflictOpen(tablet);
	const counts = await tablet.page.$eval('[data-testid=conflict] .counts', (e) => e.innerText.replace(/\s+/g, ' '));
	check('tablet: conflict dialog shows both sides', /On this device 1 only here: 1/.test(counts) && /In the account 1 only there: 1/.test(counts), counts);
	await shot(tablet, '02-conflict');

	// The conflict dialog offers a backup of this device's plates before choosing.
	const downloads = path.join(outDir, 'sync-downloads');
	rmSync(downloads, { recursive: true, force: true });
	mkdirSync(downloads, { recursive: true });
	const cdp = await browser.target().createCDPSession();
	await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, browserContextId: tablet.context.id });
	await tablet.page.click('[data-testid=conflict] [data-testid=export]');
	let backupFile = null;
	for (let i = 0; i < 40 && !backupFile; i++) {
		await sleep(250);
		backupFile = readdirSync(downloads).find((f) => f.endsWith('.json')) ?? null;
	}
	const backup = backupFile ? JSON.parse(readFileSync(path.join(downloads, backupFile), 'utf8')) : null;
	check(
		'conflict dialog exports this device’s plates',
		backup?.sightings.map((s) => s.plate).join() === 'KE-222BB',
		backupFile ?? 'no file'
	);
	check('the dialog stays open after exporting', (await tablet.page.$('[data-testid=conflict][open]')) !== null);

	await choose(tablet, 'merge');
	await synced(tablet);
	check('tablet: merge keeps both', JSON.stringify(await plates(tablet)) === '["BA-111AA","KE-222BB"]', String(await plates(tablet)));

	// 3. Changes travel: a new plate on the phone syncs by itself, the tablet pulls it.
	current = 'changes travel';
	await addPlate(phone, 'NR-333CC');
	await openSettings(phone);
	await synced(phone);
	await syncNow(tablet);
	check('tablet receives the phone’s new plate', (await plates(tablet)).includes('NR-333CC'), String(await plates(tablet)));
	await syncNow(phone);
	check('phone receives the tablet’s plate', (await plates(phone)).includes('KE-222BB'), String(await plates(phone)));

	// 4. Offline: saved locally, status says offline, syncs when back online.
	current = 'offline';
	await tablet.page.setOfflineMode(true);
	await addPlate(tablet, 'ZA-444DD');
	await openSettings(tablet); // precached by the service worker
	await tablet.page.evaluate(() =>
		[...document.querySelectorAll('[data-testid=account] button')].find((b) => b.innerText === 'Sync now')?.click()
	);
	await tablet.page.waitForFunction(() =>
		document.querySelector('[data-testid=account]')?.innerText.includes('waiting to sync')
	);
	await shot(tablet, '03-offline');
	await tablet.page.setOfflineMode(false);
	await tablet.page.evaluate(() => dispatchEvent(new Event('online')));
	await synced(tablet);
	await syncNow(phone);
	check('offline change syncs after reconnecting', (await plates(phone)).includes('ZA-444DD'), String(await plates(phone)));

	// 5. Sign-out removes the plates (default); signing in with a different local plate and
	//    choosing "use the account's data" drops the local one.
	current = 'sign-out + use cloud';
	await openSettings(tablet);
	await signOut(tablet, false);
	check('sign-out (default) removes the plates from the device', (await plates(tablet)).length === 0);
	await addPlate(tablet, 'PO-555EE');
	await signIn(tablet);
	await conflictOpen(tablet);
	await choose(tablet, 'cloud');
	await synced(tablet);
	const accountPlates = '["BA-111AA","KE-222BB","NR-333CC","ZA-444DD"]';
	check('“use the account’s data” replaces the device’s plates', JSON.stringify(await plates(tablet)) === accountPlates, String(await plates(tablet)));

	// 6. Cancel at the conflict: signed out again, nothing changed.
	current = 'cancel';
	const laptop = await device('laptop');
	await addPlate(laptop, 'TT-666FF');
	await signIn(laptop);
	await conflictOpen(laptop);
	await laptop.page.evaluate(() =>
		[...document.querySelectorAll('[data-testid=conflict] button')].find((b) => b.innerText === 'Cancel sign-in').click()
	);
	await laptop.page.waitForSelector('input[name=email]');
	check('cancel keeps the device signed out and unchanged', JSON.stringify(await plates(laptop)) === '["TT-666FF"]');

	// 7. "Use this device's data": the account (and the other devices) end up with just its plates.
	current = 'use device';
	await signIn(laptop);
	await conflictOpen(laptop);
	await choose(laptop, 'device'); // confirm() is accepted by the dialog handler
	await synced(laptop);
	await syncNow(phone);
	check('“use this device’s data” replaces the account, also on other devices', JSON.stringify(await plates(phone)) === '["TT-666FF"]', String(await plates(phone)));

	// 8. Sign-out keeping the plates, then delete cloud data.
	current = 'keep + delete cloud';
	await openSettings(phone);
	await signOut(phone, true);
	check('sign-out (keep) leaves the plates on the device', JSON.stringify(await plates(phone)) === '["TT-666FF"]');
	await openSettings(laptop);
	await laptop.page.evaluate(() =>
		[...document.querySelectorAll('[data-testid=account] button')].find((b) => b.innerText === 'Delete my cloud data').click()
	);
	await laptop.page.waitForSelector('input[name=email]');
	check('delete cloud data signs out and keeps local plates', JSON.stringify(await plates(laptop)) === '["TT-666FF"]');
	await signIn(phone);
	await synced(phone);
	check('after deleting, the account is empty (no question on sign-in)', true);

	check('no page errors', errors.length === 0, errors.join('\n'));
} catch (e) {
	results.push({ ok: false, line: `FAIL [${current}] ${e.message ?? e}` });
	for (const d of devices) await d.page.screenshot({ path: path.join(outDir, `sync-zz-failure-${d.name}.png`), fullPage: true }).catch(() => {});
	if (errors.length) results.push({ ok: false, line: errors.join('\n') });
} finally {
	await browser?.close().catch(() => {});
	server.kill();
}

for (const r of results) console.log(r.line);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} failed` : `\nAll ${results.length} sync checks passed`);
process.exit(failed ? 1 : 0);
