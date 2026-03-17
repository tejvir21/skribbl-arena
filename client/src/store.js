import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── AUTH STORE ─────────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setAuth: (user, token) => set({ user, token, error: null }),
      clearAuth: () => set({ user: null, token: null }),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (updates) => set({ user: { ...get().user, ...updates } }),
    }),
    { name: "arena-auth", partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

// ── GAME STORE ─────────────────────────────────────────────────────────────────
export const useGameStore = create((set, get) => ({
  // Room
  roomCode: null,
  players: [],
  settings: {},
  hostId: null,
  myPlayerId: null,

  // Game state
  phase: "waiting", // waiting | starting | drawing | roundEnd | gameEnd
  currentRound: 0,
  totalRounds: 3,
  currentDrawerId: null,
  currentDrawerName: "",
  wordBlanks: "",
  wordLength: 0,
  actualWord: null, // only for drawer
  hint: "",
  timeRemaining: 0,
  drawTime: 80,

  // Canvas strokes (for replay/sync)
  canvasHistory: [],

  // Scores
  roundResults: null,
  gameResults: null,

  // Word choice
  wordChoices: [],
  choosingWord: false,

  // Spectator
  isSpectator: false,

  // Actions
  setRoom: (data) => set({
    roomCode: data.code || data.roomCode,
    players: data.players || [],
    settings: data.settings || {},
    hostId: data.host || data.hostId,
    myPlayerId: data.playerId || get().myPlayerId,
    phase: data.gameState?.phase || "waiting",
    currentRound: data.gameState?.currentRound || 0,
    totalRounds: data.gameState?.totalRounds || data.settings?.rounds || 3,
    currentDrawerId: data.gameState?.currentDrawer || null,
    drawTime: data.gameState?.drawTime || data.settings?.drawTime || 80,
    wordLength: data.gameState?.wordLength || 0,
    hint: data.gameState?.hintsRevealed || "",
  }),

  setPhase: (phase) => set({ phase }),

  updatePlayers: (players) => set({ players }),

  addPlayer: (player) => set((s) => ({
    players: [...s.players.filter((p) => p.userId !== player.userId), player],
  })),

  removePlayer: (userId) => set((s) => ({
    players: s.players.map((p) =>
      p.userId === userId ? { ...p, isOnline: false } : p
    ),
  })),

  setDrawingPhase: (data) => set({
    phase: "drawing",
    currentDrawerId: data.drawerId,
    currentDrawerName: data.drawer,
    wordBlanks: data.word,
    wordLength: data.wordLength,
    actualWord: data.isDrawer ? data.actualWord : null,
    drawTime: data.drawTime,
    timeRemaining: data.drawTime,
    hint: "",
    canvasHistory: [],
  }),

  setWordChoices: (words) => set({ wordChoices: words, choosingWord: true }),
  clearWordChoices: () => set({ wordChoices: [], choosingWord: false }),

  setTimer: (remaining) => set({ timeRemaining: remaining }),

  setHint: (hint) => set({ hint }),

  playerGuessed: (userId) => set((s) => ({
    players: s.players.map((p) =>
      p.userId === userId ? { ...p, hasGuessed: true } : p
    ),
  })),

  updateScores: (players) => set({ players }),

  setRoundResults: (data) => set({ roundResults: data, phase: "roundEnd" }),
  setGameResults: (data) => set({ gameResults: data, phase: "gameEnd" }),

  setSpectator: (val) => set({ isSpectator: val }),

  setHostId: (hostId) => set({ hostId }),

  resetGame: () => set({
    phase: "waiting",
    currentRound: 0,
    currentDrawerId: null,
    wordBlanks: "",
    wordLength: 0,
    actualWord: null,
    hint: "",
    timeRemaining: 0,
    canvasHistory: [],
    wordChoices: [],
    choosingWord: false,
    roundResults: null,
    gameResults: null,
  }),

  leaveRoom: () => set({
    roomCode: null, players: [], settings: {}, hostId: null, myPlayerId: null,
    phase: "waiting", currentRound: 0, currentDrawerId: null, wordBlanks: "",
    wordLength: 0, actualWord: null, hint: "", timeRemaining: 0, canvasHistory: [],
    wordChoices: [], choosingWord: false, roundResults: null, gameResults: null,
    isSpectator: false,
  }),

  isDrawer: () => get().currentDrawerId === get().myPlayerId,
  myPlayer: () => get().players.find((p) => p.userId === get().myPlayerId),
}));

// ── CHAT STORE ─────────────────────────────────────────────────────────────────
export const useChatStore = create((set) => ({
  messages: [],
  unread: 0,
  chatOpen: true,

  addMessage: (msg) => set((s) => {
    const id = msg.id || `${msg.type}-${msg.message}-${msg.timestamp || Date.now()}`;
    // Deduplicate: if a message with this id already exists, ignore it
    if (s.messages.some((m) => m.id === id)) return s;
    return { messages: [...s.messages.slice(-200), { ...msg, id }] };
  }),

  clearMessages: () => set({ messages: [], unread: 0 }),
  markRead: () => set({ unread: 0 }),
  setChatOpen: (open) => set({ chatOpen: open }),
  incrementUnread: () => set((s) => ({ unread: s.unread + 1 })),
}));

// ── NOTIFICATION STORE ─────────────────────────────────────────────────────────
export const useNotifStore = create((set) => ({
  notifs: [],
  addNotif: ({ type, message, duration = 3000 }) => {
    const id = Date.now();
    set((s) => ({ notifs: [...s.notifs, { id, type, message }] }));
    setTimeout(() => set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })), duration);
  },
  removeNotif: (id) => set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })),
}));
