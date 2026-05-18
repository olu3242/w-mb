"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function CtaSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="join"
      ref={ref}
      className="py-32 px-6 md:px-12 text-center bg-[#F9F7F2]"
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="font-black uppercase leading-none mb-12 text-7xl md:text-[10vw]"
          style={{ lineHeight: 0.85, letterSpacing: "-0.04em" }}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          The Party <br /> Starts Here.
        </motion.h2>

        <motion.div
          className="flex flex-col md:flex-row justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <a href="/signup" className="inline-flex bg-[#1A1A1A] text-[#F9F7F2] px-12 py-6 text-xl font-black uppercase border border-[#1A1A1A] shadow-[5px_5px_0px_#065F46] hover:bg-[#FACC15] hover:text-[#1A1A1A] transition-all">
            Plan My Owambe
          </a>
          <button
            disabled
            title="Guest access is coming soon"
            className="border-2 border-[#1A1A1A] text-[#6B7280] px-12 py-6 text-xl font-black uppercase bg-white/5 cursor-not-allowed"
          >
            Guest access coming soon
          </button>
        </motion.div>

        <p className="mt-16 text-[12px] font-black uppercase tracking-[0.5em] text-slate-600">
          Redefining celebration for the modern world.
        </p>
      </div>
    </section>
  );
}
