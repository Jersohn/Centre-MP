import { motion } from "motion/react";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

export function AgendaSection() {
  const [agendaItems, setAgendaItems] = useState(contentService.getContent().agendaItems);

  useEffect(() => {
    const handler = () => setAgendaItems(contentService.getContent().agendaItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="agenda" className="bg-slate-50 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0f3d6e]">Agenda</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Des rendez-vous à ne pas manquer.</h2>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {agendaItems.map((item, index) => (
            <motion.div key={`${item.title}-${index}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d9a11a]">{item.date}</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{item.title}</h3>
                </div>
                <div className="rounded-full bg-slate-100 p-3 text-[#0f3d6e]">
                  <CalendarDays size={18} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><Clock size={16} />{item.time}</span>
                <span className="inline-flex items-center gap-2"><MapPin size={16} />{item.location}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">Responsable : {item.responsible}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
