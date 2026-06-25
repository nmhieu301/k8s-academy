import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fhoitbzobymlmttvhiiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZob2l0YnpvYnltbG10dHZoaWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjA2NTcsImV4cCI6MjA5NTU5NjY1N30.ghP6Q-irTWWztTUnHMsGsjVlj4mBMThtZ-9iXDqT2vA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
