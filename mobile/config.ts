import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Backend API URL - production deployment
export const API_URL = 'https://mindbase-api.onrender.com';

// Supabase configuration
export const SUPABASE_URL = 'https://xkrfvbhkcwaicgxqcfyk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmZ2YmhrY3dhaWNneHFjZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTgwMDIsImV4cCI6MjA4MDY3NDAwMn0.GnTq-9ek1R3Zh5HPhRzTWe7aNbmxMwA0gDn8xSZ_pL4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
