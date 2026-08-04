import { motion } from "motion/react";
import { Compass, HeartHandshake, Sparkles, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

const values = [
  { title: "Paix", description: "Cultiver l’harmonie à travers des relations respectueuses.", icon: HeartHandshake },
  { title: "Sagesse", description: "Favoriser l’éducation et la compréhension profonde.", icon: BookOpen },
  { title: "Unité", description: "Créer des liens solides entre les personnes et les communautés.", icon: Compass },
  { title: "Modernité", description: "Allier tradition, innovation et service de la société.", icon: Sparkles },
];

export function AboutSection() {
  const [content, setContent] = useState(contentService.getContent());

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="centre" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-[1.5rem] aspect-[4/3] sm:aspect-[16/9] lg:aspect-[4/3]">
          <img src={content.aboutImage} alt="Présentation du centre" className="h-full w-full object-cover" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0f3d6e]">Notre Centre</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">Une institution dédiée à l’épanouissement humain et à la paix.</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 break-words">{content.aboutText}</p>
        </motion.div>
      </div>
    </section>
  );
}
