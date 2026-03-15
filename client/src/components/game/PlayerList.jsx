import { Crown, Pencil, Check, WifiOff, Eye } from "lucide-react";
import { useGameStore } from "../../store";
import { useMyPlayer, useSortedPlayers } from "../../hooks/useGame";

const AVATAR_BG = [
  "bg-violet-500/30", "bg-cyan-500/30", "bg-pink-500/30",
  "bg-amber-500/30", "bg-emerald-500/30", "bg-red-500/30",
  "bg-blue-500/30",  "bg-orange-500/30",
];

export default function PlayerList() {
  const currentDrawerId = useGameStore((s) => s.currentDrawerId);
  const myPlayerId      = useGameStore((s) => s.myPlayerId);
  const hostId          = useGameStore((s) => s.hostId);
  const phase           = useGameStore((s) => s.phase);
  const isSpectator     = useGameStore((s) => s.isSpectator);

  const sorted = useSortedPlayers().filter((p) => p.isOnline);

  return (
    <div className="arena-card p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Crown size={13} className="text-arena-yellow" />
        <h3 className="font-display text-xs text-muted-foreground uppercase tracking-widest">
          Players ({sorted.length})
        </h3>
      </div>

      {/* List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
        {sorted.map((player, idx) => {
          const isMe      = player.userId === myPlayerId;
          const isDrawer  = player.userId === currentDrawerId;
          const isHost    = player.userId === hostId;
          const bgColor   = AVATAR_BG[idx % AVATAR_BG.length];
          const drawing   = isDrawer && phase === "drawing";
          const guessed   = player.hasGuessed && phase === "drawing" && !isDrawer;

          return (
            <div
              key={player.userId}
              className={`
                flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-300
                ${drawing ? "border-arena-yellow/40 bg-arena-yellow/5 shadow-[0_0_12px_rgba(245,158,11,0.15)]" : ""}
                ${guessed ? "border-arena-green/30 bg-arena-green/5" : ""}
                ${!drawing && !guessed ? "border-arena-border/40 bg-arena-dark/40" : ""}
                ${isMe ? "ring-1 ring-arena-cyan/20" : ""}
              `}
            >
              {/* Position */}
              <span className="text-xs text-muted-foreground font-mono w-4 text-center select-none">
                {idx + 1}
              </span>

              {/* Avatar */}
              <div className={`relative w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                {player.username[0].toUpperCase()}
                {isHost && (
                  <span className="absolute -top-1.5 -right-1.5 text-[10px]">👑</span>
                )}
              </div>

              {/* Name + score */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate leading-tight ${isMe ? "text-arena-cyan" : "text-foreground"}`}>
                  {player.username}
                  {isMe && <span className="opacity-60"> (you)</span>}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                  {player.score.toLocaleString()} pts
                </p>
              </div>

              {/* Status icons */}
              <div className="flex-shrink-0">
                {drawing && <Pencil size={12} className="text-arena-yellow animate-pulse" />}
                {guessed && <Check  size={12} className="text-arena-green" />}
                {!player.isOnline && <WifiOff size={12} className="text-red-400" />}
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8 opacity-40">
            No players yet
          </div>
        )}
      </div>

      {/* Spectator indicator */}
      {isSpectator && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-500/10 rounded-lg px-3 py-2 border border-gray-500/20">
          <Eye size={12} /> Spectating
        </div>
      )}
    </div>
  );
}
