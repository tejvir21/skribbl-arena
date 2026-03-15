import { useState, useEffect } from "react";
import { Settings, Play, Crown, Users, Clock, Layers, Tag, Plus, X, Copy, Check } from "lucide-react";
import { emit } from "../../socket";
import { useGameStore } from "../../store";

const CATEGORIES = [
  { id: "general",  label: "General",         emoji: "🌐" },
  { id: "animals",  label: "Animals & Nature", emoji: "🦁" },
  { id: "movies",   label: "Movies & TV",      emoji: "🎬" },
  { id: "nature",   label: "Nature",           emoji: "🌿" },
];

export default function WaitingRoom({ roomCode, isHost, onStart, settings, players }) {
  const { myPlayerId, hostId } = useGameStore();

  // Keep localSettings in sync with incoming settings prop (other host changes)
  const [localSettings, setLocalSettings] = useState(() => ({
    maxPlayers: 8, rounds: 3, drawTime: 80,
    wordCategory: "general", isPrivate: false,
    useCustomWords: false, customWords: [],
    ...settings,
  }));

  useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const [customWordInput, setCustomWordInput] = useState("");
  const [codeCopied,      setCodeCopied]      = useState(false);

  const onlinePlayers = players.filter((p) => p.isOnline);

  const updateSetting = (key, value) => {
    setLocalSettings((prev) => {
      const updated = { ...prev, [key]: value };
      emit("room:updateSettings", { settings: updated });
      return updated;
    });
  };

  const addCustomWord = () => {
    const w = customWordInput.trim();
    if (!w || localSettings.customWords.includes(w)) return;
    updateSetting("customWords", [...localSettings.customWords, w]);
    setCustomWordInput("");
  };

  const removeCustomWord = (word) => {
    updateSetting("customWords", localSettings.customWords.filter((w) => w !== word));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const canStart = onlinePlayers.length >= 2 &&
    (!localSettings.useCustomWords || localSettings.customWords.length >= 3);

  return (
    <div className="arena-card p-6 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="font-display text-2xl text-gradient">Room Lobby</h2>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 font-mono text-sm text-arena-cyan bg-arena-cyan/10 border border-arena-cyan/20 rounded px-2 py-0.5 hover:bg-arena-cyan/20 transition-colors"
            >
              {roomCode}
              {codeCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <span className="text-xs text-muted-foreground">Share to invite</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
        {/* ── Players ── */}
        <div className="flex flex-col min-h-0">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 flex-shrink-0">
            <Users size={13} />
            Players ({onlinePlayers.length}/{localSettings.maxPlayers || 8})
          </h3>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {onlinePlayers.map((p) => (
              <div key={p.userId} className="player-card">
                <div className="w-9 h-9 rounded-full bg-arena-purple/20 border border-arena-purple/30 flex items-center justify-center font-bold text-sm">
                  {p.username[0].toUpperCase()}
                </div>
                <span className={`flex-1 font-semibold text-sm ${p.userId === myPlayerId ? "text-arena-cyan" : ""}`}>
                  {p.username}{p.userId === myPlayerId && <span className="opacity-60 text-xs ml-1">(you)</span>}
                </span>
                {p.userId === hostId && <Crown size={13} className="text-arena-yellow" />}
              </div>
            ))}

            {onlinePlayers.length < 2 && (
              <div className="text-sm text-muted-foreground italic text-center py-4 border border-dashed border-arena-border rounded-xl">
                Waiting for more players…<br />
                <span className="text-xs opacity-60">Need at least 2</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="space-y-4 overflow-y-auto no-scrollbar">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings size={13} /> Game Settings
            {!isHost && <span className="ml-auto text-[10px] bg-arena-border rounded px-1.5 py-0.5">Host only</span>}
          </h3>

          {/* Rounds */}
          <div>
            <label className="text-sm mb-1.5 flex items-center gap-2">
              <Layers size={13} className="text-arena-purple" />
              Rounds: <span className="text-arena-cyan font-bold ml-auto">{localSettings.rounds}</span>
            </label>
            <input type="range" min={1} max={8} step={1}
              value={localSettings.rounds}
              onChange={(e) => updateSetting("rounds", Number(e.target.value))}
              disabled={!isHost}
              className="w-full accent-purple-500 disabled:opacity-40"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5"><span>1</span><span>8</span></div>
          </div>

          {/* Draw time */}
          <div>
            <label className="text-sm mb-1.5 flex items-center gap-2">
              <Clock size={13} className="text-arena-cyan" />
              Draw Time: <span className="text-arena-cyan font-bold ml-auto">{localSettings.drawTime}s</span>
            </label>
            <input type="range" min={30} max={180} step={10}
              value={localSettings.drawTime}
              onChange={(e) => updateSetting("drawTime", Number(e.target.value))}
              disabled={!isHost}
              className="w-full accent-cyan-500 disabled:opacity-40"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5"><span>30s</span><span>180s</span></div>
          </div>

          {/* Max players */}
          <div>
            <label className="text-sm mb-1.5 flex items-center gap-2">
              <Users size={13} className="text-arena-green" />
              Max Players: <span className="text-arena-cyan font-bold ml-auto">{localSettings.maxPlayers}</span>
            </label>
            <input type="range" min={2} max={16} step={1}
              value={localSettings.maxPlayers}
              onChange={(e) => updateSetting("maxPlayers", Number(e.target.value))}
              disabled={!isHost}
              className="w-full accent-green-500 disabled:opacity-40"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm mb-2 flex items-center gap-2">
              <Tag size={13} className="text-arena-pink" /> Word Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { if (isHost) { updateSetting("wordCategory", cat.id); updateSetting("useCustomWords", false); }}}
                  disabled={!isHost || localSettings.useCustomWords}
                  className={`px-3 py-2 rounded-lg text-xs border transition-all text-left ${
                    localSettings.wordCategory === cat.id && !localSettings.useCustomWords
                      ? "border-arena-purple bg-arena-purple/20 text-white"
                      : "border-arena-border text-muted-foreground hover:border-arena-purple/40"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom words */}
          {isHost && (
            <div>
              <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localSettings.useCustomWords}
                  onChange={(e) => updateSetting("useCustomWords", e.target.checked)}
                  className="accent-purple-500 w-4 h-4"
                />
                Use custom word list
              </label>

              {localSettings.useCustomWords && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="input-field flex-1 py-2 text-sm"
                      placeholder="Add a word…"
                      value={customWordInput}
                      onChange={(e) => setCustomWordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomWord()}
                      maxLength={30}
                    />
                    <button onClick={addCustomWord} className="btn-primary px-3 py-2">
                      <Plus size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {localSettings.customWords.map((w) => (
                      <span key={w} className="flex items-center gap-1 bg-arena-purple/20 border border-arena-purple/30 rounded-full px-2.5 py-0.5 text-xs">
                        {w}
                        <button onClick={() => removeCustomWord(w)} className="hover:text-red-400 ml-0.5 transition-colors leading-none">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {localSettings.customWords.length < 3 && (
                    <p className="text-xs text-arena-yellow">
                      ⚠ Add {3 - localSettings.customWords.length} more word{3 - localSettings.customWords.length !== 1 ? "s" : ""} to start
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Start / waiting footer */}
      <div className="flex-shrink-0 mt-6">
        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="btn-primary w-full py-4 font-display text-xl flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={22} fill="white" />
            {!canStart && onlinePlayers.length < 2
              ? "Waiting for players…"
              : !canStart
              ? "Add more custom words…"
              : "Start Game!"}
          </button>
        ) : (
          <div className="text-center py-3">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-2 h-2 rounded-full bg-arena-yellow animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Waiting for host to start…</p>
          </div>
        )}
      </div>
    </div>
  );
}
