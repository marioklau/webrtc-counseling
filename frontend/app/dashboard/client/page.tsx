"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Video, Clock, LogOut, Plus, AlertTriangle, User, Mail } from "lucide-react";
import { motion } from "framer-motion";

type Booking = {
    id: number;
    client_name: string;
    complaint: string;
    schedule_time: string;
    status: "pending" | "approved" | "rejected" | "completed";
    room_id: string;
    psychologist_name: string;
    session_notes?: string;
    rejection_reason?: string;
};

// Helper function to check if a booking session has expired (>1 hour from scheduled time)
const isExpired = (scheduleTime: string) => {
    const scheduleDate = new Date(scheduleTime);
    const now = new Date();
    const diffInHours = (now.getTime() - scheduleDate.getTime()) / (1000 * 60 * 60);
    return diffInHours > 1;
};

export default function ClientDashboard() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Force refresh trigger
    const wsRef = useRef<WebSocket | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch bookings - defined outside useEffect to avoid stale closure
    const fetchBookings = useCallback(async () => {
        const email = localStorage.getItem("client_email");
        if (!email) return;

        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            console.log("[DEBUG] Fetching bookings for:", email);
            const res = await fetch(`${protocol}//${host}:8080/api/public/my-bookings?email=${email}`, {
                cache: 'no-store',  // Prevent Next.js from caching API response
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[DEBUG] Received bookings:", data);
                console.log("[DEBUG] Bookings statuses:", data?.map((b: Booking) => ({ id: b.id, status: b.status })));
                setBookings(data || []);
            }
        } catch (err) {
            console.error("Failed to fetch bookings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Check Auth
        const email = localStorage.getItem("client_email");
        const name = localStorage.getItem("client_name");

        if (!email) {
            router.push("/client-login");
            return;
        }

        setClientEmail(email);
        if (name && name !== "undefined") setClientName(name);

        // Initial fetch
        fetchBookings();

        // WebSocket for Realtime Updates
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        const wsUrl = `${protocol}//${host}:8080/api/notify?email=${encodeURIComponent(email)}`;

        let reconnectTimeout: NodeJS.Timeout | null = null;

        const connectWs = () => {
            // Close existing connection if any
            if (wsRef.current) {
                wsRef.current.close();
            }

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("WebSocket connected for notifications");

                // Start ping interval to keep connection alive (every 30 seconds)
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                        console.log("Ping sent to keep connection alive");
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                console.log("WebSocket message received:", event.data);
                try {
                    const msg = JSON.parse(event.data);

                    // Handle pong response
                    if (msg.type === "pong") {
                        console.log("Pong received");
                        return;
                    }

                    if (msg.type === "booking_updated") {
                        console.log("Booking updated, refreshing...");
                        // Refresh bookings on update - use the callback version to avoid stale closure
                        fetchBookings();

                        // Show browser notification if permitted
                        if (Notification.permission === "granted") {
                            new Notification("Status Booking Diperbarui", { body: msg.message });
                        }
                    }

                    if (msg.type === "booking_rejected") {
                        console.log("Booking rejected:", msg.reason);
                        // Refresh bookings to remove rejected one
                        fetchBookings();

                        // Show alert with rejection reason
                        alert(`Booking Anda ditolak.\n\nAlasan: ${msg.reason}`);

                        // Show browser notification if permitted
                        if (Notification.permission === "granted") {
                            new Notification("Booking Ditolak", { body: msg.message });
                        }
                    }
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
            };

            ws.onclose = (event) => {
                console.log("WebSocket disconnected, code:", event.code, "reason:", event.reason);

                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                // Reconnect after 3s (reduced from 5s for faster recovery)
                reconnectTimeout = setTimeout(connectWs, 3000);
            };
        };

        connectWs();

        // Request notification permission
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [router, fetchBookings]);

    const handleLogout = () => {
        localStorage.removeItem("client_email");
        localStorage.removeItem("client_name");
        router.push("/");
    };

    // Filter bookings by category
    const pendingBookings = bookings.filter(b => b.status.toLowerCase() === 'pending');
    const upcomingBookings = bookings.filter(b => b.status.toLowerCase() === 'approved' && !isExpired(b.schedule_time));
    const expiredBookings = bookings.filter(b => b.status.toLowerCase() === 'approved' && isExpired(b.schedule_time));
    const historyBookings = bookings.filter(b => ['completed', 'rejected'].includes(b.status.toLowerCase()));
    const unknownBookings = bookings.filter(b => !['pending', 'approved', 'completed', 'rejected'].includes(b.status.toLowerCase()));

    // Count only non-expired upcoming and pending for "Jadwal Mendatang"
    const upcomingCount = upcomingBookings.length + pendingBookings.length;

    return (
        <main className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">SafeSpace Counseling</h1>
                        <p className="text-slate-400">Selamat datang di dashboard konsultasi Anda.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Profile Info */}
                        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                            <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                            <p className="text-sm text-slate-300 hidden sm:block">{clientEmail}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm bg-slate-900 px-4 py-2 rounded-lg border border-slate-800"
                        >
                            <LogOut size={16} /> Keluar
                        </button>
                    </div>
                </header>

                {/* Stats / Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <h3 className="text-slate-400 text-sm mb-1">Jadwal Mendatang</h3>
                        <p className="text-3xl font-bold text-white">{upcomingCount}</p>
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
                    <div className="space-y-8">
                        {/* Pending First */}
                        {pendingBookings.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={16} /> Menunggu Konfirmasi
                                </h3>
                                {pendingBookings.map(booking => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </section>
                        )}

                        {/* Confirmed / Upcoming (non-expired) */}
                        {upcomingBookings.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                    <Video size={16} /> Jadwal Akan Datang
                                </h3>
                                {upcomingBookings.map(booking => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </section>
                        )}

                        {/* Expired Sessions (approved but past 1 hour) */}
                        {expiredBookings.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle size={16} /> Sesi Berakhir
                                </h3>
                                {expiredBookings.map(booking => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </section>
                        )}

                        {/* History */}
                        {historyBookings.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <LogOut size={16} /> Selesai / Ditolak
                                </h3>
                                {historyBookings.map(booking => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </section>
                        )}

                        {/* Fallback / Unknown Status */}
                        {unknownBookings.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                                    ? Status Tidak Diketahui
                                </h3>
                                {unknownBookings.map(booking => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </section>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

function BookingCard({ booking }: { booking: Booking }) {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "rejected": return "text-red-400 bg-red-400/10 border-red-400/20";
            case "completed": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            default: return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        }
    };

    const expired = isExpired(booking.schedule_time);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col gap-4"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="text-slate-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{booking.psychologist_name}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                            <User size={12} /> {booking.client_name}
                        </p>
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
                        expired ? (
                            <span className="text-slate-500 text-sm font-medium px-4 py-2 border border-slate-700 rounded-lg bg-slate-800">
                                Sesi Berakhir
                            </span>
                        ) : (
                            <Link
                                href={`/session?room=${booking.room_id}&role=client`}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                            >
                                <Video size={16} /> Masuk Room
                            </Link>
                        )
                    )}
                </div>
            </div>

            {booking.complaint && (
                <div className="bg-slate-950/30 border border-slate-800 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Keluhan / Catatan:</p>
                    <p className="text-sm text-slate-400">"{booking.complaint}"</p>
                </div>
            )}

            {booking.session_notes && (
                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Catatan Psikolog:</p>
                    <p className="text-sm text-slate-300 italic">"{booking.session_notes}"</p>
                </div>
            )}

            {booking.status === 'rejected' && booking.rejection_reason && (
                <div className="bg-red-950/30 border border-red-800/30 p-4 rounded-lg">
                    <p className="text-xs text-red-400 font-bold mb-1 uppercase tracking-wider">Alasan Penolakan:</p>
                    <p className="text-sm text-red-300 italic">"{booking.rejection_reason}"</p>
                </div>
            )}
        </motion.div>
    );
}
