"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function WaitingRoomPage() {
  const params = useSearchParams();
  const router = useRouter();
  const room = params.get("room");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-2">Waiting Room</h1>
      <p className="mb-6">Room ID: {room}</p>

      <button
        onClick={() => router.push(`/session?room=${room}`)}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Masuk Sesi Konseling
      </button>
    </main>
  );
}
