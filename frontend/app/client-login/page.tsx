"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowRight, User, Lock } from "lucide-react";

export default function ClientLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const res = await fetch(`${protocol}//${host}:8080/api/public/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Login gagal");
                setLoading(false);
                return;
            }

            // Success - Save Session
            localStorage.setItem("client_email", data.email);
            localStorage.setItem("client_name", data.name);
            router.push("/dashboard/client");

        } catch (err) {
            console.error(err);
            alert("Gagal menghubungi server. Pastikan backend backend berjalan.");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="text-sky-500 w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Masuk sebagai Klien</h1>
                    <p className="text-slate-400 text-sm mt-2">
                        Masuk untuk melihat riwayat konsultasi.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {/* Note: Name input is removed as we fetch it from DB on login */}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-sky-500 outline-none"
                                placeholder="nama@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-sky-500 outline-none"
                                placeholder="Password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
                    >
                        {loading ? "Memproses..." : (
                            <>
                                Masuk Dashboard <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </main>
    );
}
