import { supabase, isSupabaseEnabled } from "./supabaseClient";
import type { LandingContent } from "./contentService";

const TABLE_NAME = "landing_content";
const SINGLETON_ID = "landing-singleton";

export async function fetchLandingContentFromSupabase(): Promise<LandingContent | null> {
  if (!isSupabaseEnabled() || !supabase) return null;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("content")
    .eq("id", SINGLETON_ID)
    .maybeSingle();

  if (error || !data?.content) {
    return null;
  }

  return data.content as LandingContent;
}

export async function saveLandingContentToSupabase(content: LandingContent) {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: null, error: new Error("Service indisponible.") };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      data: null,
      error: new Error("Session expirée. Reconnectez-vous puis republiez."),
    };
  }

  // RPC security definer : évite l'échec RLS de l'upsert PostgREST direct.
  const { data, error } = await supabase.rpc("upsert_landing_content", {
    p_content: content,
  });

  if (error) {
    return {
      data: null,
      error: new Error(error.message || "Échec de la publication du contenu."),
    };
  }

  return { data, error: null };
}
