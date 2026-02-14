import { createClient } from "@supabase/supabase-js";

// Configurações do Supabase
export const SUPABASE_URL = "https://eiqohrnjpytwrhsokpqc.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpcW9ocm5qcHl0d3Joc29rcHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTgxOTcsImV4cCI6MjA2Mzg5NDE5N30.FQ9V5R0alTJJ_NCeyQCMJEeno2b7eUl8db71e6Sh15o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Habilita detecção automática de sessão na URL (para recovery links)
    // Não forçar PKCE para recovery - deixar o Supabase escolher o flow apropriado
  },
});
