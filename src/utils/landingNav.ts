/** Navigation vers les ancres de la landing (fonctionne aussi depuis les pages détail). */

export function scrollToLandingHash(hash: string, behavior: ScrollBehavior = "smooth") {
  const id = hash.replace(/^#/, "");
  if (!id) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  const headerOffset = 72;
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior });
  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }
  return true;
}

/** Tente le scroll immédiatement, puis après un court délai (contenu pas encore monté). */
export function scrollToLandingHashWhenReady(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;

  if (scrollToLandingHash(`#${id}`, "auto")) return;

  window.setTimeout(() => {
    scrollToLandingHash(`#${id}`, "smooth");
  }, 80);
  window.setTimeout(() => {
    scrollToLandingHash(`#${id}`, "smooth");
  }, 320);
}

export function landingHashPath(hash: string) {
  const id = hash.replace(/^#/, "");
  return id ? `/#${id}` : "/";
}
