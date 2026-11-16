// Account and sync state for the UI: email-code sign-in (Supabase Auth), the
// sign-in check, sync triggers and sign-out. The sync logic itself lives in
// engine.ts. Without a configured backend (local dev, forks) nothing here runs.

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { liveQuery, type Subscription } from 'dexie';
import { db } from '../db/db';
import {
	checkSignIn,
	resolveSignIn,
	signOutLocal,
	syncedAccount,
	syncOnce,
	unsyncedCount,
	type SignInChoice
} from './engine';
import { supabaseRemote, type Remote } from './remote';
import type { Comparison, RemoteRow } from './rows';

export const syncConfigured = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__);

/**
 * signedOut → (code verified) → checking → ready, or → conflict (user chooses) → ready.
 * `checking` also covers an interrupted check (e.g. offline right after sign-in); it is retried.
 */
export type AccountPhase = 'signedOut' | 'checking' | 'conflict' | 'ready';
/** offline: no network; unavailable: server unreachable (e.g. paused project); error: anything else. */
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'unavailable' | 'error';

const LAST_SYNC_KEY = 'spz-ky.lastSync';
/** Delay after a local change before syncing, so a burst of quick taps goes in one round. */
const CHANGE_DEBOUNCE_MS = 3000;

export const account = $state({
	phase: 'signedOut' as AccountPhase,
	email: null as string | null,
	userId: null as string | null,
	status: 'idle' as SyncStatus,
	/** Detail for status 'error' (not translated; shown small). */
	error: null as string | null,
	lastSync: readLastSync(),
	/** Local changes not on the server yet. */
	unsynced: 0,
	conflict: null as Comparison | null
});

let client: SupabaseClient | null = null;
let remote: Remote | null = null;
let pendingRemoteRows: RemoteRow[] = [];
let started = false;
/** True while we sign out ourselves, so the auth listener doesn't treat it as a forced sign-out. */
let signingOut = false;
let running: Promise<void> | null = null;
let again = false;
let debounce: ReturnType<typeof setTimeout> | undefined;
let unsyncedSub: Subscription | null = null;

function readLastSync(): number | null {
	try {
		const v = Number(localStorage.getItem(LAST_SYNC_KEY));
		return Number.isFinite(v) && v > 0 ? v : null;
	} catch {
		return null;
	}
}

function setLastSync(at: number) {
	account.lastSync = at;
	try {
		localStorage.setItem(LAST_SYNC_KEY, String(at));
	} catch {
		// ignore
	}
}

function classify(e: unknown): { status: SyncStatus; error: string | null } {
	if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'offline', error: null };
	const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
	// fetch() failures (Chrome, Firefox, Safari wording) and gateway errors: server unreachable or paused.
	if (/failed to fetch|networkerror|load failed|fetch failed|status(?: code)? 5\d\d|\b50[234]\b|\b540\b/i.test(message)) {
		return { status: 'unavailable', error: null };
	}
	return { status: 'error', error: message };
}

/** Call once on app start (client only). */
export async function initSync(): Promise<void> {
	if (!syncConfigured || started) return;
	started = true;
	// Loaded on demand: builds without a backend never download supabase-js.
	const { createClient } = await import('@supabase/supabase-js');
	client = createClient(__SUPABASE_URL__, __SUPABASE_KEY__, {
		auth: { storageKey: 'spz-ky.auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
	});
	remote = supabaseRemote(client);

	client.auth.onAuthStateChange((event, session) => {
		if (event === 'SIGNED_OUT' && !signingOut && account.userId) {
			// Session ended elsewhere (revoked, account deleted): keep the data as local-only.
			setTimeout(() => void forcedSignOut(), 0);
		} else if (event === 'SIGNED_IN' && session?.user && account.userId !== session.user.id) {
			setTimeout(() => void onSignedIn(session.user), 0);
		}
	});

	addEventListener('online', () => void resume());
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') void resume();
	});

	const { data } = await client.auth.getSession();
	if (data.session?.user) await onSignedIn(data.session.user);
}

/** Continue whatever is due: an interrupted sign-in check, or a normal sync. */
async function resume() {
	if (account.phase === 'checking' && account.userId && account.email) {
		await runSignInCheck(account.userId);
	} else if (account.phase === 'ready') {
		await syncNow();
	}
}

async function onSignedIn(user: User) {
	// Both verifyCode and the auth listener report a sign-in; handle it once.
	if (account.userId === user.id) return;
	account.userId = user.id;
	account.email = user.email ?? null;
	account.phase = 'checking';
	if ((await syncedAccount(db)) === user.id) {
		becomeReady();
	} else {
		await runSignInCheck(user.id);
	}
}

async function runSignInCheck(userId: string) {
	if (!remote) return;
	account.phase = 'checking';
	account.status = 'syncing';
	try {
		const check = await checkSignIn(db, remote, userId);
		if (check.comparison.conflict) {
			pendingRemoteRows = check.remoteRows;
			account.conflict = check.comparison;
			account.phase = 'conflict';
			account.status = 'idle';
		} else {
			await resolveSignIn(db, remote, userId, 'merge', check.remoteRows);
			setLastSync(Date.now());
			becomeReady();
		}
	} catch (e) {
		Object.assign(account, classify(e));
	}
}

/** The user's answer in the sign-in conflict dialog. */
export async function resolveConflict(choice: SignInChoice): Promise<void> {
	if (!remote || !account.userId || account.phase !== 'conflict') return;
	account.status = 'syncing';
	try {
		await resolveSignIn(db, remote, account.userId, choice, pendingRemoteRows);
		pendingRemoteRows = [];
		account.conflict = null;
		setLastSync(Date.now());
		becomeReady();
	} catch (e) {
		Object.assign(account, classify(e));
		throw e;
	}
}

/** "Cancel" in the conflict dialog: sign out again, nothing changes on either side. */
export async function cancelConflict(): Promise<void> {
	pendingRemoteRows = [];
	account.conflict = null;
	await endSession();
}

function becomeReady() {
	account.phase = 'ready';
	account.status = 'idle';
	account.error = null;
	watchLocalChanges();
	void syncNow();
}

function watchLocalChanges() {
	unsyncedSub?.unsubscribe();
	const userId = account.userId;
	if (!userId) return;
	unsyncedSub = liveQuery(() => unsyncedCount(db, userId)).subscribe({
		next: (count) => {
			const grew = count > account.unsynced;
			account.unsynced = count;
			if (grew && account.phase === 'ready') {
				clearTimeout(debounce);
				debounce = setTimeout(() => void syncNow(), CHANGE_DEBOUNCE_MS);
			}
		},
		error: () => {}
	});
}

/** One sync round now (or right after the running one). */
export async function syncNow(): Promise<void> {
	if (!remote || !account.userId || account.phase !== 'ready') return;
	if (running) {
		again = true;
		return running;
	}
	const userId = account.userId;
	const r = remote;
	running = (async () => {
		do {
			again = false;
			account.status = 'syncing';
			try {
				await syncOnce(db, r, userId);
				setLastSync(Date.now());
				account.status = 'idle';
				account.error = null;
			} catch (e) {
				Object.assign(account, classify(e));
				again = false;
			}
		} while (again);
	})();
	try {
		await running;
	} finally {
		running = null;
	}
}

/** Step 1 of signing in: email the 6-digit code. */
export async function sendCode(email: string): Promise<void> {
	if (!client) throw new Error('Sync is not configured');
	const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
	if (error) throw error;
}

/** Step 2 of signing in: check the code; the sign-in check follows. */
export async function verifyCode(email: string, code: string): Promise<void> {
	if (!client) throw new Error('Sync is not configured');
	const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
	if (error) throw error;
	if (data.user) await onSignedIn(data.user);
}

/**
 * Sign out. Refused while local changes are not synced (the caller offers
 * "Sync now"). `keep`: the plates stay on this device as local-only data.
 */
export async function signOut(keep: boolean): Promise<void> {
	if (account.userId && (await unsyncedCount(db, account.userId)) > 0) throw new Error('unsynced');
	await signOutLocal(db, keep);
	await endSession();
}

/** Deletes all of the account's sightings on the server, then signs out keeping the local data. */
export async function deleteCloudData(): Promise<void> {
	if (!remote || !account.userId) return;
	await remote.deleteAll(account.userId);
	await signOutLocal(db, true);
	await endSession();
}

async function forcedSignOut() {
	await signOutLocal(db, true);
	reset();
}

async function endSession() {
	signingOut = true;
	try {
		// Local scope: ends this device's session only; works offline too.
		await client?.auth.signOut({ scope: 'local' });
	} catch {
		// the local session is cleared anyway
	} finally {
		signingOut = false;
		reset();
	}
}

function reset() {
	unsyncedSub?.unsubscribe();
	unsyncedSub = null;
	clearTimeout(debounce);
	Object.assign(account, {
		phase: 'signedOut',
		email: null,
		userId: null,
		status: 'idle',
		error: null,
		unsynced: 0,
		conflict: null
	});
	try {
		localStorage.removeItem(LAST_SYNC_KEY);
	} catch {
		// ignore
	}
	account.lastSync = null;
}
