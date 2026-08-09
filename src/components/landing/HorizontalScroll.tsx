import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type HorizontalScrollProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export function HorizontalScroll({ children, className = "", label = "Défiler" }: HorizontalScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateButtons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateButtons();
    el.addEventListener("scroll", updateButtons, { passive: true });
    const resize = new ResizeObserver(updateButtons);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", updateButtons);
      resize.disconnect();
    };
  }, [updateButtons, children]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 360);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-background to-transparent md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-background to-transparent md:block" />

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          aria-label="Précédent"
          disabled={!canPrev}
          onClick={() => scrollByCard(-1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-[var(--sgi-ink)] shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Suivant"
          disabled={!canNext}
          onClick={() => scrollByCard(1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-[var(--sgi-ink)] shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
