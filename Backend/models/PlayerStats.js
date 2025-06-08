// Player Statistics model for detailed game analytics
const mongoose = require("mongoose");

const playerStatsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Game Statistics
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesLost: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }, // Calculated field

    // Card Statistics
    totalCardsPlayed: { type: Number, default: 0 },
    wildCardsUsed: { type: Number, default: 0 },
    drawTwoCardsUsed: { type: Number, default: 0 },
    skipCardsUsed: { type: Number, default: 0 },
    reverseCardsUsed: { type: Number, default: 0 },

    // UNO Statistics
    unosCalled: { type: Number, default: 0 },
    unosSuccessful: { type: Number, default: 0 },
    unosPenalized: { type: Number, default: 0 },

    // Time Statistics
    totalPlayTime: { type: Number, default: 0 }, // in seconds
    averageGameDuration: { type: Number, default: 0 },
    fastestWin: { type: Number, default: null }, // in seconds

    // Streak Statistics
    currentWinStreak: { type: Number, default: 0 },
    longestWinStreak: { type: Number, default: 0 },
    currentLossStreak: { type: Number, default: 0 },
    longestLossStreak: { type: Number, default: 0 },

    // Social Statistics
    friendsInvited: { type: Number, default: 0 },
    gamesWithFriends: { type: Number, default: 0 },
    messagesInChat: { type: Number, default: 0 },

    // Achievement Progress
    achievements: [
      {
        achievement: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Achievement",
        },
        unlockedAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 0 },
      },
    ],

    // Rankings
    ranking: {
      current: { type: Number, default: 1000 },
      highest: { type: Number, default: 1000 },
      tier: {
        type: String,
        enum: ["bronze", "silver", "gold", "platinum", "diamond", "master"],
        default: "bronze",
      },
    },

    // Recent Games (last 10)
    recentGames: [
      {
        gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
        result: { type: String, enum: ["win", "loss"] },
        duration: Number,
        playedAt: { type: Date, default: Date.now },
        rankingChange: Number,
      },
    ],

    // Daily/Weekly/Monthly statistics
    dailyStats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    weeklyStats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    monthlyStats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate win rate before saving
playerStatsSchema.pre("save", function (next) {
  if (this.gamesPlayed > 0) {
    this.winRate = Math.round((this.gamesWon / this.gamesPlayed) * 100);
  }
  next();
});

// Static method to update stats after a game
playerStatsSchema.statics.updateAfterGame = async function (
  userId,
  gameResult
) {
  const stats =
    (await this.findOne({ user: userId })) || new this({ user: userId });

  stats.gamesPlayed += 1;
  if (gameResult.result === "win") {
    stats.gamesWon += 1;
    stats.currentWinStreak += 1;
    stats.currentLossStreak = 0;
    stats.longestWinStreak = Math.max(
      stats.longestWinStreak,
      stats.currentWinStreak
    );
  } else {
    stats.gamesLost += 1;
    stats.currentLossStreak += 1;
    stats.currentWinStreak = 0;
    stats.longestLossStreak = Math.max(
      stats.longestLossStreak,
      stats.currentLossStreak
    );
  }

  // Update daily stats
  const today = new Date();
  const lastUpdate = new Date(stats.dailyStats.lastUpdated);
  if (today.toDateString() !== lastUpdate.toDateString()) {
    stats.dailyStats.gamesPlayed = 1;
    stats.dailyStats.gamesWon = gameResult.result === "win" ? 1 : 0;
  } else {
    stats.dailyStats.gamesPlayed += 1;
    if (gameResult.result === "win") stats.dailyStats.gamesWon += 1;
  }
  stats.dailyStats.lastUpdated = today;

  // Add to recent games
  stats.recentGames.unshift({
    gameId: gameResult.gameId,
    result: gameResult.result,
    duration: gameResult.duration,
    rankingChange: gameResult.rankingChange || 0,
  });

  // Keep only last 10 games
  if (stats.recentGames.length > 10) {
    stats.recentGames = stats.recentGames.slice(0, 10);
  }

  await stats.save();
  return stats;
};

module.exports = mongoose.model("PlayerStats", playerStatsSchema);
