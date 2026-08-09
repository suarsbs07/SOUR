// ============================================================================
// supabase-config.js — Credenciales de conexión a Supabase (base de datos y
// autenticación). Este archivo se carga antes que cualquier otro script en
// todas las páginas, para que "supabaseClient" esté disponible globalmente.
// La ANON_KEY es pública por diseño de Supabase: la seguridad real la dan
// las políticas RLS configuradas en la base de datos, no esta clave.
// ============================================================================
const SUPABASE_URL = "https://irecuitrptowxpeuiktj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZWN1aXRycHRvd3hwZXVpa3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDE2MzcsImV4cCI6MjA5ODIxNzYzN30.koeHspeGbcLFMSva6CUR1uNpczh0UE3odSu3EbUqIg4";

// Cliente global de Supabase: lo usan app.js, auth.js, landing.js y recuperar.js
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
