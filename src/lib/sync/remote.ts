import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteRow } from './rows';

/** What the sync engine needs from the server (Supabase in the app, a fake in tests). */
export interface Remote {
	/** Upserts with last-write-wins; returns the server version of rows it did not take. */
	push(rows: RemoteRow[]): Promise<RemoteRow[]>;
	/** Rows with server_updated_at >= since (all when null), oldest first, at most `limit`. */
	pull(since: string | null, limit: number): Promise<RemoteRow[]>;
	/** Makes `rows` the whole collection: upserts them, soft-deletes all other rows. */
	replace(rows: RemoteRow[]): Promise<void>;
	/** Hard-deletes all of the user's rows. */
	deleteAll(userId: string): Promise<void>;
}

const COLUMNS =
	'id, collection_id, region_code, plate_type, plate, plate_normalized, seen_at, created_at, updated_at, lat, lng, accuracy, place, note, deleted, server_updated_at';

export function supabaseRemote(client: SupabaseClient): Remote {
	return {
		async push(rows) {
			const { data, error } = await client.rpc('push_sightings', { rows });
			if (error) throw error;
			return (data ?? []) as RemoteRow[];
		},
		async pull(since, limit) {
			let query = client.from('sightings').select(COLUMNS);
			if (since) query = query.gte('server_updated_at', since);
			const { data, error } = await query
				.order('server_updated_at', { ascending: true })
				.order('id', { ascending: true })
				.limit(limit);
			if (error) throw error;
			return (data ?? []) as RemoteRow[];
		},
		async replace(rows) {
			const { error } = await client.rpc('replace_sightings', { rows });
			if (error) throw error;
		},
		async deleteAll(userId) {
			const { error } = await client.from('sightings').delete().eq('user_id', userId);
			if (error) throw error;
		}
	};
}
