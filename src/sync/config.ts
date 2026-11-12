/*
 * Адреса проєкту Supabase і публічний ключ.
 * Їх безпечно тримати в коді: ключ лише називає проєкт, а дані захищають правила доступу до рядків
 * у базі (див. supabase/schema.sql) — кожен бачить тільки свої записи і лише після входу.
 * Порожні значення — синхронізацію вимкнено, застосунок працює лише з даними в браузері.
 * Для тестів адресу можна підмінити змінними VITE_SUPABASE_URL / VITE_SUPABASE_KEY під час збірки.
 */
const env = import.meta.env;

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? 'https://kzsmytotsdpazhylyjrs.supabase.co';
export const SUPABASE_KEY: string = env.VITE_SUPABASE_KEY ?? 'sb_publishable_C186Qku7P-7vBT9Avfk7iA_YTVDneVS';

export const syncConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
