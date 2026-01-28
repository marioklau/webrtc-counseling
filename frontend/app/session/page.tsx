"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import VideoRoom from "../../components/VideoRoom";
import { ArrowLeft } from "lucide-react";

export default function SessionPage() {
  const searchParams = useSearchParams();
  const roomID = searchParams.get("room");
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Basic check: Ensure room ID exists
    if (!roomID) {
      alert("Room ID tidak valid or hilang.");
      router.push("/");
      return;
    }

    // Check if user is logged in (either Client or Expert)
    const clientEmail = localStorage.getItem("client_email");
    const expertToken = localStorage.getItem("expert_token");

    if (!clientEmail && !expertToken) {
      alert("Anda tidak memiliki akses ke sesi ini. Silakan login.");
      router.push("/client-login"); // Or generic login
      return;
    }

    setAuthorized(true);
  }, [roomID, router]);

  if (!authorized) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Memeriksa akses...</div>;

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

      {roomID && <VideoRoom roomID={roomID} />}
    </main>
  );
}
