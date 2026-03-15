const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
router.post(
  "/register",
  [
    body("username").trim().isLength({ min: 3, max: 20 }).withMessage("Username must be 3-20 characters"),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { username, email, password } = req.body;
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.status(400).json({ error: "Username or email already taken" });
      }
      const user = await User.create({ username, email, password });
      const token = signToken(user._id);
      res.status(201).json({ token, user: user.toPublicJSON() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = signToken(user._id);
      res.json({ token, user: user.toPublicJSON() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/auth/guest - Create guest session
router.post("/guest", async (req, res) => {
  try {
    const { username } = req.body;
    const guestName = username?.trim() || `Guest_${Math.floor(Math.random() * 9999)}`;
    // Create ephemeral user
    const guestUser = await User.create({
      username: `${guestName}_${uuidv4().slice(0, 4)}`,
      email: `guest_${uuidv4()}@arena.local`,
      password: uuidv4(),
      isGuest: true,
    });
    const token = signToken(guestUser._id);
    res.json({ token, user: guestUser.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

module.exports = router;
