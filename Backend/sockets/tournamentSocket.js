const Tournament = require("../models/Tournament");
const PlayerStats = require("../models/PlayerStats");

const setupTournamentSockets = (io) => {
  io.on("connection", (socket) => {
    console.log(`Tournament socket connected: ${socket.id}`);

    // Join tournament room
    socket.on("joinTournament", async (data) => {
      try {
        const { tournamentId, userId } = data;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" });
          return;
        }

        socket.join(`tournament_${tournamentId}`);
        socket.tournamentId = tournamentId;
        socket.userId = userId;

        // Send tournament status to user
        socket.emit("tournamentJoined", {
          tournament,
          message: "Successfully joined tournament room",
        });

        // Notify others in tournament
        socket.to(`tournament_${tournamentId}`).emit("userJoinedTournament", {
          userId,
          message: "A user joined the tournament room",
        });

        console.log(`User ${userId} joined tournament ${tournamentId}`);
      } catch (error) {
        console.error("Error joining tournament:", error);
        socket.emit("error", { message: "Failed to join tournament" });
      }
    });

    // Leave tournament room
    socket.on("leaveTournament", (data) => {
      try {
        const { tournamentId, userId } = data;

        socket.leave(`tournament_${tournamentId}`);

        // Notify others
        socket.to(`tournament_${tournamentId}`).emit("userLeftTournament", {
          userId,
          message: "A user left the tournament room",
        });

        console.log(`User ${userId} left tournament ${tournamentId}`);
      } catch (error) {
        console.error("Error leaving tournament:", error);
      }
    });

    // Start tournament match
    socket.on("startTournamentMatch", async (data) => {
      try {
        const { tournamentId, matchId, roomId } = data;

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" });
          return;
        }

        // Find the match
        let targetMatch = null;
        for (let round of tournament.rounds) {
          const match = round.matches.find((m) => m._id.toString() === matchId);
          if (match) {
            targetMatch = match;
            break;
          }
        }

        if (!targetMatch) {
          socket.emit("error", { message: "Match not found" });
          return;
        }

        // Update match status
        targetMatch.status = "in-progress";
        targetMatch.startTime = new Date();
        targetMatch.roomId = roomId;

        await tournament.save();

        // Notify participants
        const participants = [targetMatch.player1, targetMatch.player2];

        io.to(`tournament_${tournamentId}`).emit("matchStarted", {
          matchId,
          roomId,
          participants,
          tournament: tournament.name,
          round: tournament.rounds.find((r) =>
            r.matches.some((m) => m._id.toString() === matchId)
          ).roundNumber,
        });

        console.log(`Tournament match started: ${matchId} in room ${roomId}`);
      } catch (error) {
        console.error("Error starting tournament match:", error);
        socket.emit("error", { message: "Failed to start match" });
      }
    });

    // Complete tournament match
    socket.on("completeTournamentMatch", async (data) => {
      try {
        const { tournamentId, matchId, winner, gameDetails } = data;

        const tournament = await Tournament.findById(tournamentId)
          .populate("participants.user", "username")
          .populate("rounds.matches.player1", "username")
          .populate("rounds.matches.player2", "username");

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" });
          return;
        }

        // Find and update the match
        let targetMatch = null;
        let targetRound = null;
        let roundIndex = -1;

        for (let i = 0; i < tournament.rounds.length; i++) {
          const round = tournament.rounds[i];
          const match = round.matches.find((m) => m._id.toString() === matchId);
          if (match) {
            targetMatch = match;
            targetRound = round;
            roundIndex = i;
            break;
          }
        }

        if (!targetMatch) {
          socket.emit("error", { message: "Match not found" });
          return;
        }

        // Update match
        targetMatch.winner = winner;
        targetMatch.status = "completed";
        targetMatch.endTime = new Date();
        if (gameDetails) targetMatch.gameDetails = gameDetails;

        tournament.stats.completedMatches += 1;

        // Advance winner to next round
        if (roundIndex < tournament.rounds.length - 1) {
          const nextRound = tournament.rounds[roundIndex + 1];
          const nextMatchIndex = Math.floor((targetMatch.matchNumber - 1) / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];

          if ((targetMatch.matchNumber - 1) % 2 === 0) {
            nextMatch.player1 = winner;
          } else {
            nextMatch.player2 = winner;
          }

          // Check if next match can start
          if (nextMatch.player1 && nextMatch.player2) {
            io.to(`tournament_${tournamentId}`).emit("nextMatchReady", {
              matchId: nextMatch._id,
              round: nextRound.roundNumber,
              player1: nextMatch.player1,
              player2: nextMatch.player2,
            });
          }
        } else {
          // Tournament completed
          tournament.winner = winner;
          tournament.status = "completed";
          tournament.schedule.tournamentEnd = new Date();

          // Determine runner-up and third place
          const finalRound = tournament.rounds[tournament.rounds.length - 1];
          const finalMatch = finalRound.matches[0];
          tournament.runnerUp =
            finalMatch.player1.toString() === winner.toString()
              ? finalMatch.player2
              : finalMatch.player1;

          // Third place from semi-finals if exists
          if (tournament.rounds.length > 1) {
            const semiFinalRound =
              tournament.rounds[tournament.rounds.length - 2];
            for (let match of semiFinalRound.matches) {
              if (match.winner.toString() !== winner.toString()) {
                const loser =
                  match.player1.toString() === match.winner.toString()
                    ? match.player2
                    : match.player1;
                if (!tournament.thirdPlace) {
                  tournament.thirdPlace = loser;
                }
                break;
              }
            }
          }

          await this.awardTournamentAchievements(tournament);

          io.to(`tournament_${tournamentId}`).emit("tournamentCompleted", {
            tournament,
            winner: tournament.winner,
            runnerUp: tournament.runnerUp,
            thirdPlace: tournament.thirdPlace,
          });
        }

        await tournament.save();

        // Broadcast match completion
        io.to(`tournament_${tournamentId}`).emit("matchCompleted", {
          matchId,
          winner,
          tournament: tournament.name,
          round: targetRound.roundNumber,
          gameDetails,
        });

        console.log(
          `Tournament match completed: ${matchId}, winner: ${winner}`
        );
      } catch (error) {
        console.error("Error completing tournament match:", error);
        socket.emit("error", { message: "Failed to complete match" });
      }
    });

    // Get live tournament updates
    socket.on("getTournamentUpdate", async (data) => {
      try {
        const { tournamentId } = data;

        const tournament = await Tournament.findById(tournamentId)
          .populate("participants.user", "username")
          .populate("rounds.matches.player1", "username")
          .populate("rounds.matches.player2", "username")
          .populate("rounds.matches.winner", "username")
          .populate("winner", "username")
          .populate("runnerUp", "username")
          .populate("thirdPlace", "username");

        if (!tournament) {
          socket.emit("error", { message: "Tournament not found" });
          return;
        }

        socket.emit("tournamentUpdate", tournament);
      } catch (error) {
        console.error("Error getting tournament update:", error);
        socket.emit("error", { message: "Failed to get tournament update" });
      }
    });

    // Tournament chat
    socket.on("tournamentMessage", async (data) => {
      try {
        const { tournamentId, userId, username, message } = data;

        const messageData = {
          id: Date.now(),
          userId,
          username,
          message,
          timestamp: new Date(),
          type: "tournament",
        };

        // Broadcast to tournament room
        io.to(`tournament_${tournamentId}`).emit(
          "tournamentMessage",
          messageData
        );

        console.log(
          `Tournament message in ${tournamentId}: ${username}: ${message}`
        );
      } catch (error) {
        console.error("Error sending tournament message:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (socket.tournamentId && socket.userId) {
        socket
          .to(`tournament_${socket.tournamentId}`)
          .emit("userLeftTournament", {
            userId: socket.userId,
            message: "A user disconnected from tournament",
          });
      }
      console.log(`Tournament socket disconnected: ${socket.id}`);
    });
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

        // Check for tournament regular achievement
        const stats = await PlayerStats.findOne({ user: participant.user });
        if (stats && stats.tournaments.participated >= 10) {
          await Achievement.findOneAndUpdate(
            {
              user: participant.user,
              type: "tournament",
              name: "Tournament Regular",
            },
            {
              user: participant.user,
              type: "tournament",
              name: "Tournament Regular",
              description: "Participate in 10 tournaments",
              icon: "🎭",
              unlockedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        }
      }
    } catch (error) {
      console.error("Error awarding tournament achievements:", error);
    }
  }
};

module.exports = { setupTournamentSockets };
