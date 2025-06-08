// Achievement model for tracking player accomplishments
const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["wins", "games", "cards", "social", "special"],
      required: true,
    },
    condition: {
      type: String,
      required: true, // e.g., "wins >= 10", "gamesPlayed >= 100"
    },
    reward: {
      points: { type: Number, default: 0 },
      title: { type: String },
      badge: { type: String },
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      default: "common",
    },
    icon: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Achievement", achievementSchema);
