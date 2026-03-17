import { io } from "socket.io-client";
import { useAuthStore, useGameStore, useChatStore, useNotifStore } from "./store";

let socket = null;
let listenersRegistered = false;

export const getSocket = () => socket;

export const initSocket = () => {
  const token = useAuthStore.getState().token;
  if (socket) return socket;

  socket = io(import.meta.env.VITE_SERVER_URL || "", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  if (listenersRegistered) return socket;
  listenersRegistered = true;

  // ── CONNECTION ─────────────────────────────────────────────────────
  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") socket.connect();
  });

  socket.on("connect_error", () => {
    useNotifStore.getState().addNotif({ type: "error", message: "Connection error. Retrying…" });
  });

  // ── ROOM EVENTS ────────────────────────────────────────────────────
  socket.on("room:playerJoined", ({ players }) => {
    useGameStore.getState().updatePlayers(players);
  });

  socket.on("room:playerLeft", ({ players }) => {
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
      // Do NOT clear roundResults — RoundEndOverlay manages its own dismissal
      gameResults: null,
    });
    useChatStore.getState().addMessage({
      id: `round-${round}-${Date.now()}`,
      type: "system",
      message: `🤔 Round ${round}/${totalRounds} — ${drawer} is choosing a word…`,
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
    // Update chat to reflect drawing started
    useChatStore.getState().addMessage({
      id: `drawing-${data.round}-${Date.now()}`,
      type: "system",
      message: `✏️ ${data.drawer} started drawing!`,
    });
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

  socket.on("game:roundEnd", ({ word, players, reason, nobodyGuessed }) => {
    useGameStore.getState().setRoundResults({ word, players, reason, nobodyGuessed });
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

export const emit = (event, data, callback) => {
  if (!socket?.connected) return;
  if (callback) socket.emit(event, data, callback);
  else socket.emit(event, data);
};
