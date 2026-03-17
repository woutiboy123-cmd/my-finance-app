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

// Leest user.id instant uit localStorage — geen netwerkverzoek
// Alleen gebruiken voor cache-sleutels, niet voor security checks
function getLocalUserId() {
    try {
        var sb = getSupabase();
        if (!sb) return null;
        // Supabase slaat sessie op in localStorage
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].indexOf('auth-token') !== -1 || keys[i].indexOf('supabase') !== -1) {
                var val = JSON.parse(localStorage.getItem(keys[i]));
                if (val && val.user && val.user.id) return val.user.id;
                if (val && val.access_token) {
                    // Decode JWT payload to get user id
                    var parts = val.access_token.split('.');
                    if (parts.length === 3) {
                        var payload = JSON.parse(atob(parts[1]));
                        if (payload.sub) return payload.sub;
                    }
                }
            }
        }
    } catch(e) {}
    return null;
}