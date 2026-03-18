// ─── Supabase client (shared by all pages) ──────────────
const SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';

function getSupabase() {
    if (!window._sbClient) {
        if (!window.supabase) { console.error('Supabase library not loaded.'); return null; }
        window._sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return window._sbClient;
}

// Check auth — redirect to index.html if not logged in
async function requireAuth() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    const user = data && data.user;
    if (!user) { window.location.replace('index.html'); return null; }
    return user;
}

// Reads user.id instantly from localStorage — no network request.
// Only for cache keys, never for security checks.
function getLocalUserId() {
    try {
        const keys = Object.keys(localStorage);
        for (let i = 0; i < keys.length; i++) {
            if (keys[i].indexOf('auth-token') !== -1 || keys[i].indexOf('supabase') !== -1) {
                const val = JSON.parse(localStorage.getItem(keys[i]));
                if (val && val.user && val.user.id) return val.user.id;
                if (val && val.access_token) {
                    const parts = val.access_token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        if (payload.sub) return payload.sub;
                    }
                }
            }
        }
    } catch (e) {}
    return null;
}

// ─── XSS protection ─────────────────────────────────────
// Always use this when inserting user-supplied strings into innerHTML.
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}