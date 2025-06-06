// File: sockets/gameSocket.js

const Room = require("../models/Room");
const User = require("../models/User");
const { generateDeck, isPlayable } = require("../utils/unoLogic");
const socketAuth = require("../middlewares/socketAuth.middleware");

function setupGameSockets(io) {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log(`User connected to game: ${userId}, socketId: ${socket.id}`);

    // Join a room
    socket.on("joinRoom", async (roomCode, callback) => {
      try {
        let room = await Room.findOne({ code: roomCode }).populate("players.user");
        if (!room) return callback({ error: "Room not found" });

        if (room.players.length >= 4) {
          return callback({ error: "Room full" });
        }

        // Prevent duplicate join
        if (room.players.some((p) => p.user._id.toString() === userId)) {
          return callback({ error: "Already in room" });
        }

        // Add player
        room.players.push({
          user: userId,
          socketId: socket.id,
          hand: [],
          saidUno: false,
        });

        await room.save();
        socket.join(roomCode);

        io.to(roomCode).emit("roomUpdate", room);

        callback({ success: true, room });
      } catch (err) {
        console.error("Join room error:", err);
        callback({ error: "Server error" });
      }
    });

    // Create a room (only host)
    socket.on("createRoom", async (callback) => {
      try {
        // Generate unique 6-char code (retry if exists)
        let code;
        do {
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (await Room.findOne({ code }));

        const newRoom = new Room({
          code,
          host: userId,
          players: [{ user: userId, socketId: socket.id, hand: [], saidUno: false }],
          deck: [],
          discardPile: [],
          currentTurn: 0,
          direction: "clockwise",
          drawStack: 0,
          currentColor: null,
          status: "waiting",
        });

        await newRoom.save();
        socket.join(code);

        callback({ success: true, room: newRoom });
      } catch (err) {
        console.error("Create room error:", err);
        callback({ error: "Server error" });
      }
    });

    // Start game (host only)
    socket.on("startGame", async (roomCode, callback) => {
      try {
        let room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });

        if (room.host.toString() !== userId) {
          return callback({ error: "Only host can start the game" });
        }
        if (room.players.length < 2) {
          return callback({ error: "Need at least 2 players to start" });
        }

        // Initialize deck and shuffle
        const deck = generateDeck();

        // Deal 7 cards each
        for (const player of room.players) {
          player.hand = deck.splice(0, 7);
          player.saidUno = false;
        }

        // Set discard pile with first card from deck (cannot be wild +4)
        let firstCard;
        do {
          firstCard = deck.shift();
          deck.push(firstCard); // put back if invalid
        } while (firstCard.color === "black" && firstCard.value === "+4");

        room.discardPile = [firstCard];
        room.currentColor = firstCard.color;
        room.deck = deck;
        room.status = "active";
        room.currentTurn = 0;
        room.direction = "clockwise";
        room.drawStack = 0;
        room.winner = null;

        await room.save();

        io.to(roomCode).emit("gameStarted", room);
        callback({ success: true });
      } catch (err) {
        console.error("Start game error:", err);
        callback({ error: "Server error" });
      }
    });

    // Play card
    socket.on("playCard", async ({ roomCode, cardIndex, declaredColor }, callback) => {
      try {
        let room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });
        if (room.status !== "active") return callback({ error: "Game not active" });

        const playerIndex = room.players.findIndex((p) => p.user.toString() === userId);
        if (playerIndex === -1) return callback({ error: "Player not in room" });

        if (room.currentTurn !== playerIndex) {
          return callback({ error: "Not your turn" });
        }

        const player = room.players[playerIndex];
        const card = player.hand[cardIndex];
        if (!card) return callback({ error: "Invalid card index" });

        const topCard = room.discardPile[room.discardPile.length - 1];

        // Check if card playable
        if (!isPlayable(card, topCard, room.currentColor)) {
          return callback({ error: "Card not playable" });
        }

        // Remove card from hand and add to discard pile
        player.hand.splice(cardIndex, 1);
        room.discardPile.push(card);

        // Reset drawStack if not draw card
        if (card.value !== "+2" && card.value !== "+4") {
          room.drawStack = 0;
        }

        // Update current color (wild cards allow color change)
        if (card.color === "black") {
          if (!declaredColor || !["red", "green", "blue", "yellow"].includes(declaredColor)) {
            return callback({ error: "You must declare a valid color for wild card" });
          }
          room.currentColor = declaredColor;
        } else {
          room.currentColor = card.color;
        }

        // Handle special cards
        if (card.value === "skip") {
          // Skip next player
          room.currentTurn = getNextTurn(room, 2);
        } else if (card.value === "reverse") {
          // Reverse direction
          room.direction = room.direction === "clockwise" ? "counter" : "clockwise";
          if (room.players.length === 2) {
            // Reverse acts as skip in 2 player
            room.currentTurn = getNextTurn(room, 2);
          } else {
            room.currentTurn = getNextTurn(room, 1);
          }
        } else if (card.value === "+2") {
          room.drawStack += 2;
          room.currentTurn = getNextTurn(room, 1);
        } else if (card.value === "+4") {
          room.drawStack += 4;
          room.currentTurn = getNextTurn(room, 1);
        } else {
          room.currentTurn = getNextTurn(room, 1);
        }

        // Reset saidUno if player has >1 card, else flag false
        player.saidUno = player.hand.length === 1 ? player.saidUno : false;

        // Check win condition
        if (player.hand.length === 0) {
          room.status = "finished";
          room.winner = player.user;
          await updateUserHistory(player.user, room._id, "win");

          // Mark others as loss
          for (const p of room.players) {
            if (p.user.toString() !== player.user.toString()) {
              await updateUserHistory(p.user, room._id, "loss");
            }
          }
        }

        await room.save();

        io.to(roomCode).emit("gameUpdate", room);
        callback({ success: true });
      } catch (err) {
        console.error("Play card error:", err);
        callback({ error: "Server error" });
      }
    });

    // Draw card
    socket.on("drawCard", async (roomCode, callback) => {
      try {
        let room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });
        if (room.status !== "active") return callback({ error: "Game not active" });

        const playerIndex = room.players.findIndex((p) => p.user.toString() === userId);
        if (playerIndex === -1) return callback({ error: "Player not in room" });

        if (room.currentTurn !== playerIndex) {
          return callback({ error: "Not your turn" });
        }

        const player = room.players[playerIndex];

        // Handle draw stack cards
        if (room.drawStack > 0) {
          const drawCards = room.deck.splice(0, room.drawStack);
          player.hand.push(...drawCards);
          room.drawStack = 0;

          // Next player's turn after forced draw
          room.currentTurn = getNextTurn(room, 1);
        } else {
          if (room.deck.length === 0) {
            // Reshuffle discard pile except top card
            const topCard = room.discardPile.pop();
            room.deck = shuffle(room.discardPile);
            room.discardPile = [topCard];
          }

          // Draw one card
          const drawnCard = room.deck.shift();
          if (drawnCard) {
            player.hand.push(drawnCard);
          }

          // Player can play drawn card or pass turn
          // We let client decide on this, so turn moves only on pass

          // If no draw stack, player turn can end here if passing
          // But if player wants to play drawn card, client sends playCard event

          // For now, assume turn ends on drawCard event
          room.currentTurn = getNextTurn(room, 1);
        }

        await room.save();
        io.to(roomCode).emit("gameUpdate", room);
        callback({ success: true });
      } catch (err) {
        console.error("Draw card error:", err);
        callback({ error: "Server error" });
      }
    });

    // Say UNO
    socket.on("sayUno", async (roomCode, callback) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });

        const player = room.players.find((p) => p.user.toString() === userId);
        if (!player) return callback({ error: "Player not in room" });

        if (player.hand.length !== 1) {
          return callback({ error: "You can only say UNO when you have exactly 1 card" });
        }

        player.saidUno = true;
        await room.save();

        io.to(roomCode).emit("playerSaidUno", { userId, roomCode });
        callback({ success: true });
      } catch (err) {
        console.error("Say UNO error:", err);
        callback({ error: "Server error" });
      }
    });

    // Object UNO - penalty for not saying UNO
    socket.on("objectUno", async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });

        const player = room.players.find((p) => p.user.toString() === playerId);
        if (!player) return callback({ error: "Player not found" });

        if (player.hand.length === 1 && !player.saidUno) {
          // Penalty: draw 2 cards
          if (room.deck.length < 2) {
            // Reshuffle discard pile except top card
            const topCard = room.discardPile.pop();
            room.deck = shuffle(room.discardPile);
            room.discardPile = [topCard];
          }

          const penaltyCards = room.deck.splice(0, 2);
          player.hand.push(...penaltyCards);
          player.saidUno = false;

          await room.save();
          io.to(roomCode).emit("gameUpdate", room);
          callback({ success: true, message: "Penalty applied for not saying UNO" });
        } else {
          callback({ error: "Cannot object: Player either said UNO or does not have exactly 1 card" });
        }
      } catch (err) {
        console.error("Object UNO error:", err);
        callback({ error: "Server error" });
      }
    });

    // Disconnect cleanup
    socket.on("disconnect", async () => {
      try {
        // Remove player from any rooms they are in
        const rooms = await Room.find({ "players.socketId": socket.id });
        for (const room of rooms) {
          room.players = room.players.filter((p) => p.socketId !== socket.id);

          // If host left, assign new host (first player)
          if (room.host.toString() === userId && room.players.length > 0) {
            room.host = room.players[0].user;
          }

          // If no players left, delete room or mark finished
          if (room.players.length === 0) {
            await room.remove();
          } else {
            await room.save();
            io.to(room.code).emit("roomUpdate", room);
          }
        }
        console.log(`User disconnected from game: ${userId}`);
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });
  });
}

// Helpers

function getNextTurn(room, step = 1) {
  const playerCount = room.players.length;
  let current = room.currentTurn;
  if (room.direction === "clockwise") {
    return (current + step) % playerCount;
  } else {
    return (current - step + playerCount) % playerCount;
  }
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

async function updateUserHistory(userId, gameId, result) {
  const User = require("../models/User");
  await User.findByIdAndUpdate(userId, {
    $push: {
      history: { gameId, result, timestamp: new Date() },
    },
  });
}

module.exports = { setupGameSockets };
