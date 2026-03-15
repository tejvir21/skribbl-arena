const express = require("express");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/leaderboard?limit=50&page=1
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const players = await User.find({ isGuest: false })
      .select("username avatar stats createdAt")
      .sort({ "stats.totalScore": -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ isGuest: false });

    res.json({
      players: players.map((p, i) => ({
        rank: skip + i + 1,
        _id: p._id,
        username: p.username,
        avatar: p.avatar,
        stats: p.stats,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard/me - Get current user's rank
router.get("/me", authenticate, async (req, res) => {
  try {
    const rank = await User.countDocuments({
      isGuest: false,
      "stats.totalScore": { $gt: req.user.stats.totalScore },
    });
    res.json({ rank: rank + 1, user: req.user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
