import { useEffect, useState, useRef } from "react";
import { Zap } from "lucide-react";

export default function WordChoiceOverlay({ words, onChoose }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [hovered,  setHovered]  = useState(null);
  const [chosen,   setChosen]   = useState(null);
  const hasChosen = useRef(false);

  const choose = (word) => {
    if (hasChosen.current) return;
    hasChosen.current = true;
    setChosen(word);
    onChoose(word);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (next <= 0) {
          clearInterval(interval);
          // Auto-pick a random word when timer expires
          if (!hasChosen.current && words.length > 0) {
            const random = words[Math.floor(Math.random() * words.length)];
            choose(random);
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [words]);

  const timerPct = (timeLeft / 15) * 100;
  const timerColor = timeLeft <= 5 ? "#FF4444" : timeLeft <= 10 ? "#F59E0B" : "#7C3AED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="arena-card p-8 max-w-lg w-full mx-4 animate-bounce-in">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float">✏️</div>
          <h2 className="font-display text-3xl text-gradient mb-1">Choose Your Word</h2>
          <p className="text-muted-foreground text-sm">Pick carefully — others will try to guess it!</p>
        </div>

        {/* Timer bar */}
        <div className="h-2 bg-arena-border rounded-full mb-8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>

        {/* Word choices */}
        <div className="grid gap-4">
          {words.map((word, i) => {
            const isChosen = chosen === word;
            const colors = [
              "border-arena-purple/50 text-purple-300 hover:bg-arena-purple/20",
              "border-arena-cyan/50   text-cyan-300   hover:bg-arena-cyan/20",
              "border-arena-pink/50   text-pink-300   hover:bg-arena-pink/20",
            ];
            return (
              <button
                key={word}
                onClick={() => choose(word)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                disabled={!!chosen}
                className={`
                  relative overflow-hidden px-6 py-4 rounded-xl font-display text-lg
                  border-2 transition-all duration-200 text-left
                  ${colors[i % 3]}
                  ${isChosen ? "scale-105 ring-2 ring-white/30" : hovered === i ? "scale-102" : ""}
                  disabled:cursor-default
                `}
              >
                {/* Shimmer */}
                <div className={`
                  absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent
                  transition-transform duration-700
                  ${hovered === i ? "translate-x-full" : "-translate-x-full"}
                `} />

                <div className="flex items-center justify-between relative z-10">
                  <span className="tracking-wide">{word}</span>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-muted-foreground font-body">{word.length} letters</span>
                    {(hovered === i || isChosen) && (
                      <Zap size={15} className={isChosen ? "text-white" : "text-arena-yellow animate-pulse"} />
                    )}
                  </div>
                </div>

                {/* Letter count dots */}
                <div className="flex gap-0.5 mt-2 opacity-50">
                  {word.split("").map((ch, j) => (
                    <div
                      key={j}
                      className="h-0.5 flex-1 rounded-full transition-all duration-150"
                      style={{
                        backgroundColor: ch === " " ? "transparent" : "currentColor",
                        transitionDelay: `${j * 15}ms`,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          {chosen
            ? <span className="text-arena-green font-semibold">✓ Word chosen!</span>
            : <>Auto-selecting in <span className={`font-bold ${timeLeft <= 5 ? "text-red-400" : "text-foreground"}`}>{timeLeft}s</span></>
          }
        </div>
      </div>
    </div>
  );
}
