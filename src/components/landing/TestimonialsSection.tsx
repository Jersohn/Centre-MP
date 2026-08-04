import { motion } from "motion/react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState(contentService.getContent().testimonials);

  useEffect(() => {
    const handler = () => setTestimonials(contentService.getContent().testimonials);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="temoignages" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0f3d6e]">Témoignages</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Ce que les membres et les visiteurs disent du centre.</h2>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {testimonials.map((item, index) => (
          <motion.div key={`${item.name}-${index}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm leading-8 text-slate-600">“{item.quote}”</p>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">{item.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
