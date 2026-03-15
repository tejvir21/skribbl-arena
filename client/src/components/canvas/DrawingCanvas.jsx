import { useRef, useEffect, useState, useCallback } from "react";
import {
  Pencil, Eraser, Square, Circle, Minus,
  Trash2, RotateCcw, Download, PaintBucket,
} from "lucide-react";
import { getSocket } from "../../socket";
import { useGameStore } from "../../store";

// ── Constants ──────────────────────────────────────────────────────────────────
const COLORS = [
  "#FFFFFF","#C0C0C0","#808080","#000000",
  "#FF4444","#FF8800","#FFCC00","#FFFF00",
  "#88FF00","#00CC44","#006622","#003311",
  "#00FFFF","#0099FF","#0044FF","#6600CC",
  "#FF00FF","#FF0066","#CC0055","#660033",
  "#FFAAAA","#FFDDAA","#FFFFAA","#AAFFAA",
  "#AAFFFF","#AAAAFF","#DDAAFF","#FFAADD",
  "#8B4513","#A0522D","#D2691E","#F4A460",
];
const BRUSH_SIZES = [3, 6, 12, 20, 32];
const TOOLS = { PEN:"pen", ERASER:"eraser", LINE:"line", RECT:"rect", CIRCLE:"circle", FILL:"fill" };

// ── Component ──────────────────────────────────────────────────────────────────
export default function DrawingCanvas({ canDraw }) {
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const isDrawing   = useRef(false);
  const startPos    = useRef({ x: 0, y: 0 });
  const snapshot    = useRef(null);
  const remoteQ     = useRef([]);
  const rafRef      = useRef(null);
  const historyRef  = useRef([]); // ImageData array
  const histIdxRef  = useRef(-1);

  const [tool,      setTool]      = useState(TOOLS.PEN);
  const [color,     setColor]     = useState("#000000");
  const [brushSize, setBrushSize] = useState(6);
  const [canUndo,   setCanUndo]   = useState(false);

  const wordBlanks = useGameStore((s) => s.wordBlanks);
  const actualWord = useGameStore((s) => s.actualWord);
  const hint       = useGameStore((s) => s.hint);
  const phase      = useGameStore((s) => s.phase);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d", { willReadFrequently: true });
    ctx.lineCap  = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    clearCanvas(ctx, canvas);
    pushHistory(ctx, canvas);

    // Remote draw queue → requestAnimationFrame
    const processQ = () => {
      while (remoteQ.current.length > 0) applyRemote(remoteQ.current.shift());
      rafRef.current = requestAnimationFrame(processQ);
    };
    rafRef.current = requestAnimationFrame(processQ);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Reset canvas at the start of every new drawing phase (for ALL players)
  const prevPhase = useRef(null);
  useEffect(() => {
    if (phase === "drawing" && prevPhase.current !== "drawing") {
      const ctx    = ctxRef.current;
      const canvas = canvasRef.current;
      if (ctx && canvas) {
        clearCanvas(ctx, canvas);
        historyRef.current = [];
        histIdxRef.current = -1;
        pushHistory(ctx, canvas);
        setCanUndo(false);
        remoteQ.current = []; // flush any stale remote events
      }
    }
    prevPhase.current = phase;
  }, [phase]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onDraw  = (data) => { if (!canDraw) remoteQ.current.push(data); };
    const onClear = ()     => {
      if (canDraw) return;
      const ctx = ctxRef.current; const canvas = canvasRef.current;
      clearCanvas(ctx, canvas);
      pushHistory(ctx, canvas);
    };
    const onFill = ({ x, y, color: fc }) => {
      if (canDraw) return;
      const canvas = canvasRef.current;
      floodFill(ctxRef.current, canvas, Math.round(x * canvas.width), Math.round(y * canvas.height), fc);
    };

    socket.on("canvas:draw",  onDraw);
    socket.on("canvas:clear", onClear);
    socket.on("canvas:fill",  onFill);
    return () => {
      socket.off("canvas:draw",  onDraw);
      socket.off("canvas:clear", onClear);
      socket.off("canvas:fill",  onFill);
    };
  }, [canDraw]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearCanvas = (ctx, canvas) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const pushHistory = (ctx, canvas) => {
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const idx  = histIdxRef.current + 1;
    historyRef.current = historyRef.current.slice(0, idx);
    historyRef.current.push(snap);
    histIdxRef.current = idx;
    setCanUndo(idx > 0);
  };

  const applyRemote = (ev) => {
    const ctx    = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;

    if (ev.type === "start") {
      ctx.beginPath();
      ctx.strokeStyle = ev.color;
      ctx.lineWidth   = ev.size;
      ctx.moveTo(ev.x * W, ev.y * H);
    } else if (ev.type === "move") {
      ctx.lineTo(ev.x * W, ev.y * H);
      ctx.stroke();
    } else if (ev.type === "end") {
      ctx.closePath();
    } else if (ev.type === "shape") {
      drawShape(ctx, ev, W, H);
    }
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left)  / rect.width,
      y: (src.clientY - rect.top)   / rect.height,
    };
  };

  const emitDraw = useCallback((type, data) => {
    const socket = getSocket();
    if (socket && canDraw) socket.emit("canvas:draw", { type, ...data });
  }, [canDraw]);

  // ── Mouse/Touch handlers ───────────────────────────────────────────────────
  const handleDown = useCallback((e) => {
    if (!canDraw) return;
    e.preventDefault();
    const pos    = getPos(e);
    const ctx    = ctxRef.current;
    const canvas = canvasRef.current;
    isDrawing.current = true;
    startPos.current  = pos;
    snapshot.current  = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === TOOLS.FILL) {
      isDrawing.current = false;
      floodFill(ctx, canvas, Math.round(pos.x * canvas.width), Math.round(pos.y * canvas.height), color);
      const socket = getSocket();
      if (socket) socket.emit("canvas:fill", { x: pos.x, y: pos.y, color });
      pushHistory(ctx, canvas);
      return;
    }

    const strokeColor = tool === TOOLS.ERASER ? "#FFFFFF" : color;
    const strokeWidth = tool === TOOLS.ERASER ? brushSize * 2.5 : brushSize;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(pos.x * canvas.width, pos.y * canvas.height);
    emitDraw("start", { x: pos.x, y: pos.y, color: strokeColor, size: strokeWidth });
  }, [canDraw, tool, color, brushSize, emitDraw]);

  const handleMove = useCallback((e) => {
    if (!canDraw || !isDrawing.current) return;
    e.preventDefault();
    const pos    = getPos(e);
    const ctx    = ctxRef.current;
    const canvas = canvasRef.current;

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
      ctx.stroke();
      emitDraw("move", { x: pos.x, y: pos.y });
    } else {
      // Shape preview — restore snapshot then draw ghost
      ctx.putImageData(snapshot.current, 0, 0);
      drawShape(ctx, {
        tool,
        startX: startPos.current.x, startY: startPos.current.y,
        endX: pos.x, endY: pos.y,
        color, size: brushSize,
      }, canvas.width, canvas.height);
    }
  }, [canDraw, tool, color, brushSize, emitDraw]);

  const handleUp = useCallback((e) => {
    if (!canDraw || !isDrawing.current) return;
    isDrawing.current = false;
    const ctx    = ctxRef.current;
    const canvas = canvasRef.current;

    if ([TOOLS.LINE, TOOLS.RECT, TOOLS.CIRCLE].includes(tool)) {
      const pos   = e.changedTouches ? { x: (e.changedTouches[0].clientX - canvas.getBoundingClientRect().left) / canvas.getBoundingClientRect().width, y: (e.changedTouches[0].clientY - canvas.getBoundingClientRect().top) / canvas.getBoundingClientRect().height } : getPos(e);
      const shape = { tool, startX: startPos.current.x, startY: startPos.current.y, endX: pos.x, endY: pos.y, color, size: brushSize };
      ctx.putImageData(snapshot.current, 0, 0);
      drawShape(ctx, shape, canvas.width, canvas.height);
      emitDraw("shape", shape);
    } else {
      ctx.closePath();
      emitDraw("end", {});
    }
    pushHistory(ctx, canvas);
  }, [canDraw, tool, color, brushSize, emitDraw]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (!canDraw) return;
    const ctx = ctxRef.current; const canvas = canvasRef.current;
    clearCanvas(ctx, canvas);
    pushHistory(ctx, canvas);
    const socket = getSocket();
    if (socket) socket.emit("canvas:clear");
  };

  const handleUndo = () => {
    if (!canDraw || histIdxRef.current <= 0) return;
    histIdxRef.current--;
    ctxRef.current.putImageData(historyRef.current[histIdxRef.current], 0, 0);
    setCanUndo(histIdxRef.current > 0);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.download = "skribbl-drawing.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // ── Word display ───────────────────────────────────────────────────────────
  const renderWordDisplay = () => {
    if (actualWord) {
      return (
        <div className="font-display text-2xl text-arena-yellow tracking-widest text-center">
          {actualWord}
        </div>
      );
    }
    const display = hint || wordBlanks || "";
    return (
      <div className="flex items-center justify-center gap-1 flex-wrap min-h-[32px]">
        {display.split("").map((ch, i) => {
          if (ch === " " || ch === "/") return <span key={i} className="mx-1 text-muted-foreground text-sm">/</span>;
          if (ch === "_") return <span key={i} className="inline-block w-6 h-0.5 bg-foreground/50 mx-0.5 align-middle" />;
          return <span key={i} className="font-display text-xl text-arena-cyan">{ch}</span>;
        })}
      </div>
    );
  };

  const cursorClass = {
    [TOOLS.ERASER]: "canvas-erase-cursor",
    [TOOLS.FILL]:   "canvas-fill-cursor",
  }[tool] || "canvas-draw-cursor";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="arena-card p-3 h-full flex flex-col gap-3">
      {/* Word display */}
      <div className="text-center min-h-[36px] flex items-center justify-center">
        {renderWordDisplay()}
      </div>

      {/* Canvas */}
      <div
        className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-arena-border bg-white"
        style={{ aspectRatio: "4/3", maxHeight: "calc(100vh - 320px)" }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={`w-full h-full block ${canDraw ? cursorClass : "cursor-default"}`}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
          style={{ touchAction: "none" }}
        />
        {/* Overlay for non-drawers */}
        {!canDraw && (
          <div className="absolute inset-0 pointer-events-none" />
        )}
      </div>

      {/* Toolbar — only for drawer */}
      {canDraw && (
        <div className="space-y-2.5">
          {/* Color palette */}
          <div className="flex flex-wrap gap-1 justify-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); if (tool === TOOLS.ERASER) setTool(TOOLS.PEN); }}
                title={c}
                style={{ backgroundColor: c }}
                className={`
                  w-6 h-6 rounded-md border transition-transform hover:scale-110 active:scale-95
                  ${color === c && tool !== TOOLS.ERASER
                    ? "border-white ring-2 ring-arena-purple scale-110 shadow-lg"
                    : "border-transparent border-black/20"}
                `}
              />
            ))}
          </div>

          {/* Tools + sizes + actions */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Drawing tools */}
            <div className="flex gap-1 bg-arena-dark rounded-xl p-1 border border-arena-border/50">
              {[
                { id: TOOLS.PEN,    icon: <Pencil     size={14} />, label: "Pen"       },
                { id: TOOLS.ERASER, icon: <Eraser     size={14} />, label: "Eraser"    },
                { id: TOOLS.FILL,   icon: <PaintBucket size={14} />, label: "Fill"     },
                { id: TOOLS.LINE,   icon: <Minus      size={14} />, label: "Line"      },
                { id: TOOLS.RECT,   icon: <Square     size={14} />, label: "Rectangle" },
                { id: TOOLS.CIRCLE, icon: <Circle     size={14} />, label: "Ellipse"   },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                  className={`canvas-tool-btn ${tool === t.id ? "active" : ""}`}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* Brush size dots */}
            <div className="flex items-center gap-1.5 bg-arena-dark rounded-xl px-3 py-2 border border-arena-border/50">
              {BRUSH_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrushSize(s)}
                  title={`${s}px`}
                  className={`rounded-full flex-shrink-0 transition-transform hover:scale-125 active:scale-95 ${brushSize === s ? "ring-2 ring-white/60" : ""}`}
                  style={{
                    width:  Math.max(s, 7),
                    height: Math.max(s, 7),
                    backgroundColor: tool === TOOLS.ERASER ? "#666" : (color === "#FFFFFF" ? "#aaa" : color),
                  }}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 bg-arena-dark rounded-xl p-1 border border-arena-border/50">
              <button
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
                disabled={!canUndo}
                className="canvas-tool-btn disabled:opacity-30"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleClear}
                title="Clear canvas"
                className="canvas-tool-btn hover:text-red-400 hover:border-red-400/30"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={handleDownload}
                title="Download"
                className="canvas-tool-btn hover:text-arena-cyan hover:border-arena-cyan/30"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shape renderer ─────────────────────────────────────────────────────────────
function drawShape(ctx, s, W, H) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth   = s.size;
  const x1 = s.startX * W, y1 = s.startY * H;
  const x2 = s.endX   * W, y2 = s.endY   * H;
  ctx.beginPath();
  if (s.tool === TOOLS.LINE) {
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  } else if (s.tool === TOOLS.RECT) {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (s.tool === TOOLS.CIRCLE) {
    const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
}

// ── Flood fill ─────────────────────────────────────────────────────────────────
function floodFill(ctx, canvas, startX, startY, fillHex) {
  const W = canvas.width, H = canvas.height;
  const img  = ctx.getImageData(0, 0, W, H);
  const data = img.data;

  const idx     = (x, y) => (y * W + x) * 4;
  const at      = (x, y) => [data[idx(x,y)], data[idx(x,y)+1], data[idx(x,y)+2], data[idx(x,y)+3]];
  const match   = (a, b, tol = 30) =>
    Math.abs(a[0]-b[0]) <= tol && Math.abs(a[1]-b[1]) <= tol &&
    Math.abs(a[2]-b[2]) <= tol && Math.abs(a[3]-b[3]) <= tol;

  const target = at(startX, startY);
  const fill   = hexToRgba(fillHex);
  if (match(target, fill, 5)) return;

  const stack   = [[startX, startY]];
  const visited = new Uint8Array(W * H);

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    if (visited[y * W + x]) continue;
    visited[y * W + x] = 1;
    if (!match(at(x, y), target)) continue;
    const i = idx(x, y);
    data[i] = fill[0]; data[i+1] = fill[1]; data[i+2] = fill[2]; data[i+3] = fill[3];
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(img, 0, 0);
}

function hexToRgba(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0,2),16),
    parseInt(h.slice(2,4),16),
    parseInt(h.slice(4,6),16),
    255,
  ];
}
