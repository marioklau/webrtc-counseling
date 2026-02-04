"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";
import Calendar from "react-calendar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft,
  User, CheckCircle, Clock
} from "lucide-react";
import "react-calendar/dist/Calendar.css";

// Types
type Category = {
  id: number;
  name: string;
  name_en: string;
  description: string;
};

type Schedule = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type Psychologist = {
  id: number;
  name: string;
  specialties: string;
  categories: Category[];
  schedules: Schedule[];
  bio: string;
  is_available: boolean;
  is_booked: boolean;
};

type BookingState = {
  step: number;
  selectedCategory: Category | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedPsychologist: Psychologist | null;
  clientName: string;
  clientContact: string;
  additionalNotes: string;
};

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
  `${i.toString().padStart(2, '0')}:00`
);

export default function BookingWizard() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<BookingState>({
    step: 1,
    selectedCategory: null,
    selectedDate: null,
    selectedTime: null,
    selectedPsychologist: null,
    clientName: "",
    clientContact: "",
    additionalNotes: "",
  });

  // Check Auth & Load Categories on Mount
  useEffect(() => {
    const email = localStorage.getItem("client_email");
    if (!email) {
      alert("Silakan login terlebih dahulu.");
      router.push("/client-login");
      return;
    }

    setData(prev => ({ ...prev, clientContact: email }));
    fetchCategories();
  }, [router]);

  // Fetch psychologists when category is selected and reaching step 3
  useEffect(() => {
    if (data.step === 3 && data.selectedCategory) {
      fetchPsychologists(data.selectedCategory.id);
    }
  }, [data.step, data.selectedCategory]);

  const fetchCategories = async () => {
    try {
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const res = await fetch(`${protocol}//${host}:8080/api/public/categories`);
      if (res.ok) {
        const list = await res.json();
        setCategories(list || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchPsychologists = async (categoryId: number) => {
    setLoading(true);
    try {
      const protocol = window.location.protocol;
      const host = window.location.hostname;

      let url = `${protocol}//${host}:8080/api/public/psychologists?category_id=${categoryId}`;

      // Pass date & time if selected to check conflicts
      if (data.selectedDate && data.selectedTime) {
        const dateStr = format(data.selectedDate, "yyyy-MM-dd");
        url += `&date=${dateStr}&time=${data.selectedTime}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const list = await res.json();
        setPsychologists(list || []);
      }
    } catch (err) {
      console.error("Failed to fetch psychologists:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setData(prev => ({ ...prev, step: prev.step + 1 }));
  const handleBack = () => setData(prev => ({ ...prev, step: prev.step - 1 }));

  const submitBooking = async () => {
    if (!data.selectedDate || !data.selectedTime || !data.selectedPsychologist || !data.selectedCategory) return;

    const dateStr = format(data.selectedDate, "yyyy-MM-dd");
    const scheduleTime = `${dateStr}T${data.selectedTime}:00`;

    try {
      setLoading(true);
      const protocol = window.location.protocol;
      const host = window.location.hostname;

      const payload = {
        client_name: data.clientName,
        client_contact: data.clientContact,
        category_id: data.selectedCategory.id,
        complaint: data.additionalNotes,
        psychologist_id: data.selectedPsychologist.id,
        schedule_time: scheduleTime,
      };

      const res = await fetch(`${protocol}//${host}:8080/api/public/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Booking failed");

      alert("Booking Request Sent! Please wait for approval.");
      router.push("/dashboard/client");

    } catch (err) {
      console.error(err);
      alert("Failed to submit booking.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step Components ---

  const Step1Category = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">Apa yang ingin Anda konsultasikan?</h3>
      <div className="grid grid-cols-1 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setData(prev => ({ ...prev, selectedCategory: cat }));
              handleNext();
            }}
            className={`p-4 rounded-xl text-left transition-all border ${data.selectedCategory?.id === cat.id
              ? "bg-sky-600 border-sky-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
          >
            <div className="font-medium">{cat.name}</div>
            {cat.name_en && <div className="text-xs opacity-60">{cat.name_en}</div>}
          </button>
        ))}
      </div>
    </div>
  );

  const Step2Schedule = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Pilih Jadwal Konsultasi</h3>

      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <label className="text-sm text-slate-400 mb-2 block">Pilih Tanggal (Min H+1)</label>
        <Calendar
          onChange={(val) => setData(prev => ({ ...prev, selectedDate: val as Date, selectedTime: null }))}
          value={data.selectedDate}
          minDate={addDays(new Date(), 1)}
          className="w-full"
        />
      </div>

      {data.selectedDate && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="text-sm text-slate-400 mb-2 block">Pilih Jam (WIB)</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TIME_SLOTS.map(time => (
              <button
                key={time}
                onClick={() => setData(prev => ({ ...prev, selectedTime: time }))}
                className={`p-2 rounded-lg text-sm font-medium border ${data.selectedTime === time
                  ? "bg-sky-600 border-sky-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500"
                  }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          disabled={!data.selectedDate || !data.selectedTime}
          onClick={handleNext}
          className="bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500 text-white px-6 py-2 rounded-lg flex items-center gap-2"
        >
          Lanjut <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  const Step3Psychologist = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white">Pilih Psikolog</h3>
      <p className="text-sm text-slate-400">
        Menampilkan psikolog yang ahli di bidang: <span className="text-sky-400 font-medium">{data.selectedCategory?.name}</span>
      </p>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Memuat data psikolog...</div>
      ) : psychologists.length === 0 ? (
        <div className="text-center text-slate-500 py-10">
          Belum ada psikolog yang tersedia untuk kategori ini.
          <button onClick={() => setData(prev => ({ ...prev, step: 1 }))} className="text-sky-400 underline ml-2">
            Pilih kategori lain
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {psychologists.map(psy => {
            const isAvailable = checkAvailability(psy, data.selectedDate, data.selectedTime);
            return (
              <div
                key={psy.id}
                onClick={() => {
                  if (isAvailable) {
                    setData(prev => ({ ...prev, selectedPsychologist: psy }));
                    handleNext();
                  }
                }}
                className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${data.selectedPsychologist?.id === psy.id
                  ? "bg-sky-900/40 border-sky-500 ring-1 ring-sky-500"
                  : isAvailable
                    ? "bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer"
                    : "bg-slate-800/50 border-slate-800 opacity-60 cursor-not-allowed"
                  }`}
              >
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-slate-300" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-white">{psy.name}</h4>
                  <p className="text-sky-400 text-sm">{psy.specialties}</p>
                  <p className="text-slate-400 text-xs mt-1 line-clamp-2">{psy.bio}</p>

                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1 font-bold">Jadwal Praktik:</p>
                    {psy.schedules && psy.schedules.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {psy.schedules.map(sch => (
                          <span key={sch.id} className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                            {getDayName(sch.day_of_week)}: {sch.start_time.substring(0, 5)} - {sch.end_time.substring(0, 5)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Belum ada jadwal tetap.</p>
                    )}
                  </div>

                  {!isAvailable && (
                    <div className="mt-2 text-red-400 text-xs font-bold border border-red-900/30 bg-red-900/10 p-2 rounded">
                      ⛔ Sibuk / Di luar jadwal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const getDayName = (dayIdx: number) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[dayIdx];
  };

  const checkAvailability = (psy: Psychologist, date: Date | null, timeStr: string | null) => {
    // 1. Check strict schedule
    if (psy.schedules && psy.schedules.length > 0 && date && timeStr) {
      const dayOfWeek = date.getDay(); // 0-6

      // Find schedule for this day
      const daySchedule = psy.schedules.find(s => s.day_of_week === dayOfWeek && s.is_active);
      if (!daySchedule) return false; // Not available on this day

      // Check time range
      // timeStr is "HH:MM", schedule is "HH:MM:SS"
      const selectedTimeVal = parseInt(timeStr.replace(":", ""));
      const startTimeVal = parseInt(daySchedule.start_time.replace(":", "").substring(0, 4));
      const endTimeVal = parseInt(daySchedule.end_time.replace(":", "").substring(0, 4));

      if (selectedTimeVal < startTimeVal || selectedTimeVal >= endTimeVal) return false;
    }

    // 2. Check conflict (booked)
    if (psy.is_booked) return false;

    return true;
  };

  const Step4Review = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Konfirmasi Data</h3>

      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
        <div>
          <label className="text-xs text-slate-500 uppercase font-bold">Kategori</label>
          <p className="text-white">{data.selectedCategory?.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold">Tanggal</label>
            <p className="text-white">{data.selectedDate ? format(data.selectedDate, "dd MMMM yyyy", { locale: id }) : "-"}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold">Jam</label>
            <p className="text-white">{data.selectedTime} WIB</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase font-bold">Psikolog</label>
          <p className="text-white">{data.selectedPsychologist?.name}</p>
        </div>
      </div>

      {/* Client Data Input */}
      <div className="space-y-4 border-t border-slate-800 pt-4">


        <div>
          <label className="text-sm text-slate-300 mb-1 block">Nama Samaran (Alias untuk sesi ini)</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
            placeholder="Contoh: Alex"
            value={data.clientName}
            onChange={e => setData(prev => ({ ...prev, clientName: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm text-slate-300 mb-1 block">Catatan Tambahan (Opsional)</label>
          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none resize-none"
            rows={3}
            placeholder="Ceritakan sedikit tentang keluhan Anda..."
            value={data.additionalNotes}
            onChange={e => setData(prev => ({ ...prev, additionalNotes: e.target.value }))}
          />
        </div>
      </div>

      <button
        disabled={!data.clientName || loading}
        onClick={submitBooking}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 mt-4"
      >
        {loading ? "Mengirim..." : (
          <>
            <CheckCircle size={20} />
            Kirim Permintaan Booking
          </>
        )}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4">
      {/* Back to Dashboard */}
      <div className="w-full max-w-lg mb-6">
        <Link href="/dashboard/client" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors w-fit">
          <ArrowLeft size={20} />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`flex items-center gap-2 text-sm ${data.step >= s ? "text-sky-500 font-bold" : "text-slate-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${data.step >= s ? "border-sky-500 bg-sky-900/20" : "border-slate-700 bg-slate-900"
                }`}>
                {s}
              </div>
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${(data.step / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <motion.div
        layout
        className="w-full max-w-lg bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          {data.step > 1 && (
            <button onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
              <ArrowLeft size={16} /> Kembali
            </button>
          )}
          <span className="text-slate-500 text-xs font-mono ml-auto">Langkah {data.step} dari 4</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={data.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {data.step === 1 && Step1Category()}
            {data.step === 2 && Step2Schedule()}
            {data.step === 3 && Step3Psychologist()}
            {data.step === 4 && Step4Review()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
