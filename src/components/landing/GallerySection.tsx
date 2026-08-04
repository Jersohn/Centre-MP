import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

export function GallerySection() {
  const [galleryItems, setGalleryItems] = useState(contentService.getContent().galleryItems);

  useEffect(() => {
    const handler = () => setGalleryItems(contentService.getContent().galleryItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="galerie" className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d9a11a]">Galerie</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Des moments de vie, d’étude et de service.</h2>
        </div>
        <Swiper
          modules={[Autoplay, EffectCoverflow]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView={1}
          spaceBetween={20}
          breakpoints={{ 640: { slidesPerView: 1.1 }, 1024: { slidesPerView: 2.1 }, 1280: { slidesPerView: 3.2 } }}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          coverflowEffect={{ rotate: 20, stretch: 0, depth: 100, modifier: 1.5, slideShadows: false }}
          className="!pb-10"
        >
          {galleryItems.map((item, index) => (
            <SwiperSlide key={index}>
              <motion.div whileHover={{ scale: 1.03 }} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-black">
                <img src={item.image} alt={item.title} className="h-[260px] w-full object-cover sm:h-[320px] md:h-[360px] lg:h-[420px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#d9a11a]">Galerie</p>
                  <h3 className="mt-2 text-xl font-semibold sm:text-2xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-200/80">{item.description}</p>
                </div>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
