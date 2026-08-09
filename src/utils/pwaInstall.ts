/** Détection PWA / iOS — Safari n’émet pas `beforeinstallprompt`. */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isIosDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSUa = /iphone|ipad|ipod/i.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSUa || iPadOs;
}

export function isAppInstalled() {
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return displayStandalone || iosStandalone;
}

export function canShowIosInstallHint() {
  return isIosDevice() && !isAppInstalled();
}
