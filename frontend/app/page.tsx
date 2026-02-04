"use client";

import Link from "next/link";
import { User, Stethoscope, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 mb-4">
          SafeSpace Counseling
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-lg">
          Platform konseling aman, privat, dan terpercaya. Mulai perjalanan kesehatan mental Anda hari ini.
        </p>
      </motion.div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Client Card */}
        <Link href="/client-login" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full bg-slate-900/50 backdrop-blur-md border border-slate-700 hover:border-sky-500 rounded-2xl p-8 transition-all flex flex-col items-center text-center shadow-xl group-hover:shadow-sky-500/10"
          >
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-sky-500/20 transition-colors">
              <User className="w-10 h-10 text-sky-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Saya Klien</h2>
            <p className="text-slate-400 mb-8 flex-grow">
              Ingin berkonsultasi secara anonim? Buat jadwal dengan psikolog kami tanpa perlu mendaftar.
            </p>
            <div className="text-sky-400 font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              Mulai Konsultasi <ArrowRight size={18} />
            </div>
          </motion.div>
        </Link>

        {/* Expert Card */}
        <Link href="/login" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full bg-slate-900/50 backdrop-blur-md border border-slate-700 hover:border-emerald-500 rounded-2xl p-8 transition-all flex flex-col items-center text-center shadow-xl group-hover:shadow-emerald-500/10"
          >
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
              <Stethoscope className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Saya Psikolog</h2>
            <p className="text-slate-400 mb-8 flex-grow">
              Masuk ke dashboard untuk mengelola jadwal, menyetujui sesi, dan membuat catatan klien.
            </p>
            <div className="text-emerald-400 font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              Masuk Dashboard <ArrowRight size={18} />
            </div>
          </motion.div>
        </Link>
      </div>



      {/* Footer */}
      <footer className="absolute bottom-4 text-slate-700 text-xs text-center">
        © 2026 SafeSpace Webrtc. All rights reserved.
      </footer>
    </main>
  );
}
