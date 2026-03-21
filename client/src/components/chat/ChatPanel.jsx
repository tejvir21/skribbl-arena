import { useState, useRef, useEffect, useCallback } from "react";
import { SmilePlus, Send, MessageSquare } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useChatStore, useGameStore, useAuthStore } from "../../store";
import { emit } from "../../socket";

const QUICK_EMOJIS = [
  "😂",
  "😮",
  "🔥",
  "👏",
  "❤️",
  "💀",
  "🤔",
  "✅",
  "😍",
  "🎉",
  "😭",
  "🤯",
];

export default function ChatPanel({ isDrawer, isSpectator }) {
  const [input, setInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const messages = useChatStore((s) => s.messages);
  const markRead = useChatStore((s) => s.markRead);
  const phase = useGameStore((s) => s.phase);
  const user = useAuthStore((s) => s.user);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read when panel is visible
  useEffect(() => {
    markRead();
  }, [messages.length]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isSpectator) return;
    emit("chat:message", { message: msg });
    setInput("");
    inputRef.current?.focus();
  }, [input, isSpectator]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Close picker on Escape
    if (e.key === "Escape") setShowPicker(false);
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowPicker(false);
    inputRef.current?.focus();
  };

  const sendQuickEmoji = (emoji) => {
    if (isSpectator) return;
    emit("chat:message", { message: emoji });
  };

  // Styles per message type
  const msgStyle = (type) =>
    ({
      correct:
        "bg-arena-green/10 border-l-2 border-arena-green pl-2 rounded-r py-0.5",
      system: "text-muted-foreground italic text-xs",
      close: "text-arena-yellow font-medium text-xs",
      chat: "",
    })[type] || "";

  const myId = String(user?._id || "");

  const placeholder = () => {
    if (isSpectator) return "Spectating…";
    if (phase !== "drawing") return "Say something…";
    if (isDrawer) return "Chat (no spoilers!)";
    return "Type your guess…";
  };

  return (
    <div className="arena-card flex flex-col max-h-[85dvh] min-h-[400px] lg:min-h-0 relative overflow-hidden overflow-y-auto">
      {/* Header */}
      <div className="flex items-center flex-shrink-0 gap-2 px-4 py-3 border-b border-arena-border/50">
        <MessageSquare size={15} className="text-arena-cyan" />
        <span className="text-sm font-semibold">
          {phase === "drawing" && !isDrawer ? "Guess the Word!" : "Chat"}
        </span>
        {phase === "drawing" && !isDrawer && (
          <span className="flex items-center gap-1 ml-auto text-xs text-arena-yellow">
            <span className="w-1.5 h-1.5 rounded-full bg-arena-yellow animate-pulse" />
            Guessing active
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
        {messages.length === 0 && (
          <p className="py-10 text-xs text-center select-none text-muted-foreground opacity-40">
            Messages appear here…
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id || msg.timestamp}
            className={`text-sm leading-snug animate-fade-in ${msgStyle(msg.type)}`}
          >
            {msg.type === "system" || msg.type === "close" ? (
              <span>{msg.message}</span>
            ) : (
              <>
                <span
                  className={`font-semibold text-xs mr-1 ${
                    String(msg.userId) === myId
                      ? "text-arena-cyan"
                      : "text-muted-foreground"
                  }`}
                >
                  {msg.username}:
                </span>
                <span
                  className={
                    msg.type === "correct" ? "text-arena-green font-medium" : ""
                  }
                >
                  {msg.message}
                </span>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick emoji bar */}
      <div className="flex gap-1 px-3 py-1.5 border-t border-arena-border/30 flex-shrink-0 flex-wrap">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendQuickEmoji(emoji)}
            disabled={isSpectator}
            className="text-base leading-none transition-transform hover:scale-125 active:scale-95 disabled:opacity-30"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1.5 flex-shrink-0 relative">
        <div className="flex items-center gap-1 overflow-hidden transition-colors border bg-arena-dark border-arena-border rounded-xl focus-within:border-arena-purple/50">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder()}
            disabled={isSpectator}
            maxLength={100}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm placeholder-muted-foreground focus:outline-none disabled:opacity-50 min-w-0"
          />
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            disabled={isSpectator}
            className="flex-shrink-0 p-2 transition-colors text-muted-foreground hover:text-arena-yellow disabled:opacity-30"
            title="Emoji picker"
          >
            <SmilePlus size={17} />
          </button>
          <button
            onClick={handleSend}
            disabled={isSpectator || !input.trim()}
            className="flex-shrink-0 p-2 mr-1 transition-colors text-arena-purple hover:text-arena-purple/70 disabled:opacity-30"
            title="Send (Enter)"
          >
            <Send size={17} />
          </button>
        </div>

        {/* Emoji picker popup */}
        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute right-0 z-50 mb-2 shadow-2xl bottom-full"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="dark"
              width={290}
              height={360}
              previewConfig={{ showPreview: false }}
              searchPlaceholder="Search emoji…"
            />
          </div>
        )}
      </div>
    </div>
  );
}
