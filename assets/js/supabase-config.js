// ============================================================================
// supabase-config.js — Credenciales de conexión a Supabase (base de datos y
// autenticación). Este archivo se carga antes que cualquier otro script en
// todas las páginas, para que "supabaseClient" esté disponible globalmente.
// La ANON_KEY es pública por diseño de Supabase: la seguridad real la dan
// las políticas RLS configuradas en la base de datos, no esta clave.
// ============================================================================
const SUPABASE_URL = "https://xqimiturfzadodonmghe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DpyLhc59Ee3Fbt2YhKwdZQ_P6Tw55BN";
// Cliente global de Supabase: lo usan app.js, auth.js, landing.js y recuperar.js
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
