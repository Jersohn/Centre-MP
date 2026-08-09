import { motion } from "motion/react";
import {
  BookOpen,
  Building2,
  Compass,
  GitBranch,
  HeartHandshake,
  Layers3,
  Sparkles,
  Users,
} from "lucide-react";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";
import { Reveal, SectionIntro, Stagger, staggerItem, useMotionSafe } from "./motion";

const values = [
  { title: "Paix", description: "Cultiver l’harmonie dans chaque relation.", icon: HeartHandshake },
  { title: "Sagesse", description: "Éducation et compréhension profonde.", icon: BookOpen },
  { title: "Unité", description: "Des liens solides entre les communautés.", icon: Compass },
  { title: "Engagement", description: "Service concret pour la société.", icon: Sparkles },
];

const orgLevels = [
  "Région générale",
  "Région",
  "Centre général",
  "Centre",
  "Chapitre",
  "District",
  "Groupe",
];

const centreLineage = [
  { label: "Région générale", value: "Terre de Victoire" },
  { label: "Région", value: "Myoren" },
  { label: "Centre général", value: "Osaka" },
  { label: "Centre", value: "Miroir Parfait" },
];

export function AboutSection() {
  const [content, setContent] = useState(contentService.getContent());
  const animate = useMotionSafe();

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="centre" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionIntro eyebrow="Notre Centre" title="Centre Miroir Parfait — SGI Côte d’Ivoire" />

      {/* Présentation */}
      <Reveal className="mt-6 overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[var(--shadow-soft)]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[340px] lg:min-h-full">
            <motion.img
              src={content.aboutImage}
              alt="Le responsable dirige la prière devant le butsudan fermé, les membres assis derrière lui"
              className="absolute inset-0 h-full w-full object-cover"
              whileHover={animate ? { scale: 1.03 } : undefined}
              transition={{ duration: 0.7 }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[var(--sgi-blue-deep)]/75 via-[var(--sgi-blue)]/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-white/10"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 lg:hidden">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[var(--sgi-gold-soft)]">
                Présentation
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-white">
                Un centre vivant au service de la paix
              </h3>
            </div>
          </div>

          <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <p className="dash-eyebrow hidden lg:block">Présentation</p>
            <h3 className="mt-2 hidden font-display text-2xl font-semibold text-[var(--sgi-ink)] sm:text-3xl lg:block">
              Un centre vivant au service de la paix
            </h3>
            <div className="sgi-tricolor-soft mt-4 hidden h-1 w-24 rounded-full lg:block" aria-hidden />
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:leading-8 lg:mt-5">
              {content.aboutText}
            </p>

            <Stagger className="mt-7 grid gap-4 sm:grid-cols-2" delay={0.08} stagger={0.06}>
              {values.map((value, index) => {
                const Icon = value.icon;
                const tones = [
                  "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]",
                  "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]",
                  "bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]",
                  "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]",
                ];
                return (
                  <motion.div
                    key={value.title}
                    variants={animate ? staggerItem : undefined}
                    className="flex gap-3 border-t border-border pt-4"
                  >
                    <div
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[index]}`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display text-base font-semibold text-[var(--sgi-ink)]">{value.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{value.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </Stagger>
          </div>
        </div>
      </Reveal>

      {/* Organisation */}
      <Reveal className="dash-panel mt-4 p-5 sm:mt-5 sm:p-7" delay={0.05}>
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-[var(--sgi-blue)]">
            <Layers3 size={20} />
          </div>
          <div>
            <p className="dash-eyebrow">Organisation</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-[var(--sgi-ink)] sm:text-2xl">
              Structure de la SGI Côte d’Ivoire
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              La Soka Gakkai en Côte d’Ivoire s’organise du niveau national au plus local, pour accompagner chaque
              membre au plus près de sa réalité.
            </p>
          </div>
        </div>

        <div className="sgi-tricolor-soft mt-5 h-1 w-full max-w-md rounded-full" aria-hidden />

        <Stagger className="mt-5 flex flex-wrap gap-2" delay={0.12} stagger={0.05}>
          {orgLevels.map((level, index) => {
            const accent =
              level === "Centre"
                ? "bg-[var(--sgi-red)] text-white"
                : level === "Chapitre"
                  ? "bg-[var(--sgi-gold)] text-[var(--sgi-ink)]"
                  : level === "Région générale"
                    ? "bg-[var(--sgi-blue)] text-white"
                    : "bg-secondary text-[var(--sgi-blue)]";
            return (
              <motion.div key={level} variants={animate ? staggerItem : undefined} className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm ${accent}`}>{level}</span>
                {index < orgLevels.length - 1 && (
                  <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                    →
                  </span>
                )}
              </motion.div>
            );
          })}
        </Stagger>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal className="dash-panel p-5 sm:p-7" delay={0.04}>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sgi-blue)] text-white">
              <GitBranch size={20} />
            </div>
            <div>
              <p className="dash-eyebrow">Notre rattachement</p>
              <h3 className="font-display text-xl font-semibold text-[var(--sgi-ink)]">Où se situe le centre</h3>
            </div>
          </div>

          <Stagger className="mt-5 space-y-3" delay={0.08} stagger={0.06}>
            {centreLineage.map((item, index) => {
              const styles = [
                "border-[var(--sgi-blue)]/25 bg-[var(--sgi-blue)]/5",
                "border-[var(--sgi-gold)]/40 bg-[var(--sgi-gold)]/10",
                "border-[var(--sgi-red)]/30 bg-[var(--sgi-red)]/5",
                "border-[var(--sgi-red)]/50 bg-[var(--sgi-red)]/10",
              ];
              return (
                <motion.div
                  key={item.label}
                  variants={animate ? staggerItem : undefined}
                  className={`relative rounded-2xl border px-4 py-3 ${styles[index]}`}
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-[var(--sgi-ink)]">{item.value}</p>
                </motion.div>
              );
            })}
          </Stagger>
        </Reveal>

        <Reveal className="dash-panel p-5 sm:p-7" delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sgi-red)] text-white">
              <Building2 size={20} />
            </div>
            <div>
              <p className="dash-eyebrow">Composition</p>
              <h3 className="font-display text-xl font-semibold text-[var(--sgi-ink)]">Trois chapitres</h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Le Centre Miroir Parfait est constitué de trois chapitres, eux-mêmes organisés en districts et groupes.
          </p>
          <ul className="mt-5 space-y-3">
            {content.chapterLeaders.map((chapter, index) => {
              const rings = [
                "ring-[var(--sgi-blue)]/40",
                "ring-[var(--sgi-gold)]/50",
                "ring-[var(--sgi-red)]/40",
              ];
              return (
                <li key={chapter.id} className="rounded-2xl border border-border bg-white p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={chapter.responsibleImage}
                      alt={`${chapter.responsibleName} — ${chapter.name}`}
                      className={`h-14 w-14 shrink-0 rounded-2xl object-cover object-top ring-2 ${rings[index % 3]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-2 text-[0.7rem] font-bold text-[var(--sgi-ink)]">
                          {index + 1}
                        </span>
                        <p className="truncate font-display text-lg font-semibold text-[var(--sgi-ink)]">
                          {chapter.name}
                        </p>
                      </div>
                      <p className="mt-1 text-sm font-medium text-[var(--sgi-ink)]/80">
                        {chapter.responsibleName}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                        {chapter.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--sgi-red)]/20 bg-[var(--sgi-red)]/5 px-3 py-3 text-xs font-semibold text-[var(--sgi-red-deep)] sm:text-sm">
            <Users size={16} className="shrink-0 text-[var(--sgi-red)]" />
            Chaque chapitre regroupe des districts et des groupes de membres.
          </div>
        </Reveal>
      </div>

      {/* Comité du centre */}
      <div className="mt-10">
        <SectionIntro
          eyebrow="Comité du centre"
          title="Les responsables du Centre Miroir Parfait"
          action={
            <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">
              L’équipe qui anime, accompagne et unit les membres au quotidien.
            </p>
          }
        />

        <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" delay={0.06} stagger={0.07}>
          {content.centreCommittee.map((leader, index) => {
            const accents = [
              "from-[var(--sgi-blue)] to-[var(--sgi-blue-deep)]",
              "from-[var(--sgi-gold)] to-[#b8860b]",
              "from-[var(--sgi-red)] to-[var(--sgi-red-deep)]",
            ];
            return (
              <motion.article
                key={leader.id}
                variants={animate ? staggerItem : undefined}
                whileHover={animate ? { y: -4 } : undefined}
                className="dash-panel overflow-hidden"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  <img
                    src={leader.image}
                    alt={`${leader.name} — ${leader.role}`}
                    className="h-full w-full object-cover object-top"
                  />
                  <div className={`absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t ${accents[index % 3]} opacity-90`} />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/85">{leader.role}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold">{leader.name}</h3>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </Stagger>
      </div>

      {/* Responsables de chapitres */}
      <div className="mt-12">
        <SectionIntro
          eyebrow="Chapitres"
          title="Responsables de chaque chapitre"
          action={
            <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">
              Des responsables qui accompagnent les districts et groupes de leur chapitre.
            </p>
          }
        />

        <Stagger className="mt-6 grid gap-5 lg:grid-cols-3" delay={0.08} stagger={0.08}>
          {content.chapterLeaders.map((chapter, index) => {
            const accents = [
              "from-[var(--sgi-blue)] to-[var(--sgi-blue-deep)]",
              "from-[var(--sgi-gold)] to-[#b8860b]",
              "from-[var(--sgi-red)] to-[var(--sgi-red-deep)]",
            ];
            const badges = [
              "bg-[var(--sgi-blue)] text-white",
              "bg-[var(--sgi-gold)] text-[var(--sgi-ink)]",
              "bg-[var(--sgi-red)] text-white",
            ];
            const numbers = ["text-[var(--sgi-blue)]", "text-[var(--sgi-gold)]", "text-[var(--sgi-red)]"];
            return (
              <motion.article
                key={chapter.id}
                variants={animate ? staggerItem : undefined}
                whileHover={animate ? { y: -4 } : undefined}
                className="dash-panel group overflow-hidden"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  <img
                    src={chapter.responsibleImage}
                    alt={`${chapter.responsibleName} — ${chapter.responsibleRole}, ${chapter.name}`}
                    className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div
                    className={`absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t ${accents[index % 3]} opacity-95`}
                  />
                  <div className="absolute left-3 top-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] shadow-sm ${badges[index % 3]}`}
                    >
                      Chapitre {index + 1}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/85">
                      {chapter.responsibleRole}
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">
                      {chapter.responsibleName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-white/90">{chapter.name}</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-sm leading-6 text-muted-foreground">{chapter.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {chapter.stats.map((stat) => (
                      <div
                        key={`${chapter.id}-${stat.label}`}
                        className="rounded-2xl bg-secondary/60 px-2 py-3 text-center ring-1 ring-border/80"
                      >
                        <p className={`font-display text-xl font-semibold ${numbers[index % 3]}`}>
                          <CountUp end={stat.value} duration={1.6} separator=" " enableScrollSpy scrollSpyOnce />
                          {stat.suffix}
                        </p>
                        <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
