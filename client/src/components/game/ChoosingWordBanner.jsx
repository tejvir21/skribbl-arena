import { useGameStore } from "../../store";
import { useIsDrawer } from "../../hooks/useGame";

export default function ChoosingWordBanner() {
  const currentDrawerName = useGameStore((s) => s.currentDrawerName);
  const phase             = useGameStore((s) => s.phase);
  const currentRound      = useGameStore((s) => s.currentRound);
  const totalRounds       = useGameStore((s) => s.totalRounds);
  const amDrawer          = useIsDrawer();

  if (phase !== "starting") return null;

  return (
    <div className="arena-card h-full flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
      {/* Round indicator */}
      <div className="text-sm text-muted-foreground mb-6 font-mono">
        Round <span className="text-foreground font-bold">{currentRound}</span>
        {" / "}
        <span className="text-foreground font-bold">{totalRounds}</span>
      </div>

      {/* Main status */}
      {amDrawer ? (
        <>
          <div className="text-6xl mb-4 animate-bounce">✏️</div>
          <h2 className="font-display text-3xl text-arena-yellow mb-2">
            Your turn to draw!
          </h2>
          <p className="text-muted-foreground">
            Choose a word from the options above…
          </p>
        </>
      ) : (
        <>
          {/* Animated drawing indicator */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-arena-purple/10 border-2 border-arena-purple/30 flex items-center justify-center">
              <span className="font-display text-4xl font-bold text-arena-purple">
                {currentDrawerName?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-arena-purple/50 animate-ping" />
          </div>

          <h2 className="font-display text-2xl text-gradient mb-2">
            <span className="text-arena-yellow">{currentDrawerName}</span> is choosing a word
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Get ready to guess!
          </p>

          {/* Animated dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-arena-purple animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
