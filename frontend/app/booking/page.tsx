"use client";

import { useRouter } from "next/navigation";
import { Calendar, ArrowRight, Video } from "lucide-react";
import { motion } from "framer-motion";

export default function BookingPage() {
  const router = useRouter();

  const handleBooking = async () => {
    try {
      // Use dynamic hostname to allow network access
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const res = await fetch(`${protocol}//${host}:8080/api/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counselor_id: "1",
          start_time: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Booking failed");

      const data = await res.json();
      router.push(`/waiting-room?room=${data.room_id}`);
    } catch (error) {
      console.error("Error booking:", error);
      alert("Gagal melakukan booking. Pastikan backend berjalan.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center justify-center w-16 h-16 bg-sky-500/10 rounded-2xl mb-6 mx-auto">
          <Video className="w-8 h-8 text-sky-500" />
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Mulai Sesi Konseling</h2>
        <p className="text-slate-400 text-center mb-8">
          Buat ruangan baru untuk memulai video call aman dan privat dengan konselor Anda.
        </p>

        <button
          onClick={handleBooking}
          className="group w-full bg-sky-500 hover:bg-sky-400 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
        >
          <Calendar className="w-5 h-5" />
          <span>Buat Jadwal Sesi</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="mt-6 text-center text-xs text-slate-500">
          Dilindungi dengan enkripsi end-to-end
        </div>
      </motion.div>
    </main>
  );
}
