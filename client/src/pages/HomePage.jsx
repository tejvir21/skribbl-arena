import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Trophy, LogIn, UserPlus, Zap, Globe, Plus, RefreshCw, Users } from "lucide-react";
import { useAuthStore, useNotifStore } from "../store";
import { authAPI, roomAPI } from "../api";
import AuthModal from "../components/lobby/AuthModal";
import CreateRoomModal from "../components/lobby/CreateRoomModal";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, setAuth, clearAuth } = useAuthStore();
  const { addNotif } = useNotifStore();

  const [authModal, setAuthModal] = useState(null); // "login" | "register"
  const [createModal, setCreateModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningQuick, setJoiningQuick] = useState(false);

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const { rooms } = await roomAPI.list();
      setRooms(rooms);
    } catch (e) {
      addNotif({ type: "error", message: "Failed to fetch rooms" });
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // Auto-refresh every 30s so lobby stays live
    const id = setInterval(fetchRooms, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleGuestPlay = async () => {
    try {
      const { user, token } = await authAPI.guest({ username: "" });
      setAuth(user, token);
      addNotif({ type: "success", message: `Playing as ${user.username}` });
    } catch (e) {
      addNotif({ type: "error", message: "Failed to create guest session" });
    }
  };

  const handleQuickJoin = async () => {
    if (!user) { setAuthModal("login"); return; }
    setJoiningQuick(true);
    try {
      // Find a suitable room or create one
      const { rooms } = await roomAPI.list();
      if (rooms.length > 0) {
        navigate(`/game/${rooms[0].code}`);
      } else {
        const { room } = await roomAPI.create({});
        navigate(`/game/${room.code}`);
      }
    } catch (e) {
      addNotif({ type: "error", message: "Failed to quick join" });
    } finally {
      setJoiningQuick(false);
    }
  };

  const handleJoinCode = (e) => {
    e.preventDefault();
    if (!user) { setAuthModal("login"); return; }
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { addNotif({ type: "error", message: "Enter a valid room code" }); return; }
    navigate(`/game/${code}`);
  };

  const handleJoinRoom = (code) => {
    if (!user) { setAuthModal("login"); return; }
    navigate(`/game/${code}`);
  };

  const phaseLabel = (phase) => ({
    waiting: { label: "Waiting", color: "text-green-400" },
    drawing: { label: "In Game", color: "text-arena-yellow" },
    roundEnd: { label: "Round End", color: "text-arena-cyan" },
    gameEnd: { label: "Ended", color: "text-red-400" },
    starting: { label: "Starting", color: "text-arena-purple" },
  }[phase] || { label: phase, color: "text-gray-400" });

  return (
    <div className="min-h-screen bg-arena-gradient">
      {/* Header */}
      <header className="border-b border-arena-border/50 glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-arena-purple/20 border border-arena-purple/30 flex items-center justify-center text-2xl">
              🎨
            </div>
            <div>
              <h1 className="font-display text-xl text-gradient">Skribbl Arena</h1>
              <p className="text-xs text-muted-foreground">Draw. Guess. Dominate.</p>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <button onClick={() => navigate("/leaderboard")} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
              <Trophy size={16} className="text-arena-yellow" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="arena-card px-3 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-arena-purple/30 flex items-center justify-center text-sm">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold leading-none">{user.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.stats?.totalScore || 0} pts</p>
                  </div>
                </div>
                <button onClick={clearAuth} className="btn-secondary px-3 py-2 text-sm">Logout</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setAuthModal("login")} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
                  <LogIn size={15} /> Login
                </button>
                <button onClick={() => setAuthModal("register")} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                  <UserPlus size={15} /> Sign Up
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-arena-purple/10 border border-arena-purple/30 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-6 animate-float">
            <Zap size={14} className="text-arena-yellow" />
            Real-time multiplayer • Up to 8 players per room
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-gradient glow-text mb-4">
            SKRIBBL ARENA
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Draw words, guess fast, climb the ranks. The ultimate online drawing battle.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {!user && (
              <button onClick={handleGuestPlay} className="btn-secondary flex items-center gap-2">
                <Gamepad2 size={18} /> Play as Guest
              </button>
            )}
            <button onClick={handleQuickJoin} disabled={joiningQuick} className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
              <Zap size={18} />
              {joiningQuick ? "Finding room..." : "Quick Join"}
            </button>
            {user && (
              <button onClick={() => setCreateModal(true)} className="btn-secondary flex items-center gap-2">
                <Plus size={18} /> Create Room
              </button>
            )}
          </div>

          {/* Join by code */}
          <form onSubmit={handleJoinCode} className="flex gap-2 justify-center mt-6 max-w-xs mx-auto">
            <input
              className="input-field flex-1 text-center uppercase tracking-widest font-mono"
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <button type="submit" className="btn-primary px-4">Join</button>
          </form>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Active Rooms", value: rooms.length, icon: "🏠" },
            { label: "Players Online", value: rooms.reduce((a, r) => a + r.playerCount, 0), icon: "👥" },
            { label: "Games Today", value: "∞", icon: "🎮" },
            { label: "Total Players", value: "10K+", icon: "🌍" },
          ].map((s) => (
            <div key={s.label} className="arena-card p-4 text-center">
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="font-display text-2xl text-gradient">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Room browser */}
        <div className="arena-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl flex items-center gap-2">
              <Globe size={18} className="text-arena-cyan" />
              Public Rooms
            </h2>
            <button onClick={fetchRooms} disabled={roomsLoading} className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm">
              <RefreshCw size={14} className={roomsLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {roomsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-arena-purple/30 border-t-arena-purple rounded-full animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>No public rooms. Be the first to create one!</p>
              {user && (
                <button onClick={() => setCreateModal(true)} className="btn-primary mt-4">
                  <Plus size={16} className="inline mr-2" /> Create Room
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-arena-border/50">
                    <th className="text-left pb-3 pl-2">Room</th>
                    <th className="text-left pb-3">Players</th>
                    <th className="text-left pb-3">Status</th>
                    <th className="text-left pb-3">Category</th>
                    <th className="text-left pb-3">Round</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => {
                    const status = phaseLabel(room.phase);
                    return (
                      <tr key={room.code} className="border-b border-arena-border/30 room-row transition-colors">
                        <td className="py-3 pl-2">
                          <div className="font-semibold">{room.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{room.code}</div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Users size={13} className="text-muted-foreground" />
                            <span>{room.playerCount}/{room.maxPlayers}</span>
                          </div>
                          <div className="w-full bg-arena-border rounded-full h-1 mt-1 max-w-[60px]">
                            <div
                              className="bg-arena-purple rounded-full h-1 transition-all"
                              style={{ width: `${(room.playerCount / room.maxPlayers) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className={`py-3 font-medium ${status.color}`}>{status.label}</td>
                        <td className="py-3 capitalize text-muted-foreground">{room.category}</td>
                        <td className="py-3 text-muted-foreground">
                          {room.phase === "waiting" ? "—" : `${room.round}/${room.totalRounds}`}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => handleJoinRoom(room.code)}
                            disabled={room.playerCount >= room.maxPlayers}
                            className="btn-primary px-4 py-1.5 text-sm disabled:opacity-40"
                          >
                            Join
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            { icon: "⚡", title: "Real-time Canvas", desc: "Pixel-perfect synchronized drawing across all players with zero lag" },
            { icon: "🏆", title: "Ranked Leaderboard", desc: "Climb from Novice to Legend through ranked matches and tournaments" },
            { icon: "💡", title: "Smart Hints", desc: "Progressive letter reveals and close-guess detection keep the game fair and exciting" },
          ].map((f) => (
            <div key={f.title} className="arena-card p-5 hover:border-arena-purple/40 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display text-base mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
        />
      )}
      {createModal && (
        <CreateRoomModal
          onClose={() => setCreateModal(false)}
          onCreated={(code) => navigate(`/game/${code}`)}
        />
      )}
    </div>
  );
}
