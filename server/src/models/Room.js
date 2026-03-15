const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    host: { type: String, required: true }, // socket id or user id
    players: [
      {
        userId: String,
        username: String,
        avatar: String,
        socketId: String,
        score: { type: Number, default: 0 },
        isReady: { type: Boolean, default: false },
        hasGuessed: { type: Boolean, default: false },
        isOnline: { type: Boolean, default: true },
      },
    ],
    settings: {
      maxPlayers: { type: Number, default: 8 },
      rounds: { type: Number, default: 3 },
      drawTime: { type: Number, default: 80 },
      wordCategory: { type: String, default: "general" },
      customWords: [String],
      useCustomWords: { type: Boolean, default: false },
      isPrivate: { type: Boolean, default: false },
      language: { type: String, default: "en" },
    },
    gameState: {
      phase: {
        type: String,
        enum: ["waiting", "starting", "drawing", "roundEnd", "gameEnd"],
        default: "waiting",
      },
      currentRound: { type: Number, default: 0 },
      currentDrawer: String,
      currentWord: String,
      wordChoices: [String],
      roundStartTime: Date,
      hintLevel: { type: Number, default: 0 },
      hintsRevealed: String,
    },
    chatLog: [
      {
        userId: String,
        username: String,
        message: String,
        type: { type: String, enum: ["chat", "guess", "system", "correct"], default: "chat" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ isActive: 1, "settings.isPrivate": 1 });
// Auto-delete rooms 24 hours after last update
roomSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Room", roomSchema);
