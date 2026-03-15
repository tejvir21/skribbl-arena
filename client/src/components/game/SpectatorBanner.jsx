import { Eye } from "lucide-react";

export default function SpectatorBanner() {
  return (
    <div className="bg-gray-500/10 border-b border-gray-500/20 px-4 py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Eye size={14} />
      You are spectating this game — join next round!
    </div>
  );
}
