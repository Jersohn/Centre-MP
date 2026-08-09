import { supabase, isSupabaseEnabled } from "./supabaseClient";

const BUCKET = "landing-media";
const AVATAR_BUCKET = "profile-avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX_BYTES = 2.5 * 1024 * 1024;

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/** Téléverse une image vers le bucket public `landing-media` (ou data URL en secours). */
export async function uploadLandingMedia(file: File, folder = "misc"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Veuillez sélectionner une image (JPG, PNG ou WEBP).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("L’image ne doit pas dépasser 5 Mo.");
  }

  if (!isSupabaseEnabled() || !supabase) {
    return dataUrlFromFile(file);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return dataUrlFromFile(file);
  }

  const ext = extensionFor(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || `image/${ext}`,
  });

  if (error) {
    // Secours local si Storage refuse (RLS / session)
    console.warn("[landing-media]", error.message);
    return dataUrlFromFile(file);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function dataUrlFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Téléverse l’avatar du compte connecté vers `profile-avatars/{userId}/…`. */
export async function uploadProfileAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Veuillez sélectionner une image (JPG, PNG ou WEBP).");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("La photo ne doit pas dépasser 2,5 Mo.");
  }
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error("Téléversement indisponible.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Session requise pour téléverser une photo.");
  }

  const ext = extensionFor(file);
  const path = `${user.id}/avatar.${ext}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || `image/${ext}`,
  });
  if (error) {
    throw new Error(error.message || "Échec du téléversement de la photo.");
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // cache-bust pour forcer le rafraîchissement navigateur
  return `${data.publicUrl}?v=${Date.now()}`;
}
