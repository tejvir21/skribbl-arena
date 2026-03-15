const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    stats: {
      totalGames: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      correctGuesses: { type: Number, default: 0 },
      wordsDrawn: { type: Number, default: 0 },
      rank: { type: String, default: "Novice" },
    },
    isGuest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update rank based on total score
userSchema.methods.updateRank = function () {
  const score = this.stats.totalScore;
  if (score >= 10000) this.stats.rank = "Legend";
  else if (score >= 5000) this.stats.rank = "Master";
  else if (score >= 2000) this.stats.rank = "Expert";
  else if (score >= 500) this.stats.rank = "Skilled";
  else this.stats.rank = "Novice";
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    avatar: this.avatar,
    stats: this.stats,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
