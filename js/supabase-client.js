// Supabase Client for Frontend
// This file initializes the Supabase client for browser use

const SUPABASE_URL = 'https://eejegeplazcsxaukisvu.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon key from Supabase dashboard

// Initialize Supabase client (loaded via CDN in HTML)
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// Export for use in other scripts
window.getSupabase = getSupabase;
window.SUPABASE_URL = SUPABASE_URL;
