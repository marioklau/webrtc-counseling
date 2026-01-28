"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // For MVP, we'll implement a simple insecure check or a real API call later
        // Currently relying on backend to verify if we implement auth properly
        // For this prototype, if password is "password123", we let them in.

        if (password === "password123") {
            // Mock Success
            setTimeout(() => {
                // Save mock token & EMAIL
                localStorage.setItem("expert_token", "logged_in");
                localStorage.setItem("expert_email", email); // Save the email!
                router.push("/dashboard");
            }, 1000);
        } else {
            alert("Password salah! (Hint: password123)");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8"
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Login Psikolog</h1>
                    <p className="text-slate-400">Masuk untuk mengelola sesi konsultasi</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? "Memproses..." : (
                            <>
                                Masuk Dashboard <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500">
                    Lupa password? Hubungi administrator.
                </div>
            </motion.div>
        </main>
    );
}
