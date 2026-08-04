import { ChangeEvent, useState } from "react";
import contentService from "../services/contentService";

export default function CentreEditLanding() {
  const initial = contentService.getContent();
  const [aboutText, setAboutText] = useState(initial.aboutText);
  const [aboutImage, setAboutImage] = useState(initial.aboutImage);

  function dataUrlFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleAboutUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await dataUrlFromFile(file);
    setAboutImage(url);
  }

  function save() {
    contentService.setContent({ aboutText, aboutImage });
    alert("Contenu enregistré.");
  }

  function reset() {
    contentService.resetContent();
    const current = contentService.getContent();
    setAboutText(current.aboutText);
    setAboutImage(current.aboutImage);
    alert("Contenu réinitialisé.");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Édition du contenu - Centre</h2>
          <p className="mt-2 text-sm text-slate-600">Mettez à jour la présentation du centre et l’image de la section À propos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">Réinitialiser</button>
          <button type="button" onClick={save} className="rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]">Enregistrer</button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Section À propos</h3>
        <p className="mt-2 text-sm text-slate-600">Actualisez le texte et l’image présentés sur la page centrale.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Texte de présentation</label>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={8}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Image de la section</label>
              <input type="file" accept="image/*" onChange={handleAboutUpload} className="mt-2 text-sm text-slate-700" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Aperçu</div>
            {aboutImage ? (
              <img src={aboutImage} alt="Aperçu image about" className="mt-4 h-64 w-full rounded-3xl object-cover" />
            ) : (
              <div className="mt-4 flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm text-slate-500">Aucune image sélectionnée</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
