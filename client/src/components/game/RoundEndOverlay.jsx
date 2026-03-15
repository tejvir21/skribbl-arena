import { useEffect, useState } from "react";
import { useGameStore } from "../../store";

const MEDALS = ["🥇","🥈","🥉"];

export default function RoundEndOverlay({ data }) {
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds  = useGameStore((s) => s.totalRounds);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      // Clear roundResults when overlay unmounts so it doesn't linger
      useGameStore.setState({ roundResults: null });
    };
  }, []);

  const sorted = [...(data.players || [])].sort((a, b) => b.score - a.score);
  const isLastRound = currentRound >= totalRounds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="arena-card p-6 max-w-md w-full mx-4 animate-slide-up">

        {/* Word reveal */}
        <div className="text-center mb-6">
          {data.reason === "drawer_left" ? (
            <>
              <div className="text-5xl mb-2">💨</div>
              <h2 className="font-display text-2xl text-arena-yellow">Drawer disconnected!</h2>
              <p className="text-sm text-muted-foreground mt-1">Skipping to next round…</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">🎯</div>
              <p className="text-muted-foreground text-sm mb-1">The word was</p>
              <h2 className="font-display text-4xl text-gradient-pink tracking-widest uppercase">
                {data.word}
              </h2>
              <p className="text-muted-foreground text-xs mt-2">
                Round {currentRound} / {totalRounds}
              </p>
            </>
          )}
        </div>

        {/* Scores */}
        <div className="space-y-1.5 mb-5 max-h-52 overflow-y-auto no-scrollbar">
          {sorted.slice(0, 8).map((player, idx) => (
            <div key={player.userId || idx} className="flex items-center gap-3 bg-arena-dark/60 rounded-xl px-3 py-2">
              <span className="text-lg w-7 text-center">{MEDALS[idx] || `#${idx + 1}`}</span>
              <span className="flex-1 text-sm font-semibold truncate">{player.username}</span>
              <span className="font-mono text-sm font-bold text-arena-cyan">
                {player.score.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            {isLastRound ? "Game ending" : "Next round"} in{" "}
            <span className={`font-bold text-xl ${countdown <= 2 ? "text-red-400" : "text-arena-cyan"}`}>
              {countdown}
            </span>
            s
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: countdown }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-arena-purple transition-all" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
