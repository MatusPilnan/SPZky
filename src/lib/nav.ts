// App navigation with a short, predictable back stack (docs/PLAN.md, "Fixes after
// v0.7.0", item 5):
//
//   Home (depth 0) ── always at the bottom
//   └ a bottom-bar screen or a country (depth 1); bottom-bar screens replace each other
//     └ detail screens (country, edit) sit on top of the screen they were opened from
//
// Every history entry stores its depth in SvelteKit's page state. Back (system or in-app)
// always goes one level towards Home; the Home tab goes straight back to it; a screen is
// never on the stack twice.

import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';

/** Bottom-bar screens other than Home: they replace each other at depth 1. */
const TABS = new Set(['/add', '/history', '/settings']);

/** The parts of a URL these helpers read (SvelteKit's page.url is a read-only URL type). */
type Loc = Pick<URL, 'origin' | 'pathname' | 'search'>;

/** Route path ("/", "/history", "/country", …) of an in-app URL, or null for other URLs. */
export function routeOf(url: Loc): string | null {
	const root = new URL(resolve('/'), location.href);
	if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname.replace(/\/$/, ''))) return null;
	const rest = url.pathname.slice(root.pathname.length).replace(/\/$/, '');
	return `/${rest}`;
}

function currentDepth(): number {
	return page.state.depth ?? 0;
}

const sameUrl = (a: Loc, b: Loc) => a.pathname.replace(/\/$/, '') === b.pathname.replace(/\/$/, '') && a.search === b.search;

/** history.go(-steps) and wait until SvelteKit has picked up the traversal. */
function goBack(steps: number): Promise<void> {
	if (steps <= 0) return Promise.resolve();
	return new Promise((done) => {
		addEventListener('popstate', () => setTimeout(done, 0), { once: true });
		history.go(-steps);
	});
}

/** Navigate to an in-app URL following the stack rules. */
export async function navigate(href: string | URL): Promise<void> {
	const target = new URL(href, location.href);
	const route = routeOf(target);
	if (route === null) {
		location.href = target.href;
		return;
	}
	const depth = currentDepth();
	if (sameUrl(target, page.url)) return;

	if (route === '/') {
		// Back to the bottom; if the app was opened on another screen, that entry becomes Home.
		await goBack(depth);
		if (routeOf(page.url) !== '/') await goto(target, { replaceState: true, state: { depth: 0 } });
		return;
	}

	if (TABS.has(route)) {
		if (depth === 0) {
			await goto(target, { state: { depth: 1 } });
		} else {
			await goBack(depth - 1);
			if (!sameUrl(target, page.url)) await goto(target, { replaceState: true, state: { depth: 1 } });
		}
		return;
	}

	// Detail screens go on top of the current one.
	await goto(target, { state: { depth: depth + 1 } });
}

/**
 * In-app "back" (back links, after saving on the edit page): one level down, or,
 * when the screen was opened directly (nothing below it), to `fallback`.
 */
export async function back(fallback: string): Promise<void> {
	if (currentDepth() > 0) await goBack(1);
	else await goto(fallback, { replaceState: true, state: { depth: 0 } });
}

/**
 * Document click listener (capture phase) that sends in-app link clicks through
 * `navigate`. Returns a cleanup function.
 */
export function interceptLinks(): () => void {
	const onClick = (event: MouseEvent) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		const a = (event.target as Element | null)?.closest?.('a[href]');
		// data-back: the link handles itself with back() (e.g. "← Back" on the edit page).
		if (!(a instanceof HTMLAnchorElement) || a.target || a.hasAttribute('download') || a.hasAttribute('data-back')) return;
		const url = new URL(a.href);
		if (routeOf(url) === null || url.hash) return;
		event.preventDefault(); // SvelteKit skips clicks that are already handled
		void navigate(url);
	};
	document.addEventListener('click', onClick, true);
	return () => document.removeEventListener('click', onClick, true);
}
