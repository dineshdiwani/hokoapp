import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://xndebmngmwspqicrwgnn.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjcyOTE3YzdjLTJiOWUtNDMxOS05YTRmLTI2MDRkMzhjYzFlZSJ9.eyJwcm9qZWN0SWQiOiJ4bmRlYm1uZ213c3BxaWNyd2dubiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY5NzQ4MDQ5LCJleHAiOjIwODUxMDgwNDksImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.Ax7P53XoKsO1NU688G9fqw40DEMputKqAT2Y8LYy7Bg';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };