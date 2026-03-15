const express = require("express");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/users/:username
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username, isGuest: false });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me - Update profile
router.patch("/me", authenticate, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};
    if (username) {
      const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ error: "Username taken" });
      updates.username = username;
    }
    if (avatar) updates.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
