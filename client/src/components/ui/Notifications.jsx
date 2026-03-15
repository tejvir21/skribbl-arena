import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { useNotifStore } from "../../store";

const icons = {
  success: <CheckCircle2 size={16} className="text-arena-green" />,
  error: <XCircle size={16} className="text-red-400" />,
  info: <AlertCircle size={16} className="text-arena-cyan" />,
  warning: <AlertCircle size={16} className="text-arena-yellow" />,
};

const borders = {
  success: "border-arena-green/30",
  error: "border-red-400/30",
  info: "border-arena-cyan/30",
  warning: "border-arena-yellow/30",
};

export default function Notifications() {
  const { notifs, removeNotif } = useNotifStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifs.map((n) => (
        <div
          key={n.id}
          className={`arena-card border ${borders[n.type] || borders.info} px-4 py-3 flex items-center gap-3 shadow-lg pointer-events-auto animate-slide-down max-w-sm`}
        >
          {icons[n.type] || icons.info}
          <p className="text-sm flex-1">{n.message}</p>
          <button
            onClick={() => removeNotif(n.id)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
