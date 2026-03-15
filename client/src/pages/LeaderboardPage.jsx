import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowLeft, Medal, Gamepad2, Target, Brush, Crown } from "lucide-react";
import { leaderAPI } from "../api";
import { useAuthStore } from "../store";

const RANK_META = {
  Novice:  { color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/20" },
  Skilled: { color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  Expert:  { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  Master:  { color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20" },
  Legend:  { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
};

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [players, setPlayers] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await leaderAPI.global({ page, limit: 50 });
        setPlayers(data.players);
        setTotalPages(data.pages);
      } catch (e) { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, [page]);

  useEffect(() => {
    if (user) {
      leaderAPI.me().then(({ rank }) => setMyRank(rank)).catch(() => {});
    }
  }, [user]);

  const topThree = players.slice(0, 3);
  const rest = players.slice(3);

  const winRate = (p) => p.stats.totalGames > 0
    ? Math.round((p.stats.gamesWon / p.stats.totalGames) * 100)
    : 0;

  const podiumOrder = topThree.length >= 3
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree;

  const podiumHeights = ["h-24", "h-36", "h-16"];
  const podiumColors = ["bg-gray-400/20 border-gray-400/30", "bg-arena-yellow/20 border-arena-yellow/40", "bg-amber-600/20 border-amber-600/30"];
  const podiumMedals = ["🥈", "🥇", "🥉"];

  return (
    <div className="min-h-screen bg-arena-gradient">
      {/* Header */}
      <header className="border-b border-arena-border/50 glass sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-arena-yellow" />
            <h1 className="font-display text-xl text-gradient">Global Leaderboard</h1>
          </div>
          {user && myRank && (
            <div className="ml-auto arena-card px-3 py-1.5 flex items-center gap-2 text-sm">
              <Medal size={14} className="text-arena-purple" />
              <span className="text-muted-foreground">Your rank:</span>
              <span className="font-bold text-arena-cyan">#{myRank}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-4 border-arena-purple/30 border-t-arena-purple rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Podium */}
            {topThree.length >= 3 && (
              <div className="mb-12">
                <h2 className="font-display text-center text-2xl text-muted-foreground mb-8 uppercase tracking-widest">
                  Hall of Champions
                </h2>
                <div className="flex items-end justify-center gap-6">
                  {podiumOrder.map((player, i) => {
                    const rank = RANK_META[player.stats.rank] || RANK_META.Novice;
                    return (
                      <div key={player._id} className="flex flex-col items-center">
                        {/* Crown for 1st */}
                        {i === 1 && <Crown size={24} className="text-arena-yellow mb-1 animate-float" />}

                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-display text-2xl mb-2 border-2 ${
                          i === 1 ? "bg-arena-yellow/20 border-arena-yellow/50" : "bg-arena-border/50 border-arena-border"
                        }`}>
                          {player.username[0].toUpperCase()}
                        </div>

                        <p className={`font-bold text-sm mb-0.5 ${i === 1 ? "text-arena-yellow" : ""}`}>{player.username}</p>
                        <p className="text-xs text-muted-foreground mb-2">{player.stats.totalScore.toLocaleString()} pts</p>
                        <span className={`rank-badge ${rank.bg} ${rank.color} border ${rank.border} text-xs mb-2`}>
                          {player.stats.rank}
                        </span>

                        {/* Podium block */}
                        <div className={`w-24 ${podiumHeights[i]} border ${podiumColors[i]} rounded-t-xl flex flex-col items-center justify-center transition-all`}>
                          <span className="text-3xl">{podiumMedals[i]}</span>
                          <span className="font-display text-lg font-bold">#{i === 1 ? 1 : i === 0 ? 2 : 3}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats legend */}
            <div className="grid grid-cols-4 gap-3 mb-6 text-xs text-center text-muted-foreground">
              <div className="arena-card p-2 flex items-center gap-1 justify-center">
                <Trophy size={12} className="text-arena-yellow" /> Score
              </div>
              <div className="arena-card p-2 flex items-center gap-1 justify-center">
                <Gamepad2 size={12} className="text-arena-purple" /> Games
              </div>
              <div className="arena-card p-2 flex items-center gap-1 justify-center">
                <Target size={12} className="text-arena-green" /> Win %
              </div>
              <div className="arena-card p-2 flex items-center gap-1 justify-center">
                <Brush size={12} className="text-arena-cyan" /> Drawn
              </div>
            </div>

            {/* Full table */}
            <div className="arena-card overflow-hidden">
              {players.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No players ranked yet. Be the first!</p>
                </div>
              ) : (
                <div className="divide-y divide-arena-border/30">
                  {players.map((player, globalIdx) => {
                    const rank = RANK_META[player.stats.rank] || RANK_META.Novice;
                    const isMe = user?.username === player.username;
                    const pos = player.rank;

                    return (
                      <div
                        key={player._id}
                        className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-arena-purple/5 ${isMe ? "bg-arena-cyan/5 border-l-2 border-arena-cyan" : ""}`}
                      >
                        {/* Rank number */}
                        <div className={`w-10 text-center font-display text-lg ${
                          pos === 1 ? "text-arena-yellow" : pos === 2 ? "text-gray-400" : pos === 3 ? "text-amber-600" : "text-muted-foreground"
                        }`}>
                          {pos <= 3 ? ["🥇","🥈","🥉"][pos-1] : `#${pos}`}
                        </div>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${rank.bg} border ${rank.border}`}>
                          {player.username[0].toUpperCase()}
                        </div>

                        {/* Name + rank */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm truncate ${isMe ? "text-arena-cyan" : ""}`}>
                              {player.username}
                              {isMe && <span className="text-xs ml-1 text-arena-cyan">(you)</span>}
                            </span>
                            <span className={`rank-badge ${rank.bg} ${rank.color} border ${rank.border} hidden sm:inline text-[10px]`}>
                              {player.stats.rank}
                            </span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4 text-right text-sm">
                          <div>
                            <div className="font-bold text-arena-yellow">{player.stats.totalScore.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground hidden md:block">pts</div>
                          </div>
                          <div className="hidden sm:block">
                            <div className="font-semibold">{player.stats.totalGames}</div>
                            <div className="text-xs text-muted-foreground">games</div>
                          </div>
                          <div className="hidden md:block">
                            <div className="font-semibold text-arena-green">{winRate(player)}%</div>
                            <div className="text-xs text-muted-foreground">wins</div>
                          </div>
                          <div className="hidden lg:block">
                            <div className="font-semibold text-arena-cyan">{player.stats.wordsDrawn}</div>
                            <div className="text-xs text-muted-foreground">drawn</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                >← Prev</button>
                <span className="arena-card px-4 py-2 text-sm flex items-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                >Next →</button>
              </div>
            )}

            {/* Rank legend */}
            <div className="mt-10 arena-card p-5">
              <h3 className="font-display text-base mb-4 text-muted-foreground uppercase tracking-widest">Rank Tiers</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(RANK_META).map(([name, meta]) => {
                  const thresholds = { Novice: "0", Skilled: "500", Expert: "2,000", Master: "5,000", Legend: "10,000" };
                  return (
                    <div key={name} className={`${meta.bg} border ${meta.border} rounded-xl p-3 text-center`}>
                      <p className={`font-bold text-sm ${meta.color}`}>{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{thresholds[name]}+ pts</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
