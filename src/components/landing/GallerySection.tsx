import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import contentService, { GalleryItem } from "../../services/contentService";
import { Reveal, SectionIntro, useMotionSafe } from "./motion";

export function GallerySection() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(contentService.getContent().galleryItems);
  const animate = useMotionSafe();

  useEffect(() => {
    const handler = () => setGalleryItems(contentService.getContent().galleryItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="galerie" className="bg-[var(--sgi-blue-deep)] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Galerie"
          title="Moments de vie, d’étude et de service"
          dark
          className="mb-8"
          action={
            <Link
              to="/galerie"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-gold-soft)] hover:text-white"
            >
              Voir toute la galerie <ArrowRight size={16} />
            </Link>
          }
        />

        <Reveal delay={0.1}>
          <Swiper
            modules={[Autoplay, Pagination]}
            grabCursor
            spaceBetween={14}
            slidesPerView={1.08}
            pagination={{ clickable: true }}
            autoplay={animate ? { delay: 3200, disableOnInteraction: false } : false}
            breakpoints={{
              640: { slidesPerView: 1.4, spaceBetween: 16 },
              1024: { slidesPerView: 2.2, spaceBetween: 18 },
              1280: { slidesPerView: 3, spaceBetween: 20 },
            }}
            className="!pb-12"
          >
            {galleryItems.map((item) => (
              <SwiperSlide key={item.id}>
                <Link to={`/galerie/${item.id}`} className="block">
                  <motion.div
                    whileHover={animate ? { y: -6 } : undefined}
                    transition={{ duration: 0.28 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-[240px] w-full object-cover transition duration-700 group-hover:scale-105 sm:h-[300px] lg:h-[340px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                      {item.category && (
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--sgi-red-soft)]">
                          {item.category}
                        </p>
                      )}
                      <h3 className="mt-1 font-display text-xl font-semibold">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-white/80">{item.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--sgi-gold-soft)]">
                        Voir le détail <ArrowRight size={14} />
                      </span>
                    </div>
                  </motion.div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </Reveal>
      </div>
    </section>
  );
}
