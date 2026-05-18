"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { LogoFooter } from "../layout/logo";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    fill="currentColor"
    className="w-4 h-4"
    viewBox="0 0 16 16"
  >
    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    fill="currentColor"
    className="w-4 h-4"
    viewBox="0 0 16 16"
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

const modules = [
  { label: "Aso-Ebi Tracker", href: "#" },
  { label: "Vendor Sync", href: "#" },
  { label: "Digital Spray", href: "#" },
  { label: "Guest Check-in", href: "#" },
];

const connect = [
  { label: "Instagram", href: "#", icon: InstagramIcon },
  { label: "WhatsApp", href: "#", icon: WhatsAppIcon },
];

export default function Footer() {
  return (
    <footer className="relative z-[7] bg-[#F9F7F2] pt-32 pb-12 px-6 md:px-12 border-t mx-auto max-w-[1440px] border-zinc-200 overflow-hidden font-poppins">
      {/* Massive Background Ghost Text */}
      <div className="absolute -bottom-10 left-0 w-full text-center pointer-events-none select-none overflow-hidden">
        <h2 className="text-[25vw] font-black leading-none text-zinc-950/[0.03] tracking-tighter">
          OWAMBE
        </h2>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          {/* Brand Identity */}
          <div className="lg:col-span-5 space-y-8">
            <LogoFooter />
            <p className="text-lg font-medium text-zinc-500 max-w-sm leading-relaxed">
              Designed for the hosts who believe that celebration is a sacred
              tradition that deserves architectural precision and systemic joy.
            </p>
          </div>

          {/* Navigation Grid */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12 lg:pl-12">
            {/* Column 1: Modules */}
            <div className="space-y-8">
              <h5 className="text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em]">
                Product
              </h5>
              <ul className="space-y-4">
                {modules.map((m) => (
                  <li key={m.label}>
                    <span
                      className="group flex items-center gap-1 text-sm font-bold text-zinc-400 cursor-not-allowed"
                      aria-disabled="true"
                      title="Coming soon"
                    >
                      {m.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Socials */}
            <div className="space-y-8">
              <h5 className="text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em]">
                Social
              </h5>
              <ul className="space-y-4">
                {connect.map((c) => {
                  const Icon = c.icon;

                  return (
                    <li key={c.label}>
                      <span
                        className="group flex items-center gap-3 text-sm font-bold text-zinc-400 cursor-not-allowed"
                        aria-disabled="true"
                        title="Coming soon"
                      >
                        <Icon className="w-4 h-4 text-zinc-300 transition-colors" />
                        {c.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 3: Contact (Optional extra) */}
            <div className="hidden md:block space-y-8">
              <h5 className="text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em]">
                Contact
              </h5>
              <div className="space-y-4">
                <p className="text-sm font-bold text-zinc-500 cursor-pointer hover:text-zinc-900 transition-colors">
                  hello@owambe.io
                </p>
                <p className="text-sm font-bold text-zinc-500">
                  Lagos, NG — Worldwide
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-32 pt-12 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8 order-2 md:order-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              © 2026 OWAMBE SYSTEMS.
            </p>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-50 cursor-not-allowed" aria-disabled="true">
                Privacy (coming soon)
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-50 cursor-not-allowed" aria-disabled="true">
                Terms (coming soon)
              </span>
            </div>
            <motion.div
              className="flex items-center gap-3 order-1 md:order-2 px-6 py-2 rounded-full bg-zinc-900 text-[#F9F7F2] text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              Redefining Celebration{" "}
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </motion.div>
        </div>
      </div>
    </footer>
  );
}
