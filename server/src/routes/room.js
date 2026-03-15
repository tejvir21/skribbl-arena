const express = require("express");
const Room = require("../models/Room");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// GET /api/rooms - List public rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find({
      isActive: true,
      "settings.isPrivate": false,
      "gameState.phase": { $in: ["waiting", "drawing"] },
    })
      .select("code name players settings gameState createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    const formatted = rooms.map((r) => ({
      code: r.code,
      name: r.name || `${r.players[0]?.username || "Anonymous"}'s Room`,
      playerCount: r.players.filter((p) => p.isOnline).length,
      maxPlayers: r.settings.maxPlayers,
      phase: r.gameState.phase,
      round: r.gameState.currentRound,
      totalRounds: r.settings.rounds,
      category: r.settings.wordCategory,
    }));

    res.json({ rooms: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms - Create room
router.post("/", authenticate, async (req, res) => {
  try {
    const { settings = {} } = req.body;
    let code = generateRoomCode();
    // Ensure uniqueness
    while (await Room.findOne({ code, isActive: true })) {
      code = generateRoomCode();
    }
    const room = await Room.create({
      code,
      host: req.user._id.toString(),
      settings: {
        maxPlayers: settings.maxPlayers || 8,
        rounds: settings.rounds || 3,
        drawTime: settings.drawTime || 80,
        wordCategory: settings.wordCategory || "general",
        customWords: settings.customWords || [],
        useCustomWords: settings.useCustomWords || false,
        isPrivate: settings.isPrivate || false,
      },
    });
    res.status(201).json({ room: { code: room.code, settings: room.settings } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:code
router.get("/:code", async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase(), isActive: true });
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({
      code: room.code,
      playerCount: room.players.filter((p) => p.isOnline).length,
      maxPlayers: room.settings.maxPlayers,
      phase: room.gameState.phase,
      settings: room.settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
