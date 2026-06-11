const SUPABASE_URL = "https://zwjkyedbzuisaszduovm.supabase.co";
const SUPABASE_KEY = "sb_publishable_J0QyB04giOTAYJ6L5Bk2Dw_DB6GOp1j";

// Custom storage handler to support "Remember Me" toggle
const customStorage = {
    getItem: (key) => {
        const remember = localStorage.getItem('remember_me') === 'true';
        return remember ? localStorage.getItem(key) : sessionStorage.getItem(key);
    },
    setItem: (key, value) => {
        const remember = localStorage.getItem('remember_me') === 'true';
        if (remember) {
            localStorage.setItem(key, value);
        } else {
            sessionStorage.setItem(key, value);
        }
    },
    removeItem: (key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
};

// Initialize Supabase client globally
var supabase;
try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error("Supabase library not loaded. Ensure CDN is accessible.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            storage: customStorage
        }
    });
    // Explicitly attach to window.supabase so subsequent script tags resolve it correctly
    window.supabase = supabase;
} catch (err) {
    console.error("Supabase Init Error:", err);
}
