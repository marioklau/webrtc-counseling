"use client";

import { useRouter } from "next/navigation";

export default function BookingPage() {
  const router = useRouter();

  const handleBooking = async () => {
    const res = await fetch("http://localhost:3000/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counselor_id: "1",
        start_time: new Date().toISOString(),
      }),
    });

    const data = await res.json();
    router.push(`/waiting-room?room=${data.room_id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white shadow rounded-lg p-8 w-96">
        <h2 className="text-xl font-semibold mb-4">Booking Konselor</h2>

        <button
          onClick={handleBooking}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Booking Sekarang
        </button>
      </div>
    </main>
  );
}
