const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Room = require("../models/Room");
const { getRandomWords, getWordHint, checkGuess, getCloseGuess } = require("../utils/words");
const { v4: uuidv4 } = require("uuid");

// In-memory game timers
const gameTimers = new Map();
const hintTimers = new Map();
// Grace-period timers: cancelled when player reconnects before timeout fires
const disconnectTimers = new Map();
// In-memory canvas stroke history per room: Map<roomCode, stroke[]>
// Cleared at round start, replayed to reconnecting players
const canvasStrokes = new Map();

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.CLIENT_URL || "http://localhost:3000")
        .split(",").map((o) => o.trim()),
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          socket.user = user;
        }
      }
      // Allow unauthenticated (will be rejected at join time if no guest data)
      next();
    } catch (err) {
      next(); // Allow connection even without valid token
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} | User: ${socket.user?.username || "guest"}`);

    // ── ROOM MANAGEMENT ──────────────────────────────────────────────

    socket.on("room:join", async ({ roomCode, username, avatar }, callback) => {
      try {
        const code = roomCode?.toUpperCase();
        let room = await Room.findOne({ code, isActive: true });

        if (!room) {
          // Create new room if code doesn't exist
          room = await Room.create({
            code,
            host: socket.user?._id?.toString() || socket.id,
            players: [],
          });
        }

        const userId = socket.user?._id?.toString() || socket.id;

        // Cancel any pending disconnect grace timer for this user across ALL their old sockets.
        // This is the key fix: when a player reconnects after a reload, their old socket's
        // grace period timer gets cancelled so the round is never interrupted.
        for (const [oldSocketId, entry] of disconnectTimers.entries()) {
          if (entry.userId === userId && entry.roomCode === code) {
            clearTimeout(entry.timer);
            disconnectTimers.delete(oldSocketId);
            console.log(`⏱  Grace timer cancelled for ${username || userId} (reconnected)`);
          }
        }

        // Check if this player was already in the room (reconnection)
        const existingPlayer = room.players.find((p) => p.userId === userId);
        const isReconnect = !!existingPlayer;

        // Only enforce max-players for NEW players (not reconnecting ones)
        if (!isReconnect) {
          const onlinePlayers = room.players.filter((p) => p.isOnline);
          if (onlinePlayers.length >= room.settings.maxPlayers) {
            return callback?.({ error: "Room is full" });
          }
        }

        // Build player data — preserve existing score/hasGuessed if reconnecting
        const playerData = {
          userId,
          username: socket.user?.username || username || `Guest_${socket.id.slice(0, 4)}`,
          avatar: socket.user?.avatar || avatar || "",
          socketId: socket.id, // always update to new socket ID
          score: isReconnect ? (existingPlayer.score || 0) : 0,
          isReady: false,
          hasGuessed: isReconnect ? (existingPlayer.hasGuessed || false) : false,
          isOnline: true,
        };

        // Replace player entry (handles both new join and reconnect)
        room.players = room.players.filter((p) => p.userId !== userId);
        room.players.push(playerData);
        await room.save();

        socket.join(code);
        socket.roomCode = code;
        socket.playerData = playerData;

        // Send full room state + current game state to joining/reconnecting player
        callback?.({
          success: true,
          isReconnect,
          room: sanitizeRoom(room),
          playerId: userId,
        });

        if (isReconnect) {
          // Send current game state so client can resume correctly
          const gs = room.gameState;
          if (gs.phase === "drawing") {
            socket.emit("game:newRound", {
              round: gs.currentRound,
              totalRounds: room.settings.rounds,
              drawer: room.players.find((p) => p.userId === gs.currentDrawer)?.username || "",
              drawerId: gs.currentDrawer,
              players: room.players,
            });
            // Small delay so client processes newRound first
            setTimeout(() => {
              const blanks = gs.currentWord
                ? gs.currentWord.split("").map((c) => (c === " " ? "/" : "_")).join(" ")
                : "";
              const drawerName = room.players.find((p) => p.userId === gs.currentDrawer)?.username || "";
              // Send round started to restore the drawing view
              socket.emit("game:roundStarted", {
                word: gs.hintsRevealed || blanks,
                wordLength: gs.currentWord?.length || 0,
                drawer: drawerName,
                drawerId: gs.currentDrawer,
                drawTime: room.settings.drawTime,
                round: gs.currentRound,
                totalRounds: room.settings.rounds,
                // Only give actual word back if this player IS the drawer
                ...(gs.currentDrawer === userId && { isDrawer: true, actualWord: gs.currentWord }),
              });
              if (gs.hintsRevealed) {
                socket.emit("game:hint", { hint: gs.hintsRevealed });
              }
              // Replay canvas strokes — flatten stroke groups into ordered event list
              const groups = canvasStrokes.get(code) || [];
              const strokes = groups.flat();
              if (strokes.length > 0) {
                socket.emit("canvas:replay", { strokes });
              }
            }, 200);
          } else if (gs.phase === "starting" && gs.currentDrawer) {
            // Round is starting, drawer is picking — show newRound state
            socket.emit("game:newRound", {
              round: gs.currentRound,
              totalRounds: room.settings.rounds,
              drawer: room.players.find((p) => p.userId === gs.currentDrawer)?.username || "",
              drawerId: gs.currentDrawer,
              players: room.players,
            });
            // If this player is the drawer, resend word choices
            if (gs.currentDrawer === userId && gs.wordChoices?.length > 0) {
              socket.emit("game:chooseWord", { words: gs.wordChoices, timeToChoose: 15 });
            }
          } else if (gs.phase === "roundEnd") {
            // Round just ended — send roundEnd so the overlay shows
            socket.emit("game:roundEnd", {
              word: gs.currentWord,
              players: room.players,
              round: gs.currentRound,
              totalRounds: room.settings.rounds,
            });
          }

          socket.to(code).emit("chat:message", {
            id: `rejoin-${userId}-${Date.now()}`,
            type: "system",
            message: `${playerData.username} reconnected!`,
            timestamp: Date.now(),
          });
          socket.emit("chat:message", {
            id: `rejoin-self-${userId}-${Date.now()}`,
            type: "system",
            message: "You reconnected successfully!",
            timestamp: Date.now(),
          });
        } else {
          // New player joining
          socket.to(code).emit("room:playerJoined", {
            player: playerData,
            players: room.players,
          });
          const joinMsgId = `join-${userId}-${Date.now()}`;
          io.to(code).emit("chat:message", {
            id: joinMsgId,
            type: "system",
            message: `${playerData.username} joined the room!`,
            timestamp: Date.now(),
          });
        }

        console.log(`🏠 ${playerData.username} ${isReconnect ? "reconnected to" : "joined"} room ${code}`);
      } catch (err) {
        console.error("room:join error:", err);
        callback?.({ error: "Failed to join room" });
      }
    });

    socket.on("room:quickJoin", async ({ username, avatar }, callback) => {
      try {
        // Find a public room that is waiting and has space
        const room = await Room.findOne({
          isActive: true,
          "settings.isPrivate": false,
          "gameState.phase": "waiting",
          $expr: { $lt: [{ $size: "$players" }, "$settings.maxPlayers"] },
        });

        const code = room ? room.code : generateRoomCode();
        socket.emit("room:quickJoinCode", { code });
        callback?.({ code });
      } catch (err) {
        callback?.({ error: "No rooms available" });
      }
    });

    socket.on("room:leave", async () => {
      // Explicit leave — cancel any pending grace timer and leave immediately
      const pending = disconnectTimers.get(socket.id);
      if (pending) {
        clearTimeout(pending.timer);
        disconnectTimers.delete(socket.id);
      }
      await handlePlayerLeave(socket);
    });

    socket.on("room:updateSettings", async ({ settings }) => {
      try {
        const room = await Room.findOne({ code: socket.roomCode, isActive: true });
        if (!room) return;
        if (!isHost(socket, room)) return;
        Object.assign(room.settings, settings);
        await room.save();
        io.to(socket.roomCode).emit("room:settingsUpdated", { settings: room.settings });
      } catch (err) {
        console.error("settings update error:", err);
      }
    });

    // ── GAME FLOW ─────────────────────────────────────────────────────

    socket.on("game:start", async () => {
      try {
        const room = await Room.findOne({ code: socket.roomCode, isActive: true });
        if (!room) return;
        if (!isHost(socket, room)) return;
        // Prevent double-start if game already running
        if (room.gameState.phase !== "waiting") return;
        if (room.players.filter((p) => p.isOnline).length < 2) {
          socket.emit("game:error", { message: "Need at least 2 players to start" });
          return;
        }
        await startGame(room);
      } catch (err) {
        console.error("game:start error:", err);
      }
    });

    socket.on("game:wordChosen", async ({ word }) => {
      try {
        const room = await Room.findOne({ code: socket.roomCode, isActive: true });
        if (!room) return;
        const drawer = room.players.find((p) => p.socketId === socket.id);
        if (!drawer || room.gameState.currentDrawer !== drawer.userId) return;
        if (!room.gameState.wordChoices.includes(word)) return;

        room.gameState.currentWord = word;
        room.gameState.roundStartTime = new Date();
        room.gameState.phase = "drawing";
        room.gameState.hintLevel = 0;
        room.gameState.hintsRevealed = "_".repeat(word.length).split("").join(" ");
        await room.save();

        // Tell drawer the word
        socket.emit("game:drawingWord", { word });

        // Tell others the word length & blank hint
        const blanks = word.split("").map((c) => (c === " " ? "/" : "_")).join(" ");
        socket.to(socket.roomCode).emit("game:roundStarted", {
          word: blanks,
          wordLength: word.length,
          drawer: drawer.username,
          drawerId: drawer.userId,
          drawTime: room.settings.drawTime,
          round: room.gameState.currentRound,
          totalRounds: room.settings.rounds,
        });

        socket.emit("game:roundStarted", {
          word: blanks,
          wordLength: word.length,
          drawer: drawer.username,
          drawerId: drawer.userId,
          drawTime: room.settings.drawTime,
          round: room.gameState.currentRound,
          totalRounds: room.settings.rounds,
          isDrawer: true,
          actualWord: word,
        });

        startRoundTimer(room.code, room.settings.drawTime);
        scheduleHints(room.code, word, room.settings.drawTime);
        // Track wordsDrawn stat for the drawer (non-critical)
        User.findByIdAndUpdate(drawer.userId, { $inc: { "stats.wordsDrawn": 1 } }).catch(() => {});
      } catch (err) {
        console.error("wordChosen error:", err);
      }
    });

    // ── DRAWING ───────────────────────────────────────────────────────

    socket.on("canvas:draw", (data) => {
      socket.to(socket.roomCode).emit("canvas:draw", { ...data, socketId: socket.id });

      if (!socket.roomCode) return;
      if (!canvasStrokes.has(socket.roomCode)) canvasStrokes.set(socket.roomCode, []);
      const groups = canvasStrokes.get(socket.roomCode);

      // "start" event opens a new stroke group; "move"/"end" append to the last group
      if (data.type === "start") {
        // Cap total groups at 500 to limit memory
        if (groups.length < 500) {
          groups.push([{ ...data }]); // new group
        }
      } else if (data.type === "move" || data.type === "end") {
        if (groups.length > 0) {
          groups[groups.length - 1].push({ ...data }); // append to current group
        }
      } else if (data.type === "shape") {
        // Shapes are self-contained — each is its own group
        if (groups.length < 500) {
          groups.push([{ ...data }]);
        }
      }
    });

    socket.on("canvas:clear", () => {
      const room_code = socket.roomCode;
      if (!room_code) return;
      socket.to(room_code).emit("canvas:clear");
      canvasStrokes.set(room_code, []); // wipe all groups
    });

    socket.on("canvas:fill", (data) => {
      socket.to(socket.roomCode).emit("canvas:fill", data);
      // Each fill is its own group
      if (!socket.roomCode) return;
      if (!canvasStrokes.has(socket.roomCode)) canvasStrokes.set(socket.roomCode, []);
      const groups = canvasStrokes.get(socket.roomCode);
      if (groups.length < 500) {
        groups.push([{ ...data, type: "fill" }]);
      }
    });

    socket.on("canvas:undo", () => {
      if (!socket.roomCode) return;
      const groups = canvasStrokes.get(socket.roomCode) || [];

      // Pop the last stroke group
      if (groups.length > 0) groups.pop();

      // Signal others to flush their remoteQ immediately (arrives before replay)
      socket.to(socket.roomCode).emit("canvas:undo");

      // Then send the full replay so they redraw the post-undo state
      const strokes = groups.flat();
      socket.to(socket.roomCode).emit("canvas:replay", { strokes });
    });

    // ── CHAT & GUESSING ───────────────────────────────────────────────

    socket.on("chat:message", async ({ message }) => {
      try {
        if (!socket.roomCode || !message?.trim()) return;
        const msg = message.trim().slice(0, 100);
        const room = await Room.findOne({ code: socket.roomCode, isActive: true });
        if (!room) return;

        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) return;

        const isDrawer = room.gameState.currentDrawer === player.userId;
        const isPlaying = room.gameState.phase === "drawing";

        // Guessing logic
        if (isPlaying && !isDrawer && !player.hasGuessed) {
          if (checkGuess(msg, room.gameState.currentWord)) {
            await handleCorrectGuess(room, player, socket);
            return;
          }
          if (getCloseGuess(msg, room.gameState.currentWord)) {
            socket.emit("chat:message", {
              id: `close-${socket.id}-${Date.now()}`,
              type: "close",
              message: "🔥 So close! Try again!",
              timestamp: Date.now(),
            });
            return;
          }
        }

        // Don't allow drawer to reveal word
        if (isDrawer && isPlaying) {
          const word = room.gameState.currentWord?.toLowerCase();
          if (msg.toLowerCase().includes(word)) {
            socket.emit("chat:message", {
              id: `noword-${socket.id}-${Date.now()}`,
              type: "system",
              message: "You can't say the word!",
              timestamp: Date.now(),
            });
            return;
          }
        }

        const chatMsg = {
          id: uuidv4(),
          userId: player.userId,
          username: player.username,
          message: msg,
          type: "chat",
          timestamp: Date.now(),
        };

        io.to(socket.roomCode).emit("chat:message", chatMsg);
      } catch (err) {
        console.error("chat:message error:", err);
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────

    socket.on("disconnect", async (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | reason: ${reason}`);

      // Grace period: wait 8 seconds before treating as a real leave.
      // If the player reconnects within that window the timer is cancelled
      // and nothing happens — page reload / brief network blip is invisible.
      const gracePeriodMs = 8000;

      const timer = setTimeout(async () => {
        disconnectTimers.delete(socket.id);
        await handlePlayerLeave(socket);
      }, gracePeriodMs);

      disconnectTimers.set(socket.id, {
        timer,
        roomCode:  socket.roomCode,
        userId:    socket.user?._id?.toString() || socket.playerData?.userId,
        socketId:  socket.id,
      });
    });
  });

  return io;
};

// ── GAME LOGIC HELPERS ─────────────────────────────────────────────────────────

async function startGame(room) {
  room.gameState.currentRound = 0;
  room.gameState.phase = "starting";
  // Reset scores
  room.players.forEach((p) => { p.score = 0; p.hasGuessed = false; });
  await room.save();

  io.to(room.code).emit("game:starting", { countdown: 3 });

  setTimeout(async () => {
    await nextRound(room.code);
  }, 3000);
}

async function nextRound(code) {
  const room = await Room.findOne({ code, isActive: true });
  if (!room) return;

  const onlinePlayers = room.players.filter((p) => p.isOnline);
  if (onlinePlayers.length < 2) {
    await endGame(room);
    return;
  }

  room.gameState.currentRound += 1;

  if (room.gameState.currentRound > room.settings.rounds) {
    await endGame(room);
    return;
  }

  // Pick next drawer (rotate)
  const lastDrawerIdx = onlinePlayers.findIndex(
    (p) => p.userId === room.gameState.currentDrawer
  );
  const nextDrawerIdx = (lastDrawerIdx + 1) % onlinePlayers.length;
  const nextDrawer = onlinePlayers[nextDrawerIdx];

  room.gameState.currentDrawer = nextDrawer.userId;
  room.gameState.currentWord = null;
  room.gameState.wordChoices = [];
  room.gameState.phase = "starting";
  room.players.forEach((p) => { p.hasGuessed = false; });
  await room.save();

  // Clear stored canvas strokes for this room — fresh canvas for the new round
  canvasStrokes.set(code, []);

  // Get word choices based on category
  const category = room.settings.useCustomWords && room.settings.customWords.length > 0
    ? null
    : room.settings.wordCategory;

  let wordChoices;
  if (category === null && room.settings.customWords.length > 0) {
    const shuffled = [...room.settings.customWords].sort(() => Math.random() - 0.5);
    wordChoices = shuffled.slice(0, 3);
  } else {
    wordChoices = getRandomWords(category, 3);
  }

  room.gameState.wordChoices = wordChoices;
  await room.save();

  // Notify all players
  io.to(code).emit("game:newRound", {
    round: room.gameState.currentRound,
    totalRounds: room.settings.rounds,
    drawer: nextDrawer.username,
    drawerId: nextDrawer.userId,
    players: room.players,
  });

  // Send word choices to drawer
  const drawerSocket = findSocketByUserId(nextDrawer.userId, code);
  if (drawerSocket) {
    drawerSocket.emit("game:chooseWord", {
      words: wordChoices,
      timeToChoose: 15,
    });
  }

  // Auto-choose if drawer doesn't pick in 15s
  setTimeout(async () => {
    const r = await Room.findOne({ code, isActive: true });
    if (!r || r.gameState.currentWord) return;
    if (r.gameState.currentDrawer !== nextDrawer.userId) return;

    const autoWord = wordChoices[Math.floor(Math.random() * wordChoices.length)];
    const liveSocket = findSocketByUserId(nextDrawer.userId, code);

    if (liveSocket) {
      // Drawer still connected — let client handle via normal flow
      liveSocket.emit("game:wordChosen:auto", { word: autoWord });
    } else {
      // Drawer disconnected — apply directly on server
      r.gameState.currentWord = autoWord;
      r.gameState.roundStartTime = new Date();
      r.gameState.phase = "drawing";
      r.gameState.hintLevel = 0;
      r.gameState.hintsRevealed = "_".repeat(autoWord.length).split("").join(" ");
      await r.save();

      const blanks = autoWord.split("").map((c) => (c === " " ? "/" : "_")).join(" ");
      io.to(code).emit("game:roundStarted", {
        word: blanks,
        wordLength: autoWord.length,
        drawer: nextDrawer.username,
        drawerId: nextDrawer.userId,
        drawTime: r.settings.drawTime,
        round: r.gameState.currentRound,
        totalRounds: r.settings.rounds,
      });
      startRoundTimer(code, r.settings.drawTime);
      scheduleHints(code, autoWord, r.settings.drawTime);
    }
  }, 15000);
}

async function handleCorrectGuess(room, player, socket) {
  const onlinePlayers = room.players.filter((p) => p.isOnline);
  const alreadyGuessed = room.players.filter((p) => p.hasGuessed).length;
  const totalGuessers = onlinePlayers.length - 1;

  // Score: 500 base, minus time elapsed, bonus for being first
  const elapsed = Date.now() - new Date(room.gameState.roundStartTime).getTime();
  const timeRatio = Math.max(0, 1 - elapsed / (room.settings.drawTime * 1000));
  const positionBonus = (totalGuessers - alreadyGuessed) * 50;
  const points = Math.floor(200 + timeRatio * 300 + positionBonus);

  // Drawer also gets points per correct guess
  const drawerPoints = Math.floor(points * 0.3);

  room.players = room.players.map((p) => {
    const base = typeof p.toObject === "function" ? p.toObject() : p.toJSON ? p.toJSON() : { ...p._doc || p };
    if (p.userId === player.userId) {
      return { ...base, hasGuessed: true, score: p.score + points };
    }
    if (p.userId === room.gameState.currentDrawer) {
      return { ...base, score: p.score + drawerPoints };
    }
    return p;
  });

  await room.save();

  io.to(room.code).emit("game:correctGuess", {
    userId: player.userId,
    username: player.username,
    points,
    players: room.players,
  });

  io.to(room.code).emit("chat:message", {
    id: `correct-${player.userId}-${Date.now()}`,
    type: "correct",
    message: `${player.username} guessed the word! (+${points} pts)`,
    timestamp: Date.now(),
  });

  // Check if all guessed
  const updatedRoom = await Room.findOne({ code: room.code });
  const onlineGuessers = updatedRoom.players.filter(
    (p) => p.isOnline && p.userId !== updatedRoom.gameState.currentDrawer
  );
  const allGuessed = onlineGuessers.every((p) => p.hasGuessed);

  // Track correctGuesses stat (non-critical)
  User.findByIdAndUpdate(player.userId, { $inc: { "stats.correctGuesses": 1 } }).catch(() => {});

  if (allGuessed) {
    clearRoundTimer(room.code);
    clearHintTimers(room.code);
    await endRound(room.code);
  }
}

async function endRound(code) {
  const room = await Room.findOne({ code, isActive: true });
  if (!room) return;

  // Award drawer consolation points if nobody guessed the word
  const guessers = room.players.filter(
    (p) => p.isOnline && p.userId !== room.gameState.currentDrawer
  );
  const nobodyGuessed = guessers.length > 0 && guessers.every((p) => !p.hasGuessed);

  if (nobodyGuessed) {
    const consolationPoints = 50; // small reward for drawing when nobody guesses
    room.players = room.players.map((p) => {
      if (p.userId === room.gameState.currentDrawer) {
        const base = typeof p.toObject === "function" ? p.toObject()
          : p.toJSON ? p.toJSON() : { ...p._doc || p };
        return { ...base, score: p.score + consolationPoints };
      }
      return p;
    });
    // Notify players about the consolation points
    io.to(code).emit("chat:message", {
      id: `consolation-${code}-${Date.now()}`,
      type: "system",
      message: `Nobody guessed! Drawer gets ${consolationPoints} consolation pts 🎨`,
      timestamp: Date.now(),
    });
  }

  room.gameState.phase = "roundEnd";
  await room.save();

  io.to(code).emit("game:roundEnd", {
    word: room.gameState.currentWord,
    players: room.players,
    round: room.gameState.currentRound,
    totalRounds: room.settings.rounds,
    nobodyGuessed,
  });

  // Next round after 5s
  setTimeout(() => nextRound(code), 5000);
}

async function endGame(room) {
  clearRoundTimer(room.code);
  clearHintTimers(room.code);

  room.gameState.phase = "gameEnd";
  room.isActive = false;
  await room.save();

  // Update player stats in DB and recalculate rank
  const onlinePlayers = room.players.filter((p) => p.isOnline);
  const winner = [...onlinePlayers].sort((a, b) => b.score - a.score)[0];

  for (const player of onlinePlayers) {
    try {
      const updated = await User.findByIdAndUpdate(
        player.userId,
        {
          $inc: {
            "stats.totalGames": 1,
            "stats.totalScore": player.score,
            "stats.gamesWon": player.userId === winner?.userId ? 1 : 0,
          },
        },
        { new: true }
      );
      if (updated) {
        // Recalculate rank based on new total score
        updated.updateRank();
        await updated.save();
      }
    } catch (e) { /* non-critical — guest users won't have a DB entry */ }
  }

  io.to(room.code).emit("game:end", {
    players: room.players.sort((a, b) => b.score - a.score),
    winner,
  });
}

function startRoundTimer(code, drawTime) {
  clearRoundTimer(code);
  const timer = setTimeout(async () => {
    await endRound(code);
  }, drawTime * 1000);
  gameTimers.set(code, timer);

  // Emit timer ticks
  let remaining = drawTime;
  const tick = setInterval(() => {
    remaining--;
    io.to(code).emit("game:timer", { remaining });
    if (remaining <= 0) clearInterval(tick);
  }, 1000);
  gameTimers.set(`${code}_tick`, tick);
}

function clearRoundTimer(code) {
  const timer = gameTimers.get(code);
  if (timer) clearTimeout(timer);
  const tick = gameTimers.get(`${code}_tick`);
  if (tick) clearInterval(tick);
}

function scheduleHints(code, word, drawTime) {
  clearHintTimers(code);
  // Reveal 1 letter at 50% time, 2 total at 75% time (cumulative)
  const hint1Time = (drawTime * 0.5) * 1000;
  const hint2Time = (drawTime * 0.75) * 1000;

  const t1 = setTimeout(async () => {
    const hint = getWordHint(word, 1, null);
    io.to(code).emit("game:hint", { hint });
    const r = await Room.findOne({ code });
    if (r) { r.gameState.hintsRevealed = hint; r.gameState.hintLevel = 1; await r.save(); }
  }, hint1Time);

  const t2 = setTimeout(async () => {
    // Fetch the current hintsRevealed so hint2 builds on hint1's letters
    const r = await Room.findOne({ code });
    const prevHint = r?.gameState?.hintsRevealed || null;
    const hint = getWordHint(word, 2, prevHint);
    io.to(code).emit("game:hint", { hint });
    if (r) { r.gameState.hintsRevealed = hint; r.gameState.hintLevel = 2; await r.save(); }
  }, hint2Time);

  hintTimers.set(code, [t1, t2]);
}

function clearHintTimers(code) {
  const timers = hintTimers.get(code) || [];
  timers.forEach(clearTimeout);
  hintTimers.delete(code);
}

async function handlePlayerLeave(socket) {
  if (!socket.roomCode) return;
  try {
    const room = await Room.findOne({ code: socket.roomCode, isActive: true });
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    player.isOnline = false;
    await room.save();

    io.to(socket.roomCode).emit("room:playerLeft", {
      userId: player.userId,
      username: player.username,
      players: room.players,
    });

    io.to(socket.roomCode).emit("chat:message", {
      id: `left-${player.userId}-${Date.now()}`,
      type: "system",
      message: `${player.username} left the room`,
      timestamp: Date.now(),
    });

    const onlineCount = room.players.filter((p) => p.isOnline).length;

    // If game in progress and drawer left, skip round
    if (
      room.gameState.phase === "drawing" &&
      room.gameState.currentDrawer === player.userId
    ) {
      clearRoundTimer(socket.roomCode);
      clearHintTimers(socket.roomCode);
      io.to(socket.roomCode).emit("game:roundEnd", {
        word: room.gameState.currentWord,
        players: room.players,
        reason: "drawer_left",
      });
      setTimeout(() => nextRound(socket.roomCode), 3000);
    }

    // Transfer host if host left
    if (room.host === player.userId) {
      const newHost = room.players.find((p) => p.isOnline);
      if (newHost) {
        room.host = newHost.userId;
        await room.save();
        io.to(socket.roomCode).emit("room:hostChanged", {
          newHostId: newHost.userId,
          newHostName: newHost.username,
        });
      }
    }

    if (onlineCount === 0) {
      room.isActive = false;
      await room.save();
    }
  } catch (err) {
    console.error("handlePlayerLeave error:", err);
  }
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    host: room.host,
    players: room.players,
    settings: room.settings,
    gameState: {
      phase: room.gameState.phase,
      currentRound: room.gameState.currentRound,
      totalRounds: room.settings.rounds,
      currentDrawer: room.gameState.currentDrawer,
      wordLength: room.gameState.currentWord?.length || 0,
      hintsRevealed: room.gameState.hintsRevealed,
      hintLevel: room.gameState.hintLevel,
      drawTime: room.settings.drawTime,
      // currentWord intentionally omitted — sent separately only to the drawer
    },
  };
}

function isHost(socket, room) {
  const player = room.players.find((p) => p.socketId === socket.id);
  return player && player.userId === room.host;
}

function findSocketByUserId(userId, roomCode) {
  const room = io.sockets.adapter.rooms.get(roomCode);
  if (!room) return null;
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    if (s && (s.user?._id?.toString() === userId || s.id === userId)) {
      return s;
    }
  }
  return null;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = { initSocket };
