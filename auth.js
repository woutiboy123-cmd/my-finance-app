const SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';

let supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    if (!window.supabase) {
        console.error('Supabase library not loaded.');
        return;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const authBtn      = document.getElementById('auth-btn');
    const emailInput   = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authTitle    = document.getElementById('auth-title');

    authBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const email    = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const isRegister = authTitle.innerText === 'Create Account';

        if (!email || !password) {
            alert('Please fill in an email address and password.');
            return;
        }

        try {
            if (isRegister) {
                const { error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                window.location.href = 'dashboard.html';
            } else {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) window.location.href = 'dashboard.html';
            }
        } catch (err) {
            console.error('Auth error:', err.message);
            alert('Error: ' + err.message);
        }
    });
});
