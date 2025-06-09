const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and bot objects
    ref: "User",
  },
  socketId: String,
  hand: Array, // Cards in hand
  saidUno: { type: Boolean, default: false },
  isBot: { type: Boolean, default: false },
});

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    players: [playerSchema],
    deck: Array,
    discardPile: Array,
    currentTurn: Number,
    direction: { type: String, enum: ["clockwise", "counter"] },
    drawStack: { type: Number, default: 0 },
    currentColor: String,
    status: {
      type: String,
      enum: ["waiting", "active", "finished"],
      default: "waiting",
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    allowBots: { type: Boolean, default: true },
    maxPlayers: { type: Number, default: 4 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
