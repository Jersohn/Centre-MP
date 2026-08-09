import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { IosInstallGuide } from "./IosInstallGuide";
import {
  canShowIosInstallHint,
  isAppInstalled,
  type BeforeInstallPromptEvent,
} from "../../utils/pwaInstall";

const DISMISS_KEY = "cmf_pwa_banner_dismissed";

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (isAppInstalled()) return;

    if (canShowIosInstallHint()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || (!promptEvent && !iosHint)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (iosHint) {
      setShowIosGuide(true);
      return;
    }
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setVisible(false);
  };

  return (
    <>
      <div className="fixed bottom-[4.75rem] left-3 right-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-lift)] lg:bottom-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sgi-blue)] text-white">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold text-[var(--sgi-ink)]">Installer l’application</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {iosHint
                ? "Sur iPhone : Partager → Sur l’écran d’accueil."
                : "Accédez rapidement au Centre Miroir Parfait depuis votre écran d’accueil."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={install}
                className="rounded-full bg-[var(--sgi-gold)] px-4 py-2 text-xs font-bold text-[var(--sgi-ink)]"
              >
                {iosHint ? "Voir comment" : "Installer"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="Fermer" className="text-muted-foreground">
            <X size={16} />
          </button>
        </div>
      </div>
      <IosInstallGuide open={showIosGuide} onClose={() => setShowIosGuide(false)} />
    </>
  );
}
