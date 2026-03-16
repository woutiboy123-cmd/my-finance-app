// 1. VERBINDING MAKEN
const SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ELEMENTEN OPHALEN
const authBtn = document.getElementById('auth-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const title = document.getElementById('auth-title');

// 3. DE FUNCTIE DIE ALLES REGELT
authBtn.onclick = async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        alert("Vul aub beide velden in.");
        return;
    }

    if (title.innerText === 'Registreren') {
        // ACCOUNT MAKEN
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        if (error) {
            alert("Fout bij registreren: " + error.message);
        } else {
            alert("Account aangemaakt! Check je mailbox voor de bevestigingsmail.");
        }
    } else {
        // INLOGGEN
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) {
            alert("Fout bij inloggen: " + error.message);
        } else if (data.user) {
            // Gelukt! Stuur door naar het dashboard
            window.location.href = 'dashboard.html';
        }
    }
};