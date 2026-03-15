import { useState } from "react";
import { X, Plus, Loader2, Lock, Globe } from "lucide-react";
import { roomAPI } from "../../api";
import { useNotifStore } from "../../store";

export default function CreateRoomModal({ onClose, onCreated }) {
  const { addNotif } = useNotifStore();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCategory: "general",
    isPrivate: false,
    useCustomWords: false,
    customWords: [],
  });
  const [customWordInput, setCustomWordInput] = useState("");

  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const addWord = () => {
    const w = customWordInput.trim();
    if (!w || settings.customWords.includes(w)) return;
    update("customWords", [...settings.customWords, w]);
    setCustomWordInput("");
  };

  const removeWord = (w) => update("customWords", settings.customWords.filter((x) => x !== w));

  const handleCreate = async () => {
    if (settings.useCustomWords && settings.customWords.length < 3) {
      addNotif({ type: "error", message: "Add at least 3 custom words" });
      return;
    }
    setLoading(true);
    try {
      const { room } = await roomAPI.create(settings);
      addNotif({ type: "success", message: `Room ${room.code} created!` });
      onCreated(room.code);
    } catch (err) {
      addNotif({ type: "error", message: typeof err === "string" ? err : "Failed to create room" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="arena-card p-6 max-w-md w-full mx-4 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-gradient flex items-center gap-2">
            <Plus size={22} /> Create Room
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Privacy toggle */}
          <div className="flex items-center gap-3 bg-arena-dark/50 rounded-xl p-4 border border-arena-border/50">
            <div className="flex-1">
              <p className="font-semibold text-sm">{settings.isPrivate ? "Private Room" : "Public Room"}</p>
              <p className="text-xs text-muted-foreground">
                {settings.isPrivate ? "Only players with the code can join" : "Listed in the public room browser"}
              </p>
            </div>
            <button
              onClick={() => update("isPrivate", !settings.isPrivate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                settings.isPrivate
                  ? "border-arena-purple/50 bg-arena-purple/20 text-purple-300"
                  : "border-arena-border text-muted-foreground"
              }`}
            >
              {settings.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
              {settings.isPrivate ? "Private" : "Public"}
            </button>
          </div>

          {/* Rounds */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Rounds: <span className="text-arena-cyan">{settings.rounds}</span>
            </label>
            <input type="range" min={1} max={8} value={settings.rounds}
              onChange={(e) => update("rounds", Number(e.target.value))}
              className="w-full accent-arena-purple" />
          </div>

          {/* Draw time */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Draw Time: <span className="text-arena-cyan">{settings.drawTime}s</span>
            </label>
            <input type="range" min={30} max={180} step={10} value={settings.drawTime}
              onChange={(e) => update("drawTime", Number(e.target.value))}
              className="w-full accent-arena-cyan" />
          </div>

          {/* Max players */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Max Players: <span className="text-arena-cyan">{settings.maxPlayers}</span>
            </label>
            <input type="range" min={2} max={16} value={settings.maxPlayers}
              onChange={(e) => update("maxPlayers", Number(e.target.value))}
              className="w-full accent-arena-green" />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-2 block">Word Category</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "general", label: "🌐 General" },
                { id: "animals", label: "🦁 Animals" },
                { id: "movies", label: "🎬 Movies & TV" },
                { id: "nature", label: "🌿 Nature" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { update("wordCategory", cat.id); update("useCustomWords", false); }}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    settings.wordCategory === cat.id && !settings.useCustomWords
                      ? "border-arena-purple bg-arena-purple/20 text-white"
                      : "border-arena-border text-muted-foreground hover:border-arena-purple/40"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom words toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={settings.useCustomWords}
                onChange={(e) => update("useCustomWords", e.target.checked)}
                className="accent-arena-purple w-4 h-4"
              />
              <span className="text-sm font-medium">Use custom word list</span>
            </label>

            {settings.useCustomWords && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1 py-2 text-sm"
                    placeholder="Add word..."
                    value={customWordInput}
                    onChange={(e) => setCustomWordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWord()}
                    maxLength={30}
                  />
                  <button onClick={addWord} className="btn-primary px-3 py-2"><Plus size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {settings.customWords.map((w) => (
                    <span key={w} className="flex items-center gap-1 bg-arena-purple/20 border border-arena-purple/30 rounded-full px-2.5 py-1 text-xs">
                      {w}
                      <button onClick={() => removeWord(w)} className="hover:text-red-400 ml-0.5 transition-colors">✕</button>
                    </span>
                  ))}
                </div>
                {settings.customWords.length < 3 && (
                  <p className="text-xs text-arena-yellow">⚠️ Need at least 3 words ({3 - settings.customWords.length} more)</p>
                )}
              </div>
            )}
          </div>
        </div>

        <button onClick={handleCreate} disabled={loading} className="btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {loading ? "Creating..." : "Create Room"}
        </button>
      </div>
    </div>
  );
}
