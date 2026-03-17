// ─── Supabase client (gedeeld door alle pagina's) ────────
var SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
var SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';

function getSupabase() {
    if (!window._sbClient) {
        if (!window.supabase) { console.error('Supabase library not loaded.'); return null; }
        window._sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return window._sbClient;
}

// Controleer auth – redirect naar index.html als niet ingelogd
async function requireAuth() {
    var sb = getSupabase();
    if (!sb) return null;
    var result = await sb.auth.getUser();
    var user   = result.data && result.data.user;
    if (!user) { window.location.replace('index.html'); return null; }
    return user;
}