const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: String,
    username: {
      type: String,
      unique: true,
      required: false,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    avatar: {
      type: String,
      default: null,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    history: [
      {
        gameId: String,
        result: { type: String, enum: ["win", "loss"] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    profile: {
      bio: {
        type: String,
        maxlength: 500,
        default: "",
      },
      country: String,
      favoriteGameMode: {
        type: String,
        enum: ["classic", "speed", "tournament", "team"],
        default: "classic",
      },
      badges: [
        {
          name: String,
          icon: String,
          earnedAt: Date,
        },
      ],
      preferences: {
        language: {
          type: String,
          default: "en",
        },
        theme: {
          type: String,
          enum: ["light", "dark", "auto"],
          default: "auto",
        },
        notifications: {
          gameInvites: { type: Boolean, default: true },
          friendRequests: { type: Boolean, default: true },
          tournaments: { type: Boolean, default: true },
          achievements: { type: Boolean, default: true },
        },
        privacy: {
          showOnlineStatus: { type: Boolean, default: true },
          showGameHistory: { type: Boolean, default: true },
          allowFriendRequests: { type: Boolean, default: true },
        },
      },
    },
    gameSettings: {
      autoUno: { type: Boolean, default: false },
      cardAnimations: { type: Boolean, default: true },
      soundEffects: { type: Boolean, default: true },
      backgroundMusic: { type: Boolean, default: false },
      quickPlay: { type: Boolean, default: false },
    },
    status: {
      isOnline: { type: Boolean, default: false },
      lastActive: { type: Date, default: Date.now },
      currentRoom: String,
      currentGame: String,
      status: {
        type: String,
        enum: ["available", "in-game", "away", "busy"],
        default: "available",
      },
    },
    achievements: {
      total: { type: Number, default: 0 },
      recent: [
        {
          name: String,
          icon: String,
          unlockedAt: Date,
        },
      ],
    },
    level: {
      current: { type: Number, default: 1 },
      experience: { type: Number, default: 0 },
      experienceToNext: { type: Number, default: 100 },
    },
    subscription: {
      isPremium: { type: Boolean, default: false },
      premiumUntil: Date,
      type: {
        type: String,
        enum: ["free", "basic", "premium"],
        default: "free",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
userSchema.index({ "status.isOnline": 1 });
userSchema.index({ "level.current": -1 });

// Virtual for user's rank based on level
userSchema.virtual("rank").get(function () {
  const level = this.level.current;
  if (level >= 50) return "Grandmaster";
  if (level >= 40) return "Master";
  if (level >= 30) return "Expert";
  if (level >= 20) return "Advanced";
  if (level >= 10) return "Intermediate";
  return "Beginner";
});

// Virtual for friend count
userSchema.virtual("friendCount").get(function () {
  return this.friends ? this.friends.length : 0;
});

// Methods
userSchema.methods.addExperience = function (points) {
  this.level.experience += points;

  while (this.level.experience >= this.level.experienceToNext) {
    this.level.experience -= this.level.experienceToNext;
    this.level.current += 1;
    this.level.experienceToNext = this.level.current * 100; // Scaling XP requirement
  }

  return this.save();
};

userSchema.methods.updateOnlineStatus = function (isOnline) {
  this.status.isOnline = isOnline;
  this.status.lastActive = new Date();
  return this.save();
};

userSchema.methods.setCurrentRoom = function (roomId) {
  this.status.currentRoom = roomId;
  this.status.status = roomId ? "in-game" : "available";
  return this.save();
};

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Pre-save middleware to ensure username exists
userSchema.pre("save", function (next) {
  if (!this.username && this.name) {
    this.username = this.name.toLowerCase().replace(/\s+/g, "");
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
