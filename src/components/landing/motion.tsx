import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

export const easeOutSoft = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = { once: true, amount: 0.18, margin: "0px 0px -40px 0px" } as const;

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return !reduce;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
} & Omit<HTMLMotionProps<"div">, "initial" | "animate" | "whileInView" | "children">;

/** Apparition au scroll — sobre, utilisée partout sur la landing. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
  x = 0,
  scale = 1,
  ...rest
}: RevealProps) {
  const animate = useMotionSafe();

  if (!animate) {
    return (
      <div className={className} {...(rest as object)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x, scale: scale === 1 ? 1 : scale }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={viewportOnce}
      transition={{ duration: 0.55, delay, ease: easeOutSoft }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
};

/** Conteneur qui échelonne l’apparition de ses enfants directs (motion). */
export function Stagger({ children, className, delay = 0, stagger = 0.08 }: StaggerProps) {
  const animate = useMotionSafe();

  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutSoft },
  },
};

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  className?: string;
  dark?: boolean;
  action?: ReactNode;
};

/** En-tête de section avec ligne tricolore animée. */
export function SectionIntro({ eyebrow, title, className = "", dark = false, action }: SectionIntroProps) {
  const animate = useMotionSafe();

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <Reveal className="max-w-2xl">
        <p
          className={
            dark
              ? "text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[var(--sgi-gold-soft)]"
              : "dash-eyebrow"
          }
        >
          {eyebrow}
        </p>
        {animate ? (
          <motion.div
            className="sgi-tricolor-soft mt-2 h-1 w-20 origin-left rounded-full"
            aria-hidden
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.55, delay: 0.08, ease: easeOutSoft }}
          />
        ) : (
          <div className="sgi-tricolor-soft mt-2 h-1 w-20 rounded-full" aria-hidden />
        )}
        <h2
          className={
            dark
              ? "mt-3 font-display text-2xl font-semibold text-white sm:text-3xl"
              : "mt-2 font-display text-2xl font-semibold text-[var(--sgi-ink)] sm:text-3xl"
          }
        >
          {title}
        </h2>
      </Reveal>
      {action ? <Reveal delay={0.12}>{action}</Reveal> : null}
    </div>
  );
}
