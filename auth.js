// 1. Instellingen (Vul je eigen gegevens in)
const SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWJvcGlmYXVzdndsa3ZvbWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTIwNjEsImV4cCI6MjA4OTI2ODA2MX0.H_iEEC685nkinFHcBuHwRPgPEt9-3ejKUFrAAWd__ik';

// 2. Maak de client aan
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase is geladen en klaar voor actie!");

// 3. De knop functie
document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('auth-btn');

    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            console.log("Er is geklikt!");

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const title = document.getElementById('auth-title').innerText;

            try {
                if (title === 'Registreren') {
                    console.log("Poging tot registreren...");
                    const { data, error } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password
                    });
                    if (error) throw error;
                    alert("Account aangemaakt! Je kunt nu inloggen.");
                } else {
                    console.log("Poging tot inloggen...");
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    if (error) throw error;
                    console.log("Inloggen gelukt:", data);
                    window.location.href = 'dashboard.html';
                }
            } catch (err) {
                console.error("Foutmelding:", err.message);
                alert("Er ging iets mis: " + err.message);
            }
        });
    } else {
        console.error("FOUT: De knop 'auth-btn' is niet gevonden in de HTML!");
    }
});