// Uses getSupabase() from supabase-client.js (loaded before this script in login.html)

document.addEventListener('DOMContentLoaded', function () {
    const authBtn       = document.getElementById('auth-btn');
    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authTitle     = document.getElementById('auth-title');

    authBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        const email      = emailInput.value.trim();
        const password   = passwordInput.value.trim();
        const isRegister = authTitle.innerText === 'Create Account';

        if (!email || !password) { alert('Please fill in an email address and password.'); return; }

        const sb = getSupabase();
        if (!sb) { alert('Could not connect to the server. Please refresh.'); return; }

        try {
            if (isRegister) {
                const { error } = await sb.auth.signUp({ email, password });
                if (error) throw error;
                window.location.href = 'dashboard.html';
            } else {
                const { data, error } = await sb.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) window.location.href = 'dashboard.html';
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });
});