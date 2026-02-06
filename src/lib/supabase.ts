

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ilzlduzijertrwghcdli.supabase.co';
const supabaseKey = 'PASTE_ANON_PUBLIC_KEY_HEREeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsemxkdXppamVydHJ3Z2hjZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Mzc2NTcsImV4cCI6MjA4NTQxMzY1N30.y30Imn1z5kT3FPDZG2b2YLETwJtmizc52SVmIoqMeKs';

export const supabase = createClient(supabaseUrl, supabaseKey);
