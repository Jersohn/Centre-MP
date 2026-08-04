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
    .single();

  if (error || !data?.content) {
    return null;
  }

  return data.content as LandingContent;
}

export async function saveLandingContentToSupabase(content: Partial<LandingContent>) {
  if (!isSupabaseEnabled() || !supabase) return null;

  const { data, error } = await supabase.from(TABLE_NAME).upsert(
    {
      id: SINGLETON_ID,
      content,
      updated_at: new Date().toISOString(),
    },
    { returning: "representation" }
  );

  return { data, error };
}
