import { ChangeEvent, useEffect, useState } from "react";
import contentService, { loadContent, saveContent } from "../services/contentService";
import { isSupabaseEnabled } from "../services/supabaseClient";
import { fetchLandingContentFromSupabase } from "../services/supabaseService";

type GalleryItem = {
  title: string;
  description: string;
  image: string;
};

export default function AdminEditLanding() {
  const initial = contentService.getContent();
  const [heroTitle, setHeroTitle] = useState(initial.heroTitle);
  const [heroParagraph, setHeroParagraph] = useState(initial.heroParagraph);
  const [heroImage, setHeroImage] = useState(initial.heroImage);
  const [aboutText, setAboutText] = useState(initial.aboutText);
  const [aboutImage, setAboutImage] = useState(initial.aboutImage);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(initial.galleryItems);
  const [newsItems, setNewsItems] = useState(initial.newsItems);
  const [agendaItems, setAgendaItems] = useState(initial.agendaItems);
  const [testimonials, setTestimonials] = useState(initial.testimonials);
  const [contactPhone, setContactPhone] = useState(initial.contactPhone);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [contactAddress, setContactAddress] = useState(initial.contactAddress);
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    setRemoteSyncEnabled(isSupabaseEnabled());
  }, []);

  function dataUrlFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(field: "hero" | "about", e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await dataUrlFromFile(file);
    if (field === "hero") setHeroImage(url);
    else setAboutImage(url);
  }

  async function handleGalleryUpload(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await dataUrlFromFile(file);
    setGalleryItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, image: url } : item));
  }

  function updateGalleryField(index: number, field: keyof GalleryItem, value: string) {
    setGalleryItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function addGalleryItem() {
    setGalleryItems((current) => [
      ...current,
      { title: "Nouvel élément de galerie", description: "Description courte du moment.", image: "https://source.unsplash.com/1400x900/?african,community" },
    ]);
  }

  function removeGalleryItem(index: number) {
    setGalleryItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function save() {
    const payload = {
      heroTitle,
      heroParagraph,
      heroImage,
      aboutText,
      aboutImage,
      galleryItems,
      newsItems,
      agendaItems,
      testimonials,
      contactPhone,
      contactEmail,
      contactAddress,
    };

    if (remoteSyncEnabled) {
      setSyncStatus("Sauvegarde en cours vers Supabase...");
      await saveContent(payload);
      setSyncStatus("Contenu synchronisé avec Supabase.");
    } else {
      contentService.setContent(payload);
      setSyncStatus("Contenu sauvegardé localement.");
    }

    alert("Contenu enregistré.");
  }

  async function syncRemote() {
    if (!remoteSyncEnabled) return;

    setSyncStatus("Récupération du contenu Supabase...");
    const remoteContent = await fetchLandingContentFromSupabase();
    if (remoteContent) {
      const current = { ...remoteContent };
      contentService.setContent(current);
      setHeroTitle(current.heroTitle);
      setHeroParagraph(current.heroParagraph);
      setHeroImage(current.heroImage);
      setAboutText(current.aboutText);
      setAboutImage(current.aboutImage);
      setGalleryItems(current.galleryItems);
      setNewsItems(current.newsItems);
      setAgendaItems(current.agendaItems);
      setTestimonials(current.testimonials);
      setContactPhone(current.contactPhone);
      setContactEmail(current.contactEmail);
      setContactAddress(current.contactAddress);
      setSyncStatus("Contenu Supabase chargé avec succès.");
    } else {
      setSyncStatus("Aucun contenu Supabase trouvé ou erreur de connexion.");
    }
  }

  function reset() {
    contentService.resetContent();
    const current = contentService.getContent();
    setHeroTitle(current.heroTitle);
    setHeroParagraph(current.heroParagraph);
    setHeroImage(current.heroImage);
    setAboutText(current.aboutText);
    setAboutImage(current.aboutImage);
    setGalleryItems(current.galleryItems);
    setNewsItems(current.newsItems);
    setAgendaItems(current.agendaItems);
    setTestimonials(current.testimonials);
    setContactPhone(current.contactPhone);
    setContactEmail(current.contactEmail);
    setContactAddress(current.contactAddress);
    setSyncStatus("Contenu réinitialisé localement.");
    alert("Contenu réinitialisé.");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Édition complète de la landing</h2>
          <p className="mt-2 text-sm text-slate-600">Mettez à jour l’intégralité du contenu de la page d’accueil : bannière, sections, galerie, actualités, agenda, témoignages et contact.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">Réinitialiser</button>
          <button type="button" onClick={save} className="rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]">Enregistrer</button>
          {remoteSyncEnabled && (
            <button type="button" onClick={syncRemote} className="rounded-full border border-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-[var(--sgi-blue)] transition hover:bg-[var(--sgi-blue)]/10">Synchroniser Supabase</button>
          )}
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bannière principale</h3>
            <p className="mt-2 text-sm text-slate-600">Contrôlez le message d’accueil et l’image de couverture.</p>
          </div>
          {syncStatus && <p className="text-sm text-slate-500">{syncStatus}</p>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Titre principal</label>
              <input
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Paragraphe</label>
              <textarea
                value={heroParagraph}
                onChange={(e) => setHeroParagraph(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Image de la bannière</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload("hero", e)}
                className="mt-2 text-sm text-slate-700"
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Aperçu bannière</div>
            <img src={heroImage} alt="Aperçu image bannière" className="mt-4 h-64 w-full rounded-3xl object-cover" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Section À propos</h3>
        <p className="mt-2 text-sm text-slate-600">Actualisez le texte de présentation du centre et l’illustration associée.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Texte de présentation</label>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={6}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Image de la section</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload("about", e)}
                className="mt-2 text-sm text-slate-700"
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Aperçu À propos</div>
            <img src={aboutImage} alt="Aperçu image about" className="mt-4 h-64 w-full rounded-3xl object-cover" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Galerie</h3>
            <p className="mt-2 text-sm text-slate-600">Gérez les éléments visibles dans la galerie de la page d’accueil.</p>
          </div>
          <button
            type="button"
            onClick={addGalleryItem}
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter un visuel
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {galleryItems.map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Titre</label>
                    <input
                      value={item.title}
                      onChange={(e) => updateGalleryField(index, "title", e.target.value)}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateGalleryField(index, "description", e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleGalleryUpload(index, e)}
                      className="mt-2 text-sm text-slate-700"
                    />
                  </div>
                </div>

                <div className="w-full max-w-full rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">Preview</span>
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(index)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
                    >Supprimer</button>
                  </div>
                  <img src={item.image} alt={`Aperçu galerie ${item.title}`} className="mt-4 h-48 w-full rounded-3xl object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Actualités</h3>
            <p className="mt-2 text-sm text-slate-600">Gérez les cartes d’actualités de la page d’accueil.</p>
          </div>
          <button
            type="button"
            onClick={() => setNewsItems((current) => [...current, { title: "Nouvelle actualité", summary: "Résumé de la nouvelle.", date: "N/A", author: "Auteur", image: "https://source.unsplash.com/900x600/?african,community" }])}
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter une actualité
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {newsItems.map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Titre</label>
                    <input
                      value={item.title}
                      onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, title: e.target.value } : news))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Résumé</label>
                    <textarea
                      value={item.summary}
                      onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, summary: e.target.value } : news))}
                      rows={3}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Date</label>
                      <input
                        value={item.date}
                        onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, date: e.target.value } : news))}
                        className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Auteur</label>
                      <input
                        value={item.author}
                        onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, author: e.target.value } : news))}
                        className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-full rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">Preview</span>
                    <button
                      type="button"
                      onClick={() => setNewsItems((current) => current.filter((_, i) => i !== index))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
                    >Supprimer</button>
                  </div>
                  <img src={item.image} alt={`Aperçu actualité ${item.title}`} className="mt-4 h-44 w-full rounded-3xl object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Agenda</h3>
            <p className="mt-2 text-sm text-slate-600">Organisez les événements et rendez-vous du centre.</p>
          </div>
          <button
            type="button"
            onClick={() => setAgendaItems((current) => [...current, { title: "Nouvel événement", date: "Date", time: "Heure", location: "Lieu", responsible: "Responsable" }])}
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter un événement
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {agendaItems.map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Titre</label>
                    <input
                      value={item.title}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, title: e.target.value } : agenda))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Date</label>
                      <input
                        value={item.date}
                        onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, date: e.target.value } : agenda))}
                        className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Heure</label>
                      <input
                        value={item.time}
                        onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, time: e.target.value } : agenda))}
                        className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Lieu</label>
                    <input
                      value={item.location}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, location: e.target.value } : agenda))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Responsable</label>
                    <input
                      value={item.responsible}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, responsible: e.target.value } : agenda))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAgendaItems((current) => current.filter((_, i) => i !== index))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Témoignages</h3>
            <p className="mt-2 text-sm text-slate-600">Mettez à jour les avis présentés sur la page d’accueil.</p>
          </div>
          <button
            type="button"
            onClick={() => setTestimonials((current) => [...current, { name: "Nouveau témoignage", role: "Rôle", quote: "Citation inspirante.", image: "https://source.unsplash.com/400x400/?african,portrait" }])}
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter un témoignage
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {testimonials.map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nom</label>
                    <input
                      value={item.name}
                      onChange={(e) => setTestimonials((current) => current.map((testimonial, testimonialIndex) => testimonialIndex === index ? { ...testimonial, name: e.target.value } : testimonial))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Rôle</label>
                    <input
                      value={item.role}
                      onChange={(e) => setTestimonials((current) => current.map((testimonial, testimonialIndex) => testimonialIndex === index ? { ...testimonial, role: e.target.value } : testimonial))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Citation</label>
                    <textarea
                      value={item.quote}
                      onChange={(e) => setTestimonials((current) => current.map((testimonial, testimonialIndex) => testimonialIndex === index ? { ...testimonial, quote: e.target.value } : testimonial))}
                      rows={3}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none"
                    />
                  </div>
                </div>
                <div className="w-full max-w-full rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">Preview</span>
                    <button
                      type="button"
                      onClick={() => setTestimonials((current) => current.filter((_, i) => i !== index))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
                    >Supprimer</button>
                  </div>
                  <img src={item.image} alt={`Aperçu témoignage ${item.name}`} className="mt-4 h-48 w-full rounded-3xl object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Coordonnées</h3>
        <p className="mt-2 text-sm text-slate-600">Mettez à jour les informations de contact affichées dans le pied de page.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Téléphone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Adresse</label>
            <input
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
