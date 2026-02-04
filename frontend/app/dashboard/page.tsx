"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
    Calendar, Check, X, Video, LogOut, Clock,
    User, FileText, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Booking = {
    id: number;
    client_name: string;
    client_contact: string;
    complaint: string;
    schedule_time: string;
    status: "pending" | "approved" | "rejected" | "completed";
    room_id: string;
    session_notes?: string;
};

export default function ExpertDashboard() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [expertName, setExpertName] = useState("");
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectBookingId, setRejectBookingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    // ... (fetchBookings and useEffect remain same) ...

    const handleUpdateNotes = async (id: number, notes: string) => {
        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const res = await fetch(`${protocol}//${host}:8080/api/expert/bookings/${id}/notes`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });

            if (res.ok) {
                setBookings(prev => prev.map(b => b.id === id ? { ...b, session_notes: notes } : b));
            } else {
                alert("Gagal menyimpan catatan.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving notes");
        }
    };

    useEffect(() => {
        // Check Auth (Mock)
        const token = localStorage.getItem("expert_token");
        const email = localStorage.getItem("expert_email");

        if (!token) {
            router.push("/login");
            return;
        }

        if (email) setExpertName(email);

        fetchBookings();
        fetchBookings();

        // WebSocket for Realtime Updates
        if (email) {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.hostname;
            const wsUrl = `${protocol}//${host}:8080/api/notify?email=${encodeURIComponent(email)}`;

            let ws: WebSocket | null = null;
            const connectWs = () => {
                ws = new WebSocket(wsUrl);

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === "new_booking") {
                            fetchBookings();
                            if (Notification.permission === "granted") {
                                new Notification("Booking Baru!", { body: msg.message });
                            }
                        }
                    } catch (e) { console.error(e); }
                };

                ws.onclose = () => setTimeout(connectWs, 5000);
            };
            connectWs();

            if (Notification.permission !== "granted") Notification.requestPermission();

            return () => { if (ws) ws.close(); };
        }
    }, [router]);

    const fetchBookings = async () => {
        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const email = localStorage.getItem("expert_email") || "";

            // IMPORTANT: Pass email to filter bookings by this psychologist only
            const res = await fetch(`${protocol}//${host}:8080/api/expert/bookings?email=${encodeURIComponent(email)}`);
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

    const handleApprove = async (id: number) => {
        if (!confirm(`Apakah anda yakin ingin menyetujui booking ini?`)) return;

        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const res = await fetch(`${protocol}//${host}:8080/api/expert/bookings/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "approved" }),
            });

            if (res.ok) {
                setTimeout(fetchBookings, 500);
            }
        } catch (err) {
            alert("Gagal menyetujui booking");
        }
    };

    const openRejectModal = (id: number) => {
        setRejectBookingId(id);
        setRejectReason("");
        setRejectModalOpen(true);
    };

    const handleReject = async () => {
        if (!rejectBookingId) return;
        if (!rejectReason.trim()) {
            alert("Silakan masukkan alasan penolakan");
            return;
        }

        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const res = await fetch(`${protocol}//${host}:8080/api/expert/bookings/${rejectBookingId}/reject`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason }),
            });

            if (res.ok) {
                // Remove from local state
                setBookings(prev => prev.filter(b => b.id !== rejectBookingId));
                setRejectModalOpen(false);
                setRejectBookingId(null);
                setRejectReason("");
            } else {
                alert("Gagal menolak booking");
            }
        } catch (err) {
            alert("Gagal menolak booking");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("expert_token");
        router.push("/");
    };

    const isExpired = (scheduleTime: string) => {
        const scheduleDate = new Date(scheduleTime);
        const now = new Date();
        const diffInHours = (now.getTime() - scheduleDate.getTime()) / (1000 * 60 * 60);
        return diffInHours > 1;
    };

    const pendingBookings = bookings.filter(b => b.status === "pending");
    // Only show approved bookings that are NOT expired in upcoming
    const upcomingBookings = bookings.filter(b => b.status === "approved" && !isExpired(b.schedule_time));
    // Move expired approved sessions and completed to history
    const pastBookings = bookings.filter(b =>
        b.status === "completed" ||
        (b.status === "approved" && isExpired(b.schedule_time))
    );

    return (
        <main className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 py-4 border-b border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Dashboard Psikolog</h1>
                        <p className="text-slate-400">Kelola jadwal dan sesi konsultasi Anda.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-white font-medium">
                                {expertName || "Expert"}
                            </p>
                            <p className="text-xs text-emerald-400">● Online</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-colors"
                            title="Keluar"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Requests & Upcoming */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Pending Requests */}
                        <section>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <User className="text-yellow-400" size={20} />
                                Permintaan Masuk <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pendingBookings.length}</span>
                            </h2>
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {pendingBookings.length === 0 ? (
                                        <div className="text-slate-500 italic text-sm">Tidak ada permintaan baru.</div>
                                    ) : (
                                        pendingBookings.map(booking => (
                                            <motion.div
                                                key={booking.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-white font-bold text-lg">{booking.client_name}</h3>
                                                        <p className="text-slate-400 text-sm">{booking.client_contact}</p>
                                                    </div>
                                                    <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400 border border-slate-700">
                                                        Pending
                                                    </span>
                                                </div>

                                                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 mb-4">
                                                    <p className="text-slate-300 text-sm italic">"{booking.complaint}"</p>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sky-400 text-sm font-medium">
                                                        <Clock size={16} />
                                                        {format(new Date(booking.schedule_time), "EEEE, dd MMMM - HH:mm", { locale: id })}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openRejectModal(booking.id)}
                                                            className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
                                                        >
                                                            Tolak
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(booking.id)}
                                                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Check size={16} /> Setujui
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </section>

                        {/* Schedule Management */}
                        <section>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Calendar className="text-emerald-400" size={20} />
                                Atur Jadwal Availability
                            </h2>
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                                <ManageSchedule expertEmail={expertName} />
                            </div>
                        </section>

                        {/* Upcoming Sessions */}
                        <section>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Video className="text-sky-400" size={20} />
                                Jadwal Akan Datang
                            </h2>

                            <div className="space-y-4">
                                {upcomingBookings.length === 0 ? (
                                    <div className="text-slate-500 italic text-sm">Belum ada jadwal disetujui.</div>
                                ) : (
                                    upcomingBookings.map(booking => (
                                        <div key={booking.id} className="bg-slate-900 border border-l-4 border-l-sky-500 border-slate-800 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h3 className="text-white font-bold">{booking.client_name}</h3>
                                                <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                                    <Clock size={14} />
                                                    {format(new Date(booking.schedule_time), "dd MMM yyyy, HH:mm", { locale: id })}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                                                    <FileText size={12} />
                                                    {booking.complaint}
                                                </div>
                                            </div>

                                            {isExpired(booking.schedule_time) ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBooking(booking);
                                                            setNoteModalOpen(true);
                                                        }}
                                                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium border border-slate-700 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <FileText size={18} /> Notes
                                                    </button>
                                                    <button disabled className="px-5 py-2.5 bg-slate-900 text-slate-600 rounded-lg font-medium border border-slate-800 cursor-not-allowed flex items-center justify-center gap-2">
                                                        <Clock size={18} /> Sesi Berakhir
                                                    </button>
                                                </div>
                                            ) : (
                                                <Link
                                                    href={`/session?room=${booking.room_id}&role=expert`}
                                                    className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Video size={18} /> Masuk Room
                                                </Link>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: History / Notes */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-white font-semibold mb-4">Ringkasan</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-950 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-emerald-400">{upcomingBookings.length}</div>
                                    <div className="text-xs text-slate-500">Upcoming</div>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-slate-300">{pastBookings.length}</div>
                                    <div className="text-xs text-slate-500">Selesai</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit max-h-[500px] overflow-y-auto custom-scrollbar">
                            <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">Riwayat Terakhir</h2>
                            <div className="space-y-3">
                                {pastBookings.slice(0, 5).map(b => (
                                    <div key={b.id} className="text-sm border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-slate-300 font-medium">{b.client_name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${b.status === 'rejected' ? 'text-red-400 bg-red-400/10' : 'text-slate-400 bg-slate-800'}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2">
                                            {format(new Date(b.schedule_time), "dd/MM/yyyy - HH:mm", { locale: id })} WIB
                                        </div>

                                        {/* Notes Section */}
                                        <div className="mt-2">
                                            <textarea
                                                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs p-2 rounded"
                                                rows={2}
                                                placeholder="Tambahkan catatan sesi..."
                                                defaultValue={b.session_notes}
                                                onBlur={(e) => {
                                                    if (e.target.value !== b.session_notes) {
                                                        handleUpdateNotes(b.id, e.target.value);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {pastBookings.length === 0 && <span className="text-xs text-slate-600">Belum ada riwayat.</span>}
                            </div>
                        </div>
                    </div>


                </div>

                {/* Note Modal */}
                <AnimatePresence>
                    {noteModalOpen && selectedBooking && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">Catatan Sesi: {selectedBooking.client_name}</h3>
                                    <button onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <textarea
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:outline-none focus:border-sky-500 min-h-[150px] mb-4"
                                    placeholder="Tuliskan catatan konseling di sini..."
                                    defaultValue={selectedBooking.session_notes}
                                    id="note-textarea"
                                />

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setNoteModalOpen(false)}
                                        className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={() => {
                                            const val = (document.getElementById("note-textarea") as HTMLTextAreaElement).value;
                                            handleUpdateNotes(selectedBooking.id, val);
                                            setNoteModalOpen(false);
                                        }}
                                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium"
                                    >
                                        Simpan Catatan
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Rejection Modal */}
                <AnimatePresence>
                    {rejectModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">Tolak Booking</h3>
                                    <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <p className="text-slate-400 text-sm mb-4">
                                    Silakan berikan alasan penolakan untuk klien:
                                </p>

                                <textarea
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:outline-none focus:border-red-500 min-h-[120px] mb-4"
                                    placeholder="Contoh: Jadwal sudah penuh, silakan pilih waktu lain..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setRejectModalOpen(false)}
                                        className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
                                    >
                                        Tolak Booking
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </main>
    );
}

// Simple Schedule Component within the same file for brevity
function ManageSchedule({ expertEmail }: { expertEmail: string }) {
    const [days, setDays] = useState([
        { day: 1, name: "Senin", start: "09:00", end: "17:00", active: true },
        { day: 2, name: "Selasa", start: "09:00", end: "17:00", active: true },
        { day: 3, name: "Rabu", start: "09:00", end: "17:00", active: true },
        { day: 4, name: "Kamis", start: "09:00", end: "17:00", active: true },
        { day: 5, name: "Jumat", start: "09:00", end: "17:00", active: true },
        { day: 6, name: "Sabtu", start: "10:00", end: "14:00", active: false },
        { day: 0, name: "Minggu", start: "10:00", end: "14:00", active: false },
    ]);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const schedules = days.map(d => ({
                day_of_week: d.day,
                start_time: d.start + ":00",
                end_time: d.end + ":00",
                is_active: d.active
            }));

            const res = await fetch(`${protocol}//${host}:8080/api/expert/schedule`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: expertEmail, schedules })
            });

            if (res.ok) alert("Jadwal berhasi disimpan!");
            else alert("Gagal menyimpan jadwal.");
        } catch (e) {
            console.error(e);
            alert("Error saving schedule");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            {days.map((d, i) => (
                <div key={d.day} className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={d.active} onChange={e => {
                        const newDays = [...days];
                        newDays[i].active = e.target.checked;
                        setDays(newDays);
                    }} className="accent-sky-500" />
                    <span className="w-12">{d.name}</span>
                    <input type="time" value={d.start} onChange={e => {
                        const newDays = [...days];
                        newDays[i].start = e.target.value;
                        setDays(newDays);
                    }} disabled={!d.active} className="bg-slate-950 border border-slate-700 rounded px-1 disabled:opacity-50" />
                    <span>-</span>
                    <input type="time" value={d.end} onChange={e => {
                        const newDays = [...days];
                        newDays[i].end = e.target.value;
                        setDays(newDays);
                    }} disabled={!d.active} className="bg-slate-950 border border-slate-700 rounded px-1 disabled:opacity-50" />
                </div>
            ))}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 rounded-lg"
            >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
        </div>
    );
}
