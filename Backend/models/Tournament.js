const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "single-elimination",
        "double-elimination",
        "round-robin",
        "swiss",
      ],
      default: "single-elimination",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "registration",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "scheduled",
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 4,
      max: 64,
    },
    currentParticipants: {
      type: Number,
      default: 0,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        registrationDate: {
          type: Date,
          default: Date.now,
        },
        eliminated: {
          type: Boolean,
          default: false,
        },
        eliminationRound: {
          type: Number,
          default: null,
        },
      },
    ],
    rounds: [
      {
        roundNumber: {
          type: Number,
          required: true,
        },
        matches: [
          {
            matchNumber: {
              type: Number,
              required: true,
            },
            player1: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            player2: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            winner: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            roomId: {
              type: String,
            },
            status: {
              type: String,
              enum: ["pending", "in-progress", "completed", "no-show"],
              default: "pending",
            },
            startTime: Date,
            endTime: Date,
            gameDetails: {
              totalTurns: Number,
              winningScore: Number,
              specialCardsUsed: Number,
            },
          },
        ],
      },
    ],
    schedule: {
      registrationStart: {
        type: Date,
        required: true,
      },
      registrationEnd: {
        type: Date,
        required: true,
      },
      tournamentStart: {
        type: Date,
        required: true,
      },
      tournamentEnd: Date,
    },
    prizes: {
      first: {
        type: String,
        default: "Champion Badge",
      },
      second: {
        type: String,
        default: "Runner-up Badge",
      },
      third: {
        type: String,
        default: "Third Place Badge",
      },
    },
    rules: {
      gameVariant: {
        type: String,
        enum: ["classic", "speed", "elimination", "team"],
        default: "classic",
      },
      timeLimit: {
        type: Number, // in minutes
        default: 30,
      },
      allowSpectators: {
        type: Boolean,
        default: true,
      },
      customRules: [
        {
          name: String,
          description: String,
          enabled: Boolean,
        },
      ],
    },
    bracket: {
      type: mongoose.Schema.Types.Mixed, // Flexible structure for different tournament types
      default: {},
    },
    stats: {
      totalMatches: {
        type: Number,
        default: 0,
      },
      completedMatches: {
        type: Number,
        default: 0,
      },
      averageMatchDuration: {
        type: Number,
        default: 0,
      },
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    runnerUp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    thirdPlace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
tournamentSchema.index({ status: 1, "schedule.registrationStart": 1 });
tournamentSchema.index({ organizer: 1, status: 1 });
tournamentSchema.index({ "participants.user": 1 });
tournamentSchema.index({ createdAt: -1 });

// Virtual for registration status
tournamentSchema.virtual("registrationOpen").get(function () {
  const now = new Date();
  return (
    this.status === "registration" &&
    now >= this.schedule.registrationStart &&
    now <= this.schedule.registrationEnd &&
    this.currentParticipants < this.maxParticipants
  );
});

// Methods
tournamentSchema.methods.addParticipant = function (userId) {
  if (this.currentParticipants >= this.maxParticipants) {
    throw new Error("Tournament is full");
  }

  if (this.participants.some((p) => p.user.toString() === userId.toString())) {
    throw new Error("User already registered");
  }

  this.participants.push({ user: userId });
  this.currentParticipants += 1;
  return this.save();
};

tournamentSchema.methods.removeParticipant = function (userId) {
  const index = this.participants.findIndex(
    (p) => p.user.toString() === userId.toString()
  );
  if (index === -1) {
    throw new Error("User not found in tournament");
  }

  this.participants.splice(index, 1);
  this.currentParticipants -= 1;
  return this.save();
};

tournamentSchema.methods.generateBracket = function () {
  if (this.type === "single-elimination") {
    return this.generateSingleEliminationBracket();
  } else if (this.type === "round-robin") {
    return this.generateRoundRobinBracket();
  }
  // Add other tournament types as needed
};

tournamentSchema.methods.generateSingleEliminationBracket = function () {
  const participants = this.participants.filter((p) => !p.eliminated);
  const numParticipants = participants.length;

  // Ensure power of 2 for single elimination
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(numParticipants)));

  let rounds = [];
  let currentRound = 1;
  let matchesInRound = nextPowerOf2 / 2;

  // First round
  let matches = [];
  for (let i = 0; i < matchesInRound; i++) {
    const player1 = participants[i * 2] || null;
    const player2 = participants[i * 2 + 1] || null;

    matches.push({
      matchNumber: i + 1,
      player1: player1 ? player1.user : null,
      player2: player2 ? player2.user : null,
      status: player1 && player2 ? "pending" : "completed",
      winner: !player2 && player1 ? player1.user : null,
    });
  }

  rounds.push({
    roundNumber: currentRound,
    matches: matches,
  });

  // Generate subsequent rounds
  while (matchesInRound > 1) {
    currentRound++;
    matchesInRound = matchesInRound / 2;
    matches = [];

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        matchNumber: i + 1,
        player1: null,
        player2: null,
        status: "pending",
      });
    }

    rounds.push({
      roundNumber: currentRound,
      matches: matches,
    });
  }

  this.rounds = rounds;
  this.bracket = { type: "single-elimination", rounds: rounds };
  return this.save();
};

module.exports = mongoose.model("Tournament", tournamentSchema);
