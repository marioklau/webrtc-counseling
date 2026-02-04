"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import VideoRoom from "../../components/VideoRoom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function SessionPage() {
  const searchParams = useSearchParams();
  const roomID = searchParams.get("room");
  const roleParam = searchParams.get("role");
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"client" | "expert" | null>(null);

  useEffect(() => {
    // Basic check: Ensure room ID exists
    if (!roomID) {
      alert("Room ID tidak valid atau hilang.");
      router.push("/");
      return;
    }

    // Check if user is logged in (either Client or Expert)
    const clientEmail = localStorage.getItem("client_email");
    const expertToken = localStorage.getItem("expert_token");

    let role: "client" | "expert" | null = null;

    // Prioritize query param if valid
    if (roleParam === "expert" && expertToken) {
      role = "expert";
    } else if (roleParam === "client" && clientEmail) {
      role = "client";
    } else {
      // Fallback if no param or param doesn't match auth
      if (expertToken) role = "expert";
      else if (clientEmail) role = "client";
    }

    if (!role) {
      alert("Anda tidak memiliki akses ke sesi ini. Silakan login.");
      router.push("/client-login");
      return;
    }

    // Check room validity (expiry check)
    const checkRoomValidity = async () => {
      try {
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const res = await fetch(`${protocol}//${host}:8080/api/public/room-status/${roomID}`);

        if (!res.ok) {
          setExpired(true);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!data.valid) {
          setExpired(true);
          setLoading(false);
          return;
        }

        // Check if session is within 1 hour of scheduled time
        const scheduleTime = new Date(data.schedule_time);
        const now = new Date();
        const diffInHours = (now.getTime() - scheduleTime.getTime()) / (1000 * 60 * 60);

        // Session expired if more than 1 hour has passed since scheduled time
        if (diffInHours > 1) {
          setExpired(true);
          setLoading(false);
          return;
        }

        // All checks passed
        setAuthorized(true);
        setUserRole(role);
        setLoading(false);
      } catch (err) {
        console.error("Failed to check room status:", err);
        // Allow access on error (fallback to permissive)
        setAuthorized(true);
        setLoading(false);
      }
    };

    checkRoomValidity();
  }, [roomID, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        Memeriksa status sesi...
      </div>
    );
  }

  if (expired) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sesi Telah Berakhir</h1>
          <p className="text-slate-400 mb-6">
            Sesi konsultasi ini sudah melewati batas waktu (1 jam setelah jadwal).
            Silakan hubungi psikolog untuk menjadwalkan ulang.
          </p>
          <button
            onClick={() => router.push("/dashboard/client")}
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        Memeriksa akses...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black relative">
      {/* Simple Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => router.back()}
          className="bg-slate-900/50 hover:bg-slate-800 text-white p-2 rounded-full backdrop-blur-sm transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {roomID && userRole && <VideoRoom roomID={roomID} userRole={userRole} />}
    </main>
  );
}
