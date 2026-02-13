import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://spifuhesobaxrywbxnga.supabase.co";
const supabaseKey = "sb_publishable_NhPS2lw8JitwqJOk-m1Erg_rPGGCC-O";

export const supabase = createClient(supabaseUrl, supabaseKey);
