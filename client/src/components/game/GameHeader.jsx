import { ArrowLeft, Clock, Lightbulb, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useGameStore } from "../../store";
import { useTimerColor, useTimerClass } from "../../hooks/useGame";

export default function GameHeader({ roomCode, onLeave }) {
  const phase         = useGameStore((s) => s.phase);
  const currentRound  = useGameStore((s) => s.currentRound);
  const totalRounds   = useGameStore((s) => s.totalRounds);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const drawTime      = useGameStore((s) => s.drawTime);
  const drawerName    = useGameStore((s) => s.currentDrawerName);
  const hint          = useGameStore((s) => s.hint);

  const timerColor = useTimerColor();
  const timerClass = useTimerClass();
  const timerPct   = drawTime > 0 ? (timeRemaining / drawTime) * 100 : 0;

  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-arena-border/50 glass z-30 sticky top-0">
      {/* Main bar */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Leave */}
        <button
          onClick={onLeave}
          className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-sm flex-shrink-0"
        >
          <ArrowLeft size={15} /> Leave
        </button>

        {/* Room code */}
        <button
          onClick={copyCode}
          title="Copy room code"
          className="hidden sm:flex items-center gap-2 arena-card px-3 py-1.5 hover:border-arena-purple/40 transition-colors flex-shrink-0"
        >
          <span className="font-mono text-sm font-bold text-arena-cyan tracking-widest">{roomCode}</span>
          {copied
            ? <Check size={13} className="text-arena-green" />
            : <Copy  size={13} className="text-muted-foreground" />}
        </button>

        {/* Center info */}
        <div className="flex-1 text-center min-w-0">
          {phase === "drawing" && (
            <p className="text-xs text-muted-foreground truncate">
              Round <span className="text-foreground font-semibold">{currentRound}/{totalRounds}</span>
              {" · "}
              <span className="text-arena-yellow">✏️ {drawerName}</span>
              {" "}is drawing
            </p>
          )}
          {phase === "waiting" && (
            <p className="font-display text-base text-gradient">Waiting for players…</p>
          )}
          {phase === "starting" && (
            <p className="font-display text-base text-arena-yellow animate-pulse">Get Ready!</p>
          )}
          {phase === "roundEnd" && (
            <p className="font-display text-base text-arena-cyan">Round over!</p>
          )}
          {phase === "gameEnd" && (
            <p className="font-display text-base text-gradient">Game finished!</p>
          )}
        </div>

        {/* Timer */}
        {phase === "drawing" && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock size={15} style={{ color: timerColor }} />
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="absolute inset-0" width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke={timerColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerPct / 100)}`}
                  transform="rotate(-90 24 24)"
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                />
              </svg>
              <span className={`font-display text-xl font-bold z-10 ${timerClass}`}>
                {timeRemaining}
              </span>
            </div>
          </div>
        )}

        {/* Hint indicator */}
        {hint && phase === "drawing" && (
          <div className="hidden md:flex items-center gap-1 text-xs text-arena-yellow bg-arena-yellow/10 border border-arena-yellow/20 rounded-lg px-2 py-1 flex-shrink-0">
            <Lightbulb size={12} /> Hint
          </div>
        )}
      </div>

      {/* Progress bar */}
      {phase === "drawing" && (
        <div className="h-0.5 bg-arena-border/50">
          <div
            className="h-full"
            style={{
              width: `${timerPct}%`,
              backgroundColor: timerColor,
              transition: "width 1s linear, background-color 0.3s",
            }}
          />
        </div>
      )}
    </header>
  );
}
