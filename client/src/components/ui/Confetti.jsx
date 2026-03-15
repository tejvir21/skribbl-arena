import { useEffect, useState } from "react";

const COLORS = ["#7C3AED", "#EC4899", "#06B6D4", "#F59E0B", "#10B981", "#FF6B6B", "#FFE66D"];

function Particle({ x, color, delay, size, rotation }) {
  return (
    <div
      className="confetti-particle"
      style={{
        left: `${x}%`,
        top: "-20px",
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${1.5 + Math.random()}s`,
        transform: `rotate(${rotation}deg)`,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      }}
    />
  );
}

export default function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 1.5,
      size: 6 + Math.random() * 10,
      rotation: Math.random() * 360,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
    </div>
  );
}
