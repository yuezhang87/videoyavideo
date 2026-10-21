/** True when Supabase env vars are present; otherwise the app runs in guest mode. */
export const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
