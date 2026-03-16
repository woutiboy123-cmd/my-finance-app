// 1. CONFIGURATIE (Vul hier je eigen gegevens van Supabase in)
const SUPABASE_URL = 'https://jouw-project-id.supabase.co';
const SUPABASE_KEY = 'jouw-anon-public-key';

let supabaseClient;

// Wacht tot de hele pagina (HTML + Scripts) is geladen
document.addEventListener('DOMContentLoaded', () => {
    console.log("Pagina geladen, verbinding maken met Supabase...");

    // 2. CONTROLEER BIBLIOTHEEK
    if (window.supabase) {
        // Maak de verbinding aan
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase is succesvol verbonden!");
    } else {
        console.error("❌ FOUT: Supabase bibliotheek niet gevonden. Check de script-link in je HTML!");
        alert("Er is een technische fout bij het laden van de database.");
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
            const isRegister = authTitle.innerText === 'Registreren';

            // Basis check
            if (!email || !password) {
                alert("Vul aub een e-mailadres en wachtwoord in.");
                return;
            }

            if (password.length < 6) {
                alert("Wachtwoord moet minstens 6 tekens lang zijn.");
                return;
            }

            try {
                if (isRegister) {
                    // --- REGISTREREN ---
                    console.log("Poging tot registreren voor:", email);
                    const { data, error } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password
                    });

                    if (error) throw error;

                    // Als e-mailbevestiging UIT staat in Supabase, logt hij vaak direct in.
                    // Als het AAN staat, krijgt de gebruiker deze melding:
                    alert("Account aangemaakt! Je kunt nu proberen in te loggen (check evt. je mail).");
                    
                    // Zet de interface terug op inloggen
                    if (typeof toggleMode === "function") toggleMode(); 

                } else {
                    // --- INLOGGEN ---
                    console.log("Poging tot inloggen voor:", email);
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                    if (error) throw error;

                    if (data.user) {
                        console.log("Inloggen geslaagd!", data.user);
                        // Stuur de gebruiker naar het dashboard
                        window.location.href = 'dashboard.html';
                    }
                }
            } catch (err) {
                console.error("Auth Fout:", err.message);
                alert("Fout: " + err.message);
            }
        });
    } else {
        console.error("❌ FOUT: Knop 'auth-btn' niet gevonden in de HTML.");
    }
});