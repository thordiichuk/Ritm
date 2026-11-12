import type { SupabaseClient } from '@supabase/supabase-js';
import type { Remote } from './engine';
import type { RemoteRecord } from './records';

/*
 * Сервер для двигуна синхронізації — таблиця `records` у Supabase.
 * Читання — звичайний запит до таблиці (правила доступу віддають лише свої рядки).
 * Запис — функція push_records у базі: вона лишає новішу версію кожного запису.
 */

const PAGE = 1000;
// Позначка часу ставиться на сервері в момент запису. Транзакції можуть завершуватися не в тому порядку,
// у якому почалися, тож беремо з невеликим запасом: повторно отриманий запис просто пропускається.
const OVERLAP_MS = 60_000;

interface Row extends RemoteRecord {
  modified_at: string;
}

export function supabaseRemote(client: SupabaseClient, userId: string): Remote {
  return {
    async pull(since) {
      const records: RemoteRecord[] = [];
      let cursor = since;
      const from = since ? new Date(new Date(since).getTime() - OVERLAP_MS).toISOString() : null;
      for (let offset = 0; ; offset += PAGE) {
        let q = client.from('records').select('key,data,deleted,updated_at,modified_at').order('modified_at').order('key');
        if (from) q = q.gte('modified_at', from);
        const { data, error } = await q.range(offset, offset + PAGE - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as Row[];
        for (const r of rows) {
          records.push({ key: r.key, data: r.data, deleted: r.deleted, updated_at: Number(r.updated_at) });
          if (!cursor || r.modified_at > cursor) cursor = r.modified_at;
        }
        if (rows.length < PAGE) break;
      }
      return { records, cursor };
    },

    async push(recs) {
      const { error } = await client.rpc('push_records', { rows: recs });
      if (error) throw new Error(error.message);
    },

    subscribe(onChange) {
      const channel = client
        .channel(`records:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${userId}` }, onChange)
        .subscribe();
      return () => void client.removeChannel(channel);
    },
  };
}
