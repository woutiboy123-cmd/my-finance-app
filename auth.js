// 1. CONFIGURATIE (Vul hier je eigen gegevens van Supabase in)
const SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';

let supabaseClient;

// Wacht tot de hele pagina (HTML + Scripts) is geladen
document.addEventListener('DOMContentLoaded', () => {
    console.log("Page loaded, initializing authentication...");

    // 2. CONTROLEER BIBLIOTHEEK
    if (window.supabase) {
        // Maak de verbinding aan
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase is succesfully initialized.");
    } else {
        console.error("❌ FOUT: Supabase library is niet geladen. Zorg ervoor dat de script-tag correct is en dat er geen netwerkfouten zijn.");
        return;
    }

    // 3. ELEMENTEN OPHALEN
    const authBtn = document.getElementById('auth-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authTitle = document.getElementById('auth-title');

    // 4. DE KLIK-FUNCTIE
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Voorkom dat de pagina ververst

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const isRegister = authTitle.innerText === 'Register';

            // Basis check
            if (!email || !password) {
                alert("Please fill in an email address and password.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            try {
                if (isRegister) {
                    // --- REGISTREREN ---
                    console.log("Attempting to register:", email);
                    const { data, error } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password
                    });

                    if (error) throw error;

                    // Als e-mailbevestiging UIT staat in Supabase, logt hij vaak direct in.
                    // Als het AAN staat, krijgt de gebruiker deze melding:
                    alert("Account created! Please check your email to confirm your account before logging in.");
                    
                    // Zet de interface terug op inloggen
                    if (typeof toggleMode === "function") toggleMode(); 

                } else {
                    // --- INLOGGEN ---
                    console.log("Attempting to log in for:", email);
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                    if (error) throw error;

                    if (data.user) {
                        console.log("Logging in successful!", data.user);
                        // Stuur de gebruiker naar het dashboard
                        window.location.href = 'dashboard.html';
                    }
                }
            } catch (err) {
                console.error("Auth Error:", err.message);
                alert("Error: " + err.message);
            }
        });
    } else {
        console.error("❌ Error: Auth button not found. Check if the element with id 'auth-btn' exists in your HTML.");
    }
});