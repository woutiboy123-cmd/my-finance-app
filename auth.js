var SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
var SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';

var supabaseClient;

document.addEventListener('DOMContentLoaded', function() {
    if (!window.supabase) { console.error('Supabase library not loaded.'); return; }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    var authBtn       = document.getElementById('auth-btn');
    var emailInput    = document.getElementById('email');
    var passwordInput = document.getElementById('password');
    var authTitle     = document.getElementById('auth-title');

    authBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        var email      = emailInput.value.trim();
        var password   = passwordInput.value.trim();
        var isRegister = authTitle.innerText === 'Create Account';

        if (!email || !password) { alert('Please fill in an email address and password.'); return; }

        try {
            if (isRegister) {
                var reg = await supabaseClient.auth.signUp({ email: email, password: password });
                if (reg.error) throw reg.error;
                window.location.href = 'dashboard.html';
            } else {
                var login = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
                if (login.error) throw login.error;
                if (login.data.user) window.location.href = 'dashboard.html';
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });
});