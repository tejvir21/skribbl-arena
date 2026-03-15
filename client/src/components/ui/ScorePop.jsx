import { useEffect, useState } from "react";
import { useGameStore } from "../../store";

/**
 * Floating +points animations.
 * Subscribes to player score changes via Zustand.
 */
export default function ScorePop() {
  const [pops, setPops] = useState([]);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  useEffect(() => {
    let prevPlayers = useGameStore.getState().players;

    const unsub = useGameStore.subscribe((state) => {
      const nextPlayers = state.players;
      nextPlayers.forEach((player) => {
        const prev = prevPlayers.find((p) => p.userId === player.userId);
        if (prev && player.score > prev.score) {
          const delta = player.score - prev.score;
          const isMe  = player.userId === myPlayerId;
          const id    = `${Date.now()}-${Math.random()}`;
          setPops((p) => [...p.slice(-5), { id, delta, isMe, username: player.username }]);
          setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1400);
        }
      });
      prevPlayers = nextPlayers;
    });

    return unsub;
  }, [myPlayerId]);

  if (pops.length === 0) return null;

  return (
    <>
      {pops.map((pop) => (
        <div
          key={pop.id}
          className="fixed pointer-events-none z-[200] font-display font-bold select-none"
          style={{
            fontSize: pop.isMe ? "2rem" : "1.25rem",
            color:    pop.isMe ? "#06B6D4" : "#10B981",
            left:     pop.isMe ? "50%" : "auto",
            right:    pop.isMe ? "auto" : "5rem",
            top:      pop.isMe ? "35%" : "55%",
            transform: pop.isMe ? "translateX(-50%)" : "none",
            animation: "scorePop 1.3s ease-out forwards",
          }}
        >
          +{pop.delta}{pop.isMe && <span className="text-base ml-1 text-white opacity-80">pts!</span>}
        </div>
      ))}
    </>
  );
}
