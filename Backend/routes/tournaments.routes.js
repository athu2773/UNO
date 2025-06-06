const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const PlayerStats = require("../models/PlayerStats");
const Achievement = require("../models/Achievement");
const { isAuthenticated: auth } = require("../middlewares/auth.middleware");

// Get all tournaments with filters
router.get("/", async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;

    const tournaments = await Tournament.find(query)
      .populate("organizer", "username")
      .populate("participants.user", "username")
      .populate("winner", "username")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tournament.countDocuments(query);

    res.json({
      tournaments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tournament by ID
router.get("/:id", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate("organizer", "username email")
      .populate("participants.user", "username")
      .populate("rounds.matches.player1", "username")
      .populate("rounds.matches.player2", "username")
      .populate("rounds.matches.winner", "username")
      .populate("winner", "username")
      .populate("runnerUp", "username")
      .populate("thirdPlace", "username");

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new tournament
router.post("/", auth, async (req, res) => {
  try {
    const tournamentData = {
      ...req.body,
      organizer: req.user.id,
    };

    // Validate schedule dates
    const now = new Date();
    if (new Date(tournamentData.schedule.registrationStart) < now) {
      return res
        .status(400)
        .json({ message: "Registration start date must be in the future" });
    }

    if (
      new Date(tournamentData.schedule.registrationEnd) <=
      new Date(tournamentData.schedule.registrationStart)
    ) {
      return res
        .status(400)
        .json({ message: "Registration end date must be after start date" });
    }

    if (
      new Date(tournamentData.schedule.tournamentStart) <=
      new Date(tournamentData.schedule.registrationEnd)
    ) {
      return res
        .status(400)
        .json({ message: "Tournament start must be after registration ends" });
    }

    const tournament = new Tournament(tournamentData);
    await tournament.save();

    await tournament.populate("organizer", "username email");

    res.status(201).json(tournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Register for tournament
router.post("/:id/register", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!tournament.registrationOpen) {
      return res.status(400).json({ message: "Registration is not open" });
    }

    await tournament.addParticipant(req.user.id);
    await tournament.populate("participants.user", "username");

    res.json({ message: "Successfully registered for tournament", tournament });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Unregister from tournament
router.delete("/:id/register", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (
      tournament.status !== "registration" &&
      tournament.status !== "scheduled"
    ) {
      return res
        .status(400)
        .json({ message: "Cannot unregister from active tournament" });
    }

    await tournament.removeParticipant(req.user.id);

    res.json({ message: "Successfully unregistered from tournament" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Start tournament (organizer only)
router.post("/:id/start", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.organizer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only organizer can start tournament" });
    }

    if (tournament.status !== "registration") {
      return res.status(400).json({ message: "Tournament cannot be started" });
    }

    if (tournament.currentParticipants < 4) {
      return res
        .status(400)
        .json({ message: "Minimum 4 participants required" });
    }

    tournament.status = "in-progress";
    await tournament.generateBracket();

    res.json({ message: "Tournament started successfully", tournament });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update match result
router.post("/:id/matches/:matchId/result", auth, async (req, res) => {
  try {
    const { winner, gameDetails } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Find the match
    let targetMatch = null;
    let targetRound = null;

    for (let round of tournament.rounds) {
      const match = round.matches.find(
        (m) => m._id.toString() === req.params.matchId
      );
      if (match) {
        targetMatch = match;
        targetRound = round;
        break;
      }
    }

    if (!targetMatch) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Verify user is participant in this match
    if (
      targetMatch.player1.toString() !== req.user.id &&
      targetMatch.player2.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this match" });
    }

    // Update match
    targetMatch.winner = winner;
    targetMatch.status = "completed";
    targetMatch.endTime = new Date();
    if (gameDetails) targetMatch.gameDetails = gameDetails;

    tournament.stats.completedMatches += 1;

    // Advance winner to next round if applicable
    const currentRoundIndex = tournament.rounds.indexOf(targetRound);
    if (currentRoundIndex < tournament.rounds.length - 1) {
      const nextRound = tournament.rounds[currentRoundIndex + 1];
      const nextMatchIndex = Math.floor(targetMatch.matchNumber / 2);
      const nextMatch = nextRound.matches[nextMatchIndex];

      if (targetMatch.matchNumber % 2 === 1) {
        nextMatch.player1 = winner;
      } else {
        nextMatch.player2 = winner;
      }
    } else {
      // This is the final - set tournament winner
      tournament.winner = winner;
      tournament.status = "completed";
      tournament.schedule.tournamentEnd = new Date();

      // Award achievements
      await this.awardTournamentAchievements(tournament);
    }

    await tournament.save();
    res.json({ message: "Match result updated successfully", tournament });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's tournament history
router.get("/user/:userId/history", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const tournaments = await Tournament.find({
      "participants.user": req.params.userId,
    })
      .populate("organizer", "username")
      .populate("winner", "username")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tournament.countDocuments({
      "participants.user": req.params.userId,
    });

    res.json({
      tournaments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tournament leaderboard
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate("participants.user", "username")
      .populate("winner", "username")
      .populate("runnerUp", "username")
      .populate("thirdPlace", "username");

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Calculate leaderboard based on tournament progress
    const leaderboard = tournament.participants.map((participant) => {
      let position = "Participating";
      let points = 0;

      if (
        tournament.winner &&
        participant.user._id.toString() === tournament.winner._id.toString()
      ) {
        position = 1;
        points = 100;
      } else if (
        tournament.runnerUp &&
        participant.user._id.toString() === tournament.runnerUp._id.toString()
      ) {
        position = 2;
        points = 75;
      } else if (
        tournament.thirdPlace &&
        participant.user._id.toString() === tournament.thirdPlace._id.toString()
      ) {
        position = 3;
        points = 50;
      } else if (participant.eliminated) {
        position = `Eliminated Round ${participant.eliminationRound}`;
        points = Math.max(0, 25 - participant.eliminationRound * 5);
      }

      return {
        user: participant.user,
        position,
        points,
        eliminated: participant.eliminated,
        eliminationRound: participant.eliminationRound,
      };
    });

    // Sort by points/position
    leaderboard.sort((a, b) => {
      if (typeof a.position === "number" && typeof b.position === "number") {
        return a.position - b.position;
      } else if (typeof a.position === "number") {
        return -1;
      } else if (typeof b.position === "number") {
        return 1;
      } else {
        return b.points - a.points;
      }
    });

    res.json({
      leaderboard,
      tournament: { name: tournament.name, status: tournament.status },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to award tournament achievements
async function awardTournamentAchievements(tournament) {
  try {
    // Award winner achievements
    if (tournament.winner) {
      await Achievement.findOneAndUpdate(
        {
          user: tournament.winner,
          type: "tournament",
          name: "Tournament Victor",
        },
        {
          user: tournament.winner,
          type: "tournament",
          name: "Tournament Victor",
          description: "Win your first tournament",
          icon: "🏆",
          unlockedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Update player stats
      await PlayerStats.findOneAndUpdate(
        { user: tournament.winner },
        {
          $inc: {
            "tournaments.won": 1,
            "tournaments.participated": 1,
          },
        },
        { upsert: true }
      );
    }

    // Award participation achievements for all participants
    for (let participant of tournament.participants) {
      await PlayerStats.findOneAndUpdate(
        { user: participant.user },
        {
          $inc: {
            "tournaments.participated": 1,
          },
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error("Error awarding tournament achievements:", error);
  }
}

module.exports = router;
