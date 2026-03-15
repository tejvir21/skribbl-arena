import { RotateCcw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GameEndOverlay({ data, myPlayerId, onPlayAgain }) {
  const navigate = useNavigate();
  const { players, winner } = data;
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const iWon = winner?.userId === myPlayerId;

  const medals = ["🥇", "🥈", "🥉"];
  const rankColors = [
    "border-arena-yellow/40 bg-arena-yellow/5",
    "border-gray-400/30 bg-gray-400/5",
    "border-amber-600/30 bg-amber-600/5",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="arena-card p-8 max-w-lg w-full mx-4 animate-bounce-in">
        {/* Winner banner */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-float">
            {iWon ? "🏆" : "🎮"}
          </div>
          <h2 className="font-display text-4xl text-gradient mb-1">
            {iWon ? "You Won!" : "Game Over!"}
          </h2>
          {winner && (
            <p className="text-muted-foreground">
              <span className="text-arena-yellow font-semibold">{winner.username}</span> takes the crown with{" "}
              <span className="text-arena-cyan font-bold">{winner.score} pts</span>
            </p>
          )}
        </div>

        {/* Podium - top 3 */}
        {sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-6">
            {/* 2nd */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-400/20 flex items-center justify-center font-bold text-lg mb-1">
                {sorted[1]?.username[0]?.toUpperCase()}
              </div>
              <div className="text-xs font-semibold">{sorted[1]?.username}</div>
              <div className="text-xs text-muted-foreground">{sorted[1]?.score}pts</div>
              <div className="w-16 h-12 bg-gray-400/20 border border-gray-400/30 rounded-t-lg flex items-center justify-center mt-1">🥈</div>
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-arena-yellow/30 border-2 border-arena-yellow/50 flex items-center justify-center font-bold text-xl mb-1 animate-pulse-glow">
                {sorted[0]?.username[0]?.toUpperCase()}
              </div>
              <div className="text-sm font-bold text-arena-yellow">{sorted[0]?.username}</div>
              <div className="text-xs text-arena-yellow">{sorted[0]?.score}pts</div>
              <div className="w-16 h-20 bg-arena-yellow/20 border border-arena-yellow/40 rounded-t-lg flex items-center justify-center mt-1">🥇</div>
            </div>
            {/* 3rd */}
            {sorted[2] && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center font-bold text-lg mb-1">
                  {sorted[2]?.username[0]?.toUpperCase()}
                </div>
                <div className="text-xs font-semibold">{sorted[2]?.username}</div>
                <div className="text-xs text-muted-foreground">{sorted[2]?.score}pts</div>
                <div className="w-16 h-8 bg-amber-600/20 border border-amber-600/30 rounded-t-lg flex items-center justify-center mt-1">🥉</div>
              </div>
            )}
          </div>
        )}

        {/* Full scoreboard */}
        <div className="space-y-2 mb-6 max-h-48 overflow-y-auto no-scrollbar">
          {sorted.map((player, idx) => (
            <div
              key={player.userId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${
                idx < 3 ? rankColors[idx] : "border-arena-border/30 bg-arena-dark/30"
              } ${player.userId === myPlayerId ? "ring-1 ring-arena-cyan/30" : ""}`}
            >
              <span className="text-xl w-8 text-center">{medals[idx] || `#${idx + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${player.userId === myPlayerId ? "text-arena-cyan" : ""}`}>
                  {player.username}
                  {player.userId === myPlayerId && " (you)"}
                </p>
              </div>
              <div className="font-mono text-sm font-bold text-foreground">
                {player.score.toLocaleString()} pts
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate("/")} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Home size={16} /> Home
          </button>
          <button onClick={onPlayAgain} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
