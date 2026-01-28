"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Video, Clock, LogOut, Plus } from "lucide-react";
import { motion } from "framer-motion";

type Booking = {
    id: number;
    client_name: string;
    complaint: string;
    schedule_time: string;
    status: "pending" | "approved" | "rejected" | "completed";
    room_id: string;
    psychologist_name: string;
};

export default function ClientDashboard() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientName, setClientName] = useState("");

    useEffect(() => {
        // Check Auth
        const email = localStorage.getItem("client_email");
        const name = localStorage.getItem("client_name");

        if (!email) {
            router.push("/client-login");
            return;
        }

        if (name) setClientName(name);

        // Fetch Bookings
        const fetchBookings = async () => {
            try {
                const protocol = window.location.protocol;
                const host = window.location.hostname;
                const res = await fetch(`${protocol}//${host}:8080/api/public/my-bookings?email=${email}`);
                if (res.ok) {
                    const data = await res.json();
                    setBookings(data || []);
                }
            } catch (err) {
                console.error("Failed to fetch bookings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("client_email");
        localStorage.removeItem("client_name");
        router.push("/");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "rejected": return "text-red-400 bg-red-400/10 border-red-400/20";
            case "completed": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            default: return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Halo, {clientName || "Klien"}</h1>
                        <p className="text-slate-400">Selamat datang di dashboard konsultasi Anda.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm bg-slate-900 px-4 py-2 rounded-lg border border-slate-800"
                    >
                        <LogOut size={16} /> Keluar
                    </button>
                </header>

                {/* Stats / Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <h3 className="text-slate-400 text-sm mb-1">Jadwal Mendatang</h3>
                        <p className="text-3xl font-bold text-white">
                            {bookings.filter(b => b.status === 'approved' || b.status === 'pending').length}
                        </p>
                    </div>

                    <Link href="/booking">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="h-full bg-sky-600 hover:bg-sky-500 p-6 rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-sky-600/20 transition-colors"
                        >
                            <Plus className="text-white w-8 h-8" />
                            <span className="text-xl font-bold text-white">Buat Booking Baru</span>
                        </motion.div>
                    </Link>
                </div>

                {/* Bookings List */}
                <h2 className="text-xl font-bold text-white mb-4">Riwayat Konsultasi</h2>

                {loading ? (
                    <div className="text-slate-500 text-center py-10">Memuat data...</div>
                ) : bookings.length === 0 ? (
                    <div className="text-slate-500 text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        Belum ada riwayat konsultasi.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Calendar className="text-slate-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{booking.psychologist_name}</h3>
                                        <p className="text-slate-400 text-sm">{booking.complaint}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                                            <Clock size={12} />
                                            {format(new Date(booking.schedule_time), "EEEE, dd MMMM yyyy - HH:mm", { locale: id })} WIB
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end md:self-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                                        {booking.status.toUpperCase()}
                                    </span>

                                    {booking.status === 'approved' && (
                                        <Link
                                            href={`/session?room=${booking.room_id}`}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                        >
                                            <Video size={16} /> Masuk Room
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
