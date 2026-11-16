// In-memory stand-in for the Supabase backend, mirroring the SQL in
// supabase/migrations (last-write-wins push, replace, server cursor, owner
// checks). Used by the unit tests only.

import type { Remote } from './remote';
import type { RemoteRow } from './rows';

export class FakeServer {
	rows = new Map<string, RemoteRow & { user_id: string; server_updated_at: string }>();
	private clock = Date.parse('2026-01-01T00:00:00Z');
	/** Called at the start of every push (tests use it to edit data mid-request). */
	onPush: (() => Promise<void>) | null = null;

	private tick(): string {
		this.clock += 1;
		// Microsecond precision like Postgres, to exercise the timestamp parsing.
		return new Date(this.clock).toISOString().replace('Z', '123+00:00');
	}

	private write(row: RemoteRow, userId: string) {
		const existing = this.rows.get(row.id);
		if (existing && existing.user_id !== userId) throw new Error('42501: row belongs to another user');
		this.rows.set(row.id, { ...row, user_id: userId, server_updated_at: this.tick() });
	}

	of(userId: string): RemoteRow[] {
		return [...this.rows.values()].filter((r) => r.user_id === userId);
	}

	remote(userId: string): Remote {
		return {
			push: async (rows) => {
				await this.onPush?.();
				const rejected: RemoteRow[] = [];
				for (const row of rows) {
					const existing = this.rows.get(row.id);
					if (existing && existing.user_id !== userId) throw new Error('42501: row belongs to another user');
					if (!existing || Date.parse(existing.updated_at) < Date.parse(row.updated_at)) this.write(row, userId);
					else if (Date.parse(existing.updated_at) > Date.parse(row.updated_at)) rejected.push({ ...existing });
				}
				return rejected;
			},
			pull: async (since, limit) =>
				this.of(userId)
					.filter((r) => since === null || Date.parse(r.server_updated_at!) >= Date.parse(since))
					.sort((a, b) => Date.parse(a.server_updated_at!) - Date.parse(b.server_updated_at!) || a.id.localeCompare(b.id))
					.slice(0, limit)
					.map((r) => ({ ...r })),
			replace: async (rows) => {
				const ids = new Set(rows.map((r) => r.id));
				for (const row of rows) this.write(row, userId);
				for (const r of this.of(userId)) {
					if (!ids.has(r.id) && !r.deleted) this.write({ ...r, deleted: true, updated_at: new Date().toISOString() }, userId);
				}
			},
			deleteAll: async (uid) => {
				for (const r of this.of(uid)) this.rows.delete(r.id);
			}
		};
	}
}
