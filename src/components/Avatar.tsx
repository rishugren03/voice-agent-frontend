"use client";

import { useEffect, useRef } from "react";

interface Props {
  amplitudeRef: React.RefObject<number>;
  isSpeaking: boolean;
  callState: "idle" | "connecting" | "connected" | "ended";
}

export function Avatar({ amplitudeRef, isSpeaking, callState }: Props) {
  const mouthRef = useRef<SVGEllipseElement>(null);
  const smileRef = useRef<SVGPathElement>(null);
  const rafRef = useRef(0);
  const smoothRef = useRef(0); // smoothed amplitude 0–1

  // Drive mouth animation from actual audio amplitude via rAF
  useEffect(() => {
    function loop() {
      const raw = amplitudeRef.current ?? 0;
      // Smooth toward raw amplitude
      smoothRef.current += (raw - smoothRef.current) * 0.25;
      const s = smoothRef.current;

      if (mouthRef.current && smileRef.current) {
        if (s > 0.05) {
          // Open mouth: ellipse grows with amplitude
          const ry = 2 + s * 14; // 2–16px
          mouthRef.current.setAttribute("ry", String(ry.toFixed(1)));
          mouthRef.current.style.display = "";
          smileRef.current.style.display = "none";
        } else {
          mouthRef.current.style.display = "none";
          smileRef.current.style.display = "";
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [amplitudeRef]);

  const isActive = callState === "connected";
  const isConnecting = callState === "connecting";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 176, height: 176 }}>
      {/* Speaking pulse rings */}
      {isActive && isSpeaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-indigo-300 animate-ping-slower pointer-events-none" />
          <span className="absolute inset-3 rounded-full bg-indigo-200 animate-ping-slow pointer-events-none" />
        </>
      )}
      {isConnecting && (
        <span className="absolute inset-0 rounded-full bg-indigo-200 animate-ping pointer-events-none" />
      )}

      {/* Avatar face — pure SVG, always renders */}
      <svg
        width="176"
        height="176"
        viewBox="0 0 176 176"
        className={`relative z-10 rounded-full transition-all duration-300 ${
          isActive && isSpeaking
            ? "drop-shadow-[0_0_18px_rgba(99,102,241,0.55)]"
            : "drop-shadow-lg"
        }`}
      >
        <defs>
          <radialGradient id="bgGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#3730a3" />
          </radialGradient>
          <radialGradient id="faceGrad" cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#fde9c9" />
            <stop offset="100%" stopColor="#dba87a" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle cx="88" cy="88" r="88" fill="url(#bgGrad)" />

        {/* Face */}
        <ellipse cx="88" cy="96" rx="58" ry="62" fill="url(#faceGrad)" />

        {/* Left eye white */}
        <ellipse cx="68" cy="78" rx="9" ry="10" fill="white" />
        {/* Left iris */}
        <circle cx="68" cy="80" r="5.5" fill="#3730a3" />
        {/* Left pupil */}
        <circle cx="68" cy="80" r="2.8" fill="#111" />
        {/* Left highlight */}
        <circle cx="70" cy="77" r="1.5" fill="white" />

        {/* Right eye white */}
        <ellipse cx="108" cy="78" rx="9" ry="10" fill="white" />
        {/* Right iris */}
        <circle cx="108" cy="80" r="5.5" fill="#3730a3" />
        {/* Right pupil */}
        <circle cx="108" cy="80" r="2.8" fill="#111" />
        {/* Right highlight */}
        <circle cx="110" cy="77" r="1.5" fill="white" />

        {/* Closed smile (shown when not speaking) */}
        <path
          ref={smileRef}
          d="M72 110 Q88 122 104 110"
          stroke="#7c5c3a"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Open mouth (amplitude-driven, hidden by default) */}
        <ellipse
          ref={mouthRef}
          cx="88"
          cy="112"
          rx="16"
          ry="2"
          fill="#3d1f0d"
          style={{ display: "none" }}
        />
      </svg>

      {/* Listening wave bars */}
      {isActive && !isSpeaking && (
        <div className="absolute -bottom-6 flex items-end gap-[3px]">
          {[0.3, 0.6, 1, 0.7, 0.4, 0.8, 0.5].map((delay, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-indigo-400 wave-bar"
              style={{ height: `${8 + i * 2}px`, animationDelay: `${delay * 0.4}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
