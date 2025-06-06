const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    googleId: { type: String, unique: true },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    history: [
      {
        gameId: String,
        result: { type: String, enum: ["win", "loss"] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);