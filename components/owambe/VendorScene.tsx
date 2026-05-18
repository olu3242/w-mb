"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  CheckCircle2,
  RotateCw,
  Calendar,
  UtensilsCrossed,
} from "lucide-react";

export default function VendorScene() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20% 0px" });

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        // Add 'as const' to satisfy the Framer Motion CubicBezier type
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };
  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center px-6 py-10 md:px-12 bg-[#0a0a0a] overflow-hidden font-poppins"
    >
      {/* Background with subtle zoom */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&q=80&w=1600"
          alt="Gourmet catering"
          className="w-full h-full object-cover opacity-50"
        />
        {/* Cinematic darkening gradient (Right to Left for this layout) */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent z-10" />
      </div>

      <div className="container mx-auto relative z-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Visual Card (Now on Left for Layout Variety) */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 lg:order-1"
        >
          <div className="relative group max-w-sm mx-auto lg:ml-0">
            {/* Glow Aura */}
            <div className="absolute -inset-1 bg-emerald-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000" />

            <div className="relative bg-zinc-950/60 backdrop-blur-3xl border border-emerald-200 p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <UtensilsCrossed className="text-emerald-400" size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Main Caterer
                  </p>
                  <h4 className="font-black text-2xl text-white">
                    Iya Basira Kitchen
                  </h4>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  {
                    text: "Jollof Service Ready",
                    time: "12:30 PM",
                    status: "done",
                  },
                  { text: "Drinks Service", time: "Active", status: "loading" },
                  {
                    text: "Small Chops Refill",
                    time: "04:00 PM",
                    status: "pending",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group/item"
                  >
                    <div className="flex items-center gap-4">
                      {item.status === "done" && (
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      )}
                      {item.status === "loading" && (
                        <RotateCw
                          className="text-amber-400 animate-spin"
                          size={18}
                        />
                      )}
                      {item.status === "pending" && (
                        <div className="w-[18px] h-[18px] rounded-full border-2 border-zinc-700" />
                      )}
                      <span
                        className={`text-[13px] font-bold ${item.status === "pending" ? "text-zinc-300" : "text-zinc-200"}`}
                      >
                        {item.text}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-200 tracking-tighter">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-200">
                      Balance Status
                    </p>
                    <p className="text-white font-bold">
                      ₦850k{" "}
                      <span className="text-zinc-300 font-medium">/ 1.2M</span>
                    </p>
                  </div>
                  <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "70%" } : {}}
                      transition={{ duration: 1.5, delay: 0.8 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="order-1 lg:order-2 lg:text-right"
        >
          <h2 className="text-[12vw] md:text-[7.5vw] font-black leading-[0.85] tracking-tighter text-white mb-8 uppercase">
            Vendor <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-green-600">
              Control.
            </span>
          </h2>
          <p className="text-lg md:text-xl font-medium text-zinc-400 max-w-xl lg:ml-auto leading-relaxed mb-10">
            From the smokey party Jollof to the chilled premium spirits, every
            partner is synced to your live event timeline. Kill the &quot;African
            Time&quot; myth with architectural precision.
          </p>

          <div className="flex items-center gap-4 text-white/40 text-[10px] font-bold uppercase tracking-widest lg:justify-end">
            Syncing in Real-time
            <div className="h-[1px] w-12 bg-white/20" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
