const SUPABASE_URL = "https://zwjkyedbzuisaszduovm.supabase.co";
const SUPABASE_KEY = "sb_publishable_J0QyB04giOTAYJ6L5Bk2Dw_DB6GOp1j";

// Initialize Supabase client globally
var supabase;
try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error("Supabase library not loaded. Ensure CDN is accessible.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // Explicitly attach to window.supabase so subsequent script tags resolve it correctly
    window.supabase = supabase;
} catch (err) {
    console.error("Supabase Init Error:", err);
}
