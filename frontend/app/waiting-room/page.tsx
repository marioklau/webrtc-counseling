"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Coffee, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function WaitingRoomPage() {
  const params = useSearchParams();
  const router = useRouter();
  const room = params.get("room");

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 w-full max-w-md text-center"
      >
        <div className="flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-2xl mb-6 mx-auto">
          <Coffee className="w-8 h-8 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Ruang Tunggu</h1>
        <p className="text-slate-400 mb-6">
          Sesi konseling Anda telah siap. Silakan masuk ketika Anda sudah siap.
        </p>

        <div className="bg-slate-800/50 rounded-lg p-3 mb-8 border border-white/5 font-mono text-sm text-slate-300">
          ID: {room}
        </div>

        <button
          onClick={() => router.push(`/session?room=${room}`)}
          className="group w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
        >
          <span>Masuk Sesi Konseling</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </main>
  );
}
