"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function VideoRoom() {
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const params = useSearchParams();
  const room = params.get("room");

  useEffect(() => {
    if (!room) return;

    const startCall = async () => {
      socket.current = new WebSocket(
        `ws://localhost:8080/api/ws?room=${room}`
      );

      peer.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getTracks().forEach((track) => {
        peer.current!.addTrack(track, stream);
      });

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      peer.current.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0];
        }
      };

      peer.current.onicecandidate = (event) => {
        if (event.candidate && socket.current) {
          socket.current.send(
            JSON.stringify({
              type: "candidate",
              data: event.candidate,
            })
          );
        }
      };

      socket.current.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "offer") {
          await peer.current!.setRemoteDescription(msg.data);
          const answer = await peer.current!.createAnswer();
          await peer.current!.setLocalDescription(answer);

          socket.current!.send(
            JSON.stringify({
              type: "answer",
              data: answer,
            })
          );
        }

        if (msg.type === "answer") {
          await peer.current!.setRemoteDescription(msg.data);
        }

        if (msg.type === "candidate") {
          await peer.current!.addIceCandidate(msg.data);
        }
      };

      socket.current.onopen = async () => {
        const offer = await peer.current!.createOffer();
        await peer.current!.setLocalDescription(offer);

        socket.current!.send(
          JSON.stringify({
            type: "offer",
            data: offer,
          })
        );
      };
    };

    startCall();

    return () => {
      peer.current?.close();
      socket.current?.close();
    };
  }, [room]);

  return (
    <div className="grid grid-cols-2 h-screen bg-black">
      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
