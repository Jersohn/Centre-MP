import { Download, Share, SquarePlus, X } from "lucide-react";

type IosInstallGuideProps = {
  open: boolean;
  onClose: () => void;
};

export function IosInstallGuide({ open, onClose }: IosInstallGuideProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-white p-5 shadow-[var(--shadow-lift)] sm:rounded-3xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-install-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sgi-blue)] text-white">
              <Download size={20} />
            </div>
            <div>
              <h2 id="ios-install-title" className="font-display text-lg font-semibold text-[var(--sgi-ink)]">
                Installer sur iPhone
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Safari ne propose pas de bouton d’installation automatique. Ajoutez l’app ainsi :
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <ol className="mt-5 space-y-3">
          <li className="flex gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sgi-blue)] text-sm font-bold text-white">
              1
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--sgi-ink)]">
                Appuyez sur <Share size={16} className="text-[var(--sgi-blue)]" aria-hidden /> Partager
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                L’icône se trouve en bas de Safari (ou en haut sur iPad).
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sgi-gold)] text-sm font-bold text-[var(--sgi-ink)]">
              2
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--sgi-ink)]">
                Choisissez <SquarePlus size={16} className="text-[var(--sgi-gold)]" aria-hidden /> Sur l’écran
                d’accueil
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Faites défiler le menu Partager si besoin.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sgi-red)] text-sm font-bold text-white">
              3
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--sgi-ink)]">Confirmez avec Ajouter</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                L’icône Centre MP apparaîtra sur votre écran d’accueil.
              </p>
            </div>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-[var(--sgi-blue)] px-4 py-3 text-sm font-bold text-white"
        >
          J’ai compris
        </button>
      </div>
    </div>
  );
}
