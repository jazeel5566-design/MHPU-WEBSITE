// ===========================================================
// MHPU Member Portal — Supabase client config
// ===========================================================
// ⚠️ Fill these in once you've created a Supabase project.
// Find both values in your Supabase dashboard: Project Settings → API.
// The anon/public key is safe to expose in browser code — it's designed
// for that, and all real access control happens via Row Level Security
// (see supabase/schema.sql) plus the Edge Functions, not this key.

const SUPABASE_URL = "https://cykghfwuelikoqueqyoa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5a2doZnd1ZWxpa29xdWVxeW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUzNjIsImV4cCI6MjEwMzc3MTM2Mn0._qL7WxG_lgjA3II1StGIMI-zOLnjkPQRrly3aoH273s";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Redirects to the login page if nobody is signed in.
 * Call this at the top of any member-only or admin-only page.
 */
async function requireLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

/**
 * Fetches the signed-in user's profile row (name, role, etc.).
 */
async function getMyProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    console.warn("Could not load profile:", error.message);
    return null;
  }
  return data;
}

/**
 * Redirects away unless the signed-in user has one of the given roles.
 * Use on admin-only pages, e.g. requireRole(['admin']).
 */
async function requireRole(allowedRoles) {
  const session = await requireLogin();
  if (!session) return null;
  const profile = await getMyProfile();
  if (!profile || !allowedRoles.includes(profile.role)) {
    window.location.href = "dashboard.html";
    return null;
  }
  return profile;
}
