"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, MonitorUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SignalMessage =
  | { type: "join" }
  | { type: "peer-joined" }
  | { type: "offer"; data: RTCSessionDescriptionInit }
  | { type: "answer"; data: RTCSessionDescriptionInit }
  | { type: "candidate"; data: RTCIceCandidateInit }
  | { type: "full" }
  | { type: "peer-left" };

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ],
};

type Props = {
  roomID: string;
  userRole: "client" | "expert";
};

export default function VideoRoom({ roomID, userRole }: Props) {
  const router = useRouter();
  const room = roomID;
  // ... (rest of component)


  const [hasJoined, setHasJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "waiting" | "connected" | "disconnected">("connecting");
  const [error, setError] = useState<string | null>(null);


  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Bug Fix: Attach remote stream to video element when it renders
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Log removed
    }
  }, [remoteStream]);

  // Cleanup helper
  const cleanup = () => {
    socketRef.current?.close();
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
  };

  const cleanupPeer = () => {
    peerRef.current?.close();
    peerRef.current = null;
    iceCandidatesQueue.current = [];
  };

  // Peer Connection Logic
  const createPeer = () => {
    if (peerRef.current) {
      if (peerRef.current.signalingState === 'closed') {

        peerRef.current = null;
      } else {
        return peerRef.current;
      }
    }



    const peer = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = peer;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {

        peer.addTrack(track, localStreamRef.current!);
      });
    } else {

      // Critical: Ensure SDP has media sections so we can RECEIVE even if we don't send.
      peer.addTransceiver('audio', { direction: 'recvonly' });
      peer.addTransceiver('video', { direction: 'recvonly' });
    }

    peer.ontrack = (event) => {

      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnectionStatus("connected");
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {

        socketRef.current.send(JSON.stringify({
          type: "candidate",
          data: event.candidate,
        }));
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;

      if (state === 'connected') {
        setConnectionStatus("connected");

      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionStatus("disconnected");

      }
    };

    peer.oniceconnectionstatechange = () => {

    };

    return peer;
  };

  const processIceQueue = async () => {
    const peer = peerRef.current;
    if (!peer) return;

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Suppress warning
        }
      }
    }
  };

  const handleCandidate = async (candidate: RTCIceCandidateInit) => {
    const peer = peerRef.current;
    if (!peer || !peer.remoteDescription) {

      iceCandidatesQueue.current.push(candidate);
      return;
    }
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Suppress benign warnings
      // console.error("Error adding candidate:", err);
    }
  };

  const createOffer = async () => {
    const peer = createPeer();

    // Guard: Don't create offer if we are already processing or stable
    if (peer.signalingState !== 'stable') {

      return;
    }

    try {

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "offer",
          data: offer,
        }));
      }
    } catch (err) {
      console.error("Error creating offer:", err);

    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const peer = createPeer();

    // Guard: If we are already connecting or connected, check if we should process this offer
    // (Simple concurrency handling: Collision logic is complex, for now we just try to proceed or ignore if stable and we are the impolite peer? 
    // Actually, simply checking for 'stable' isn't enough because renegotiation starts from 'stable'.
    // But if we receive duplicate offers, we might want to check the SDP.)

    try {
      if (peer.signalingState !== "stable" && peer.signalingState !== "have-remote-offer") {
        // If we are in 'have-local-offer', we have a collision.
        // For simplicity in this lab, we can ignore if we are the initiator (polite/impolite role not strictly defined yet).
        // But to avoid the crash, let's just log warning.

      }


      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "answer",
          data: answer,
        }));
      }
      await processIceQueue();
    } catch (err) {
      // Completely suppress InvalidStateError from console to avoid confusion
      if (err instanceof Error && err.name === 'InvalidStateError') {

      } else {
        console.error("Error handling offer:", err);

      }
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    const peer = peerRef.current;
    if (!peer) return;

    // Guard: If we are already stable, we don't need to set remote answer (it's done).
    if (peer.signalingState === 'stable') {

      return;
    }

    try {

      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      await processIceQueue();
    } catch (err) {
      if (err instanceof Error && err.name === 'InvalidStateError') {

      } else {
        console.error("Error handling answer:", err);

      }
    }
  };



  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ... (existing code)

  const startCamera = async () => {
    if (!isMountedRef.current) return false;
    try {
      // Defensive check for Insecure Context (HTTP on non-localhost)
      // On some browsers (Chrome), navigator.mediaDevices is undefined in insecure contexts
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isSecure = window.isSecureContext;
        if (!isSecure) {
          throw new Error("Gagal mengakses kamera: Browser memblokir akses di koneksi tidak aman (HTTP). Harap gunakan localhost atau aktifkan flag browser 'Insecure origins treated as secure'.");
        }
        throw new Error(`API Camera Missing. Secure=${isSecure}`);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Apply initial mute/camera off state
      stream.getAudioTracks().forEach(track => track.enabled = false);
      stream.getVideoTracks().forEach(track => track.enabled = false);

      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return false;
      }

      localStreamRef.current = stream;

      const setVideoSrc = () => {
        if (!isMountedRef.current) return;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
        } else {
          setTimeout(setVideoSrc, 100);
        }
      };
      setVideoSrc();

      return true;
    } catch (err) {
      if (!isMountedRef.current) return false;
      console.error("Camera Error:", err);

      let msg = "Gagal mengakses kamera. Silakan klik tombol 'Nyalakan Kamera'.";
      if (err instanceof Error) {
        // Use the specific error message if it's one we know
        if (err.message.includes("Gagal mengakses kamera") || err.message.includes("API Camera Missing")) {
          msg = err.message;
        }
      }
      setError(msg);
      return false;
    }
  };

  const connectWebSocket = () => {
    if (!isMountedRef.current) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;

    const ws = new WebSocket(`${protocol}//${host}:8080/api/ws?room=${room}`);

    ws.onopen = () => {
      socketRef.current = ws;
      setConnectionStatus("waiting");

    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data) as SignalMessage;


      switch (msg.type) {
        case "full":
          setError("Ruangan penuh (Maksimal 2 orang).");
          setConnectionStatus("disconnected"); // Ensure UI reflects disconnection
          ws.close();
          break;

        case "peer-joined":
          setConnectionStatus("connecting");
          createOffer();
          break;

        case "offer":
          handleOffer(msg.data);
          break;

        case "answer":
          handleAnswer(msg.data);
          break;

        case "candidate":
          handleCandidate(msg.data);
          break;

        case "peer-left":
          setRemoteStream(null);
          setConnectionStatus("disconnected");
          cleanupPeer();

          break;
      }
    };

    ws.onerror = () => {
      setError("Gagal terhubung ke server (WebSocket Error). Pastikan Backend berjalan.");

    };

    ws.onclose = () => {

    };
  };

  useEffect(() => {
    if (!room) {
      setError("Room ID is missing.");
      return;
    }

    const autoInit = async () => {
      // Check Secure Context
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && !window.isSecureContext) {

      }

      // Small delay to prevent browser race conditions on refresh
      await new Promise(r => setTimeout(r, 500));

      if (!isMountedRef.current) return;

      const cameraSuccess = await startCamera();

      // Always connect to WS, even if camera failed (allow receive-only)
      if (isMountedRef.current) {
        if (!cameraSuccess) {
          console.warn("WARN: Camera failed, entering Receive-Only mode");
        }
        connectWebSocket();
      }
    };

    autoInit();

    return () => {
      cleanup();
    };
  }, [room]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <div className="relative h-screen w-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Error Message */}
      {error && (
        <div className="absolute top-10 z-50 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          {error}
        </div>
      )}

      {/* Debug Overlay */}


      {/* Main Video Area (Remote or Waiting State) */}
      <div className="relative w-full h-full max-w-6xl aspect-video bg-black/50 rounded-2xl overflow-hidden shadow-2xl border border-white/10">

        {/* Remote Video */}
        {remoteStream ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Connected badge */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Terhubung
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/50 space-y-4">
            {/* Status Badge */}
            <div className={`px-4 py-1 rounded-full text-xs font-medium ${connectionStatus === "waiting" ? "bg-sky-600/20 text-sky-400" :
              connectionStatus === "connecting" ? "bg-yellow-600/20 text-yellow-400" :
                "bg-slate-700 text-slate-400"
              }`}>
              Status: {connectionStatus}
            </div>

            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-sky-500/20"></div>
              <div className="bg-slate-800 p-6 rounded-full">
                <User className="w-12 h-12 text-sky-500" />
              </div>
            </div>
            <p className="text-xl font-medium">
              {connectionStatus === "waiting" && "Menunggu partisipan lain..."}
              {connectionStatus === "connecting" && "Menghubungkan..."}
              {connectionStatus === "connected" && "Menunggu video stream..."}
              {connectionStatus === "disconnected" && "Partisipan keluar"}
            </p>
            {!localStreamRef.current && (
              <button
                onClick={() => {
                  startCamera().then(success => {
                    if (success) connectWebSocket();
                  });
                }}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Nyalakan Kamera
              </button>
            )}
          </div>
        )}

        {/* Local Video (PiP) */}
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          className="absolute top-4 right-4 w-48 aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-lg border border-white/20 cursor-grab active:cursor-grabbing z-10"
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={cn("w-full h-full object-cover mirror", isCameraOff && "hidden")}
          />
          {isCameraOff && (
            <div className="w-full h-full flex items-center justify-center text-white/50">
              <VideoOff className="w-8 h-8" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded">
            Anda
          </div>
        </motion.div>
      </div>

      {/* Controls Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="absolute bottom-8 flex items-center gap-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-2xl z-20"
      >
        <button
          onClick={toggleMute}
          className={cn(
            "p-4 rounded-full transition-all duration-200",
            isMuted ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleCamera}
          className={cn(
            "p-4 rounded-full transition-all duration-200",
            isCameraOff ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <div className="w-px h-8 bg-white/10 mx-2" />

        <button
          onClick={() => {
            cleanup();
            // Redirect to appropriate dashboard based on trusted role
            if (userRole === "expert") {
              router.push("/dashboard");
            } else {
              router.push("/dashboard/client");
            }
          }}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-600/20"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </motion.div>
    </div>
  );
}
