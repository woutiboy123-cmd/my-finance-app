// 1. CONFIGURATION
const SUPABASE_URL = 'https://pxqbopifausvwlkvomgn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QEU1LxylnAea2td7Ond5Cg_XoBBrUWm';

let supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Page loaded, initializing authentication...");

    // 2. CHECK LIBRARY
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase is successfully initialized.");
    } else {
        console.error("❌ ERROR: Supabase library not loaded.");
        return;
    }

    // 3. GET ELEMENTS
    const authBtn = document.getElementById('auth-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authTitle = document.getElementById('auth-title');

    // 4. CLICK FUNCTION
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            // FIX: Match this text exactly to what your toggleMode() function sets!
            const isRegister = authTitle.innerText === 'Create Account';

            if (!email || !password) {
                alert("Please fill in an email address and password.");
                return;
            }

            try {
                if (isRegister) {
                    // --- REGISTER ---
                    console.log("Attempting to register:", email);
                    const { data, error } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password
                    });

                    if (error) throw error;
                    alert("Account created! You can now log in.");
                    
                    // Switch UI back to login mode automatically
                    if (typeof toggleMode === "function") toggleMode(); 

                } else {
                    // --- LOGIN ---
                    console.log("Attempting to log in for:", email);
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                    if (error) throw error;

                    if (data.user) {
                        console.log("Login successful!", data.user);
                        window.location.href = 'dashboard.html';
                    }
                }
            } catch (err) {
                console.error("Auth Error:", err.message);
                alert("Error: " + err.message);
            }
        });
    }
});