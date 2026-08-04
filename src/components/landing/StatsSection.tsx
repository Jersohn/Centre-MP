import CountUp from "react-countup";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

export function StatsSection() {
  const [stats, setStats] = useState(contentService.getContent().stats);

  useEffect(() => {
    const handler = () => setStats(contentService.getContent().stats);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="activites" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <p className="text-4xl font-semibold text-[#0f3d6e]">
              <CountUp end={stat.value} duration={2.2} />{stat.suffix}
            </p>
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
