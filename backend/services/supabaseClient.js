const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabaseClient() {
    if (supabase) return supabase;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.warn('⚠️  Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY');
        return null;
    }

    supabase = createClient(url, key, {
        auth: {
            persistSession: false
        }
    });

    return supabase;
}

function isSupabaseConfigured() {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

module.exports = { getSupabaseClient, isSupabaseConfigured };


