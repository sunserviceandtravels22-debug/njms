
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dpbvmenbvvlrtmlnjrtt.supabase.co';
const supabaseAnonKey = 'sb_publishable_EM9RttSwZf2SqpbrNg6P8g_2X9tmdxA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
