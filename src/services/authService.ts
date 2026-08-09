import { supabase, isSupabaseEnabled } from "./supabaseClient";

export function hasSupabaseAuth() {
  return isSupabaseEnabled();
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error("Service indisponible.") };
  }

  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  if (!supabase) return { error: null };
  return await supabase.auth.signOut();
}
