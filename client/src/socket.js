import { io } from "socket.io-client";
import { useAuthStore, useGameStore, useChatStore, useNotifStore } from "./store";

let socket = null;
// Prevents double-registration of listeners (React StrictMode runs effects twice)
let listenersRegistered = false;

export const getSocket = () => socket;

export const initSocket = () => {
  const token = useAuthStore.getState().token;

  // If socket already exists (even if not yet connected), reuse it
  if (socket) return socket;

  socket = io(import.meta.env.VITE_SERVER_URL || "", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Guard: register listeners only once per socket instance
  if (listenersRegistered) return socket;
  listenersRegistered = true;

  // ── CONNECTION ─────────────────────────────────────────────────────
  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
    if (reason === "io server disconnect") socket.connect();
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
    useNotifStore.getState().addNotif({ type: "error", message: "Connection error. Retrying…" });
  });

  // ── ROOM EVENTS ────────────────────────────────────────────────────
  socket.on("room:playerJoined", ({ players }) => {
    // Replace full list — never append — to stay in sync with server truth
    useGameStore.getState().updatePlayers(players);
  });

  socket.on("room:playerLeft", ({ userId, username, players }) => {
    // Just update the player list. The server emits a chat:message separately.
    useGameStore.getState().updatePlayers(players);
  });

  socket.on("room:settingsUpdated", ({ settings }) => {
    useGameStore.setState((s) => ({ settings: { ...s.settings, ...settings } }));
  });

  socket.on("room:hostChanged", ({ newHostId, newHostName }) => {
    useGameStore.getState().setHostId(newHostId);
    useChatStore.getState().addMessage({
      id: `host-${newHostId}-${Date.now()}`,
      type: "system",
      message: `${newHostName} is now the host`,
    });
  });

  // ── GAME EVENTS ────────────────────────────────────────────────────
  socket.on("game:starting", ({ countdown }) => {
    useGameStore.getState().setPhase("starting");
    useChatStore.getState().addMessage({
      id: `starting-${Date.now()}`,
      type: "system",
      message: `🎮 Game starting in ${countdown}s…`,
    });
  });

  socket.on("game:error", ({ message }) => {
    useNotifStore.getState().addNotif({ type: "error", message });
  });

  socket.on("game:newRound", ({ round, totalRounds, drawer, drawerId, players }) => {
    useGameStore.setState({
      currentRound: round,
      totalRounds,
      currentDrawerName: drawer,
      currentDrawerId: drawerId,
      players,
      phase: "starting",
      hint: "",
      roundResults: null,  // dismiss RoundEndOverlay
      gameResults: null,
    });
    useChatStore.getState().addMessage({
      id: `round-${round}-${Date.now()}`,
      type: "system",
      message: `✏️ Round ${round}/${totalRounds} — ${drawer} is drawing!`,
    });
  });

  socket.on("game:chooseWord", ({ words }) => {
    useGameStore.getState().setWordChoices(words);
  });

  socket.on("game:wordChosen:auto", ({ word }) => {
    socket.emit("game:wordChosen", { word });
    useGameStore.getState().clearWordChoices();
  });

  socket.on("game:roundStarted", (data) => {
    useGameStore.getState().setDrawingPhase(data);
    useGameStore.getState().clearWordChoices();
  });

  socket.on("game:drawingWord", ({ word }) => {
    useGameStore.setState({ actualWord: word });
  });

  socket.on("game:timer", ({ remaining }) => {
    useGameStore.getState().setTimer(remaining);
  });

  socket.on("game:hint", ({ hint }) => {
    useGameStore.getState().setHint(hint);
    useChatStore.getState().addMessage({
      id: `hint-${Date.now()}`,
      type: "system",
      message: `💡 Hint: ${hint}`,
    });
  });

  socket.on("game:correctGuess", ({ userId, points, players }) => {
    useGameStore.getState().playerGuessed(userId);
    useGameStore.getState().updateScores(players);
  });

  socket.on("game:roundEnd", ({ word, players, reason }) => {
    useGameStore.getState().setRoundResults({ word, players, reason });
    useGameStore.getState().updateScores(players);
  });

  socket.on("game:end", ({ players, winner }) => {
    useGameStore.getState().setGameResults({ players, winner });
  });

  // ── CHAT EVENTS ────────────────────────────────────────────────────
  socket.on("chat:message", (msg) => {
    useChatStore.getState().addMessage(msg);
    if (!useChatStore.getState().chatOpen) {
      useChatStore.getState().incrementUnread();
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listenersRegistered = false;
  }
};

// Convenience emitter — silently drops if not connected
export const emit = (event, data, callback) => {
  if (!socket?.connected) return;
  if (callback) socket.emit(event, data, callback);
  else socket.emit(event, data);
};
