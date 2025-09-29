const Room = require("../models/Room");
const User = require("../models/User");
const { generateDeck, isPlayable, shuffle } = require("../utils/unoLogic");
const socketAuth = require("../middlewares/socketAuth.middleware");
const botService = require("../services/bot.service");

// Custom function to populate room with mixed user types
async function populateRoomPlayers(room) {
  for (let i = 0; i < room.players.length; i++) {
    const player = room.players[i];
    if (!player.isBot && player.user && typeof player.user === "string") {
      // Populate regular user
      try {
        const userData = await User.findById(player.user);
        if (userData) {
          room.players[i].user = userData;
        }
      } catch (err) {
        console.error("Error populating user:", err);
      }
    }
    // Bot users are already embedded objects, no need to populate
  }

  return room;
}

function setupGameSockets(io) {
  io.use(socketAuth);
  io.on("connection", (socket) => {
    const userId = socket.user._id;
    console.log(`User connected to game: ${userId}, socketId: ${socket.id}`);

    // Join a room
    socket.on("joinRoom", async (roomCode, callback) => {
      try {
        console.log(`User ${userId} attempting to join room ${roomCode}`);

        let room = await Room.findOne({ code: roomCode });
        if (!room) {
          console.log(`Room ${roomCode} not found`);
          return callback({ error: "Room not found" });
        }

        // Populate room players
        room = await populateRoomPlayers(room);

        if (room.players.length >= 4) {
          console.log(`Room ${roomCode} is full`);
          return callback({ error: "Room full" });
        } // Prevent duplicate join - check both by user ID and socket ID
        console.log(
          `Checking for existing player. Current players:`,
          room.players.map((p) => ({
            userId: p.user._id ? p.user._id.toString() : p.user.toString(),
            socketId: p.socketId,
          }))
        );
        console.log(`New user joining: ${userId}, socket: ${socket.id}`);

        // Check if user already exists in room (more robust checking)
        const existingPlayerIndex = room.players.findIndex((p) => {
          const playerId = p.user._id
            ? p.user._id.toString()
            : p.user.toString();
          return playerId === userId.toString();
        });

        if (existingPlayerIndex !== -1) {
          console.log(
            `User ${userId} already in room ${roomCode} - updating socket ID only`
          );

          // Update socket ID if user rejoined with new socket
          room.players[existingPlayerIndex].socketId = socket.id;
          await room.save();

          socket.join(roomCode);
          room = await Room.findOne({ code: roomCode }).populate(
            "players.user host"
          );
          const formattedRoom = formatRoomForClient(room);
          return callback({ success: true, room: formattedRoom });
        }

        console.log(`Adding user ${userId} to room ${roomCode}`); // Add player
        room.players.push({
          user: userId,
          socketId: socket.id,
          hand: [],
          saidUno: false,
          isBot: false, // Explicitly set joining player as not a bot
        });
        await room.save();
        socket.join(roomCode);

        // Repopulate to get the new player's user data
        room = await Room.findOne({ code: roomCode });
        room = await populateRoomPlayers(room);

        const formattedRoom = formatRoomForClient(room);
        io.to(roomCode).emit("roomUpdate", formattedRoom);

        console.log(
          `User ${userId} successfully joined room ${roomCode}. Room now has ${room.players.length} players`
        );
        callback({ success: true, room: formattedRoom });
      } catch (err) {
        console.error("Join room error:", err);
        callback({ error: "Server error" });
      }
    });

    // Create a room (only host)
    socket.on("createRoom", async (callback) => {
      try {
        console.log(`User ${userId} creating a new room`);

        // Generate unique 6-char code (retry if exists)
        let code;
        do {
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (await Room.findOne({ code }));

        console.log(`Generated room code: ${code}`);
        const newRoom = new Room({
          code,
          host: userId,
          players: [
            {
              user: userId,
              socketId: socket.id,
              hand: [],
              saidUno: false,
              isBot: false, // Explicitly set host as not a bot
            },
          ],
          deck: [],
          discardPile: [],
          currentTurn: 0,
          direction: "clockwise",
          drawStack: 0,
          currentColor: null,
          status: "waiting",
          allowBots: true, // Enable bots by default
          maxPlayers: 4, // Set max players
        });
        await newRoom.save();
        socket.join(code);
        console.log(`Room ${code} created with host ${userId}`);

        // Populate the user data before sending to client
        let populatedRoom = await Room.findOne({ code });
        populatedRoom = await populateRoomPlayers(populatedRoom);
        const formattedRoom = formatRoomForClient(populatedRoom);

        console.log(`Room ${code} formatted for client:`, {
          host: formattedRoom.host,
          players: formattedRoom.players.map((p) => ({
            name: p.name,
            isBot: p.isBot,
          })),
        });

        callback({ success: true, room: formattedRoom });
      } catch (err) {
        console.error("Create room error:", err);
        callback({ error: "Server error" });
      }
    });

    // Start game (host only)
    socket.on("startGame", async (data, callback) => {
      try {
        // Handle both string roomCode and object with roomCode
        const roomCode = typeof data === "string" ? data : data.roomCode;
        console.log(
          `🎮 User ${userId} attempting to start game for room ${roomCode}`
        );
        console.log(`🎮 Data received:`, data);
        console.log(`🎮 Callback type:`, typeof callback);

        // Ensure callback is a function
        const safeCallback =
          typeof callback === "function" ? callback : () => {};

        console.log(`🎮 Finding room with code: ${roomCode}`);
        let room = await Room.findOne({ code: roomCode });

        if (!room) {
          console.log(`❌ Room ${roomCode} not found`);
          return safeCallback({ error: "Room not found" });
        }
        console.log(
          `✅ Room found: ${room.code}, players: ${room.players.length}, status: ${room.status}`
        );

        // Check if user is host - handle both ObjectId and populated user object
        let hostId;
        console.log(
          `🔍 DEBUG startGame: room.host type=${typeof room.host}, value=`,
          room.host
        );
        console.log(
          `🔍 DEBUG startGame: userId type=${typeof userId}, value=${userId}`
        );

        if (room.host && typeof room.host === "object" && room.host._id) {
          // Host is a populated user object
          hostId = room.host._id.toString();
          console.log(
            `🔍 DEBUG startGame: Host is populated object, extracted ID=${hostId}`
          );
        } else if (room.host) {
          // Host is ObjectId or string
          hostId = room.host.toString();
          console.log(
            `🔍 DEBUG startGame: Host is ObjectId/string, converted to=${hostId}`
          );
        } else {
          console.log(`🔍 DEBUG startGame: Host is null/undefined`);
          hostId = null;
        }

        console.log(
          `🎮 Host validation: userId="${userId}", hostId="${hostId}", match=${
            hostId === userId
          }, strictMatch=${hostId === userId.toString()}`
        );

        if (hostId !== userId && hostId !== userId.toString()) {
          console.log(`❌ User ${userId} is not host (host is ${hostId})`);
          return safeCallback({ error: "Only host can start the game" });
        }

        console.log(`✅ Host validation passed for user ${userId}`);
        if (room.players.length < 2) {
          console.log(`❌ Not enough players: ${room.players.length}/2`);
          return safeCallback({ error: "Need at least 2 players to start" });
        }

        console.log(
          `🎮 Starting game initialization with ${room.players.length} players...`
        );

        // Initialize deck and shuffle
        console.log(`🃏 Generating and shuffling UNO deck...`);
        let deck = generateDeck();
        console.log(`🃏 Deck generated with ${deck.length} cards`);

        // Validate deck has enough cards for all players (7 cards each + 1 for discard)
        const requiredCards = room.players.length * 7 + 1;
        if (deck.length < requiredCards) {
          console.log(
            `❌ Deck too small: ${deck.length} cards, need ${requiredCards}`
          );
          return safeCallback({ error: "Not enough cards in deck" });
        }

        // Deal 7 cards to each player according to UNO rules
        console.log(
          `🃏 Dealing 7 cards to each of ${room.players.length} players...`
        );
        for (let i = 0; i < room.players.length; i++) {
          const player = room.players[i];
          player.hand = [];

          // Deal exactly 7 cards to this player
          for (let j = 0; j < 7; j++) {
            if (deck.length > 0) {
              player.hand.push(deck.shift());
            } else {
              console.log(
                `⚠️ Warning: Ran out of cards while dealing to player ${i + 1}`
              );
              break;
            }
          }

          player.saidUno = false;
          console.log(
            `🃏 Player ${player.user?.name || `${i + 1}`} (${
              player.isBot ? "Bot" : "Human"
            }) dealt ${player.hand.length} cards`
          );
        }

        // Set up discard pile with first valid card (cannot be Wild +4)
        console.log(`🃏 Setting up discard pile...`);
        let firstCard;
        let attempts = 0;
        do {
          if (deck.length === 0) {
            console.log(`❌ No cards left in deck for discard pile`);
            return safeCallback({ error: "Not enough cards to start game" });
          }

          firstCard = deck.shift();
          attempts++;

          // Wild +4 cannot be the starting card, put it back and try again
          if (firstCard.color === "black" && firstCard.value === "+4") {
            deck.push(firstCard);
            deck = shuffle(deck); // Reshuffle to avoid infinite loop
            console.log(
              `🃏 Wild +4 drawn as first card, reshuffling... (attempt ${attempts})`
            );
          }

          // Prevent infinite loop
          if (attempts > 20) {
            console.log(`❌ Too many attempts to find valid starting card`);
            return safeCallback({
              error: "Unable to find valid starting card",
            });
          }
        } while (firstCard.color === "black" && firstCard.value === "+4");

        console.log(`🃏 Starting card: ${firstCard.color} ${firstCard.value}`);

        // Initialize game state
        room.discardPile = [firstCard];
        room.currentColor = firstCard.color;
        room.deck = deck;
        room.status = "active";
        room.currentTurn = 0;
        room.direction = "clockwise";
        room.drawStack = 0;
        room.winner = null;

        console.log(`🎮 Game state initialized:`);
        console.log(`   - Discard pile: ${room.discardPile.length} cards`);
        console.log(`   - Remaining deck: ${room.deck.length} cards`);
        console.log(`   - Current color: ${room.currentColor}`);
        console.log(
          `   - Starting player: ${room.players[0]?.user?.name || "Player 1"}`
        );
        console.log(`🎮 Saving room state...`);
        await room.save();

        // Populate room players
        room = await populateRoomPlayers(room);

        console.log(`🎮 Emitting gameStarted event to room ${roomCode}...`);

        // Send personalized game data to each player (with their own cards)
        for (const player of room.players) {
          if (!player.isBot) {
            const playerId = player.user._id
              ? player.user._id.toString()
              : player.user.toString();
            const personalizedRoom = formatRoomForClient(room, playerId);

            // Find the player's socket and send personalized data
            const playerSockets = await io.in(roomCode).fetchSockets();
            const playerSocket = playerSockets.find(
              (s) => s.user._id.toString() === playerId
            );

            if (playerSocket) {
              playerSocket.emit("gameStarted", personalizedRoom);
              playerSocket.emit("gameUpdate", personalizedRoom);
            }
          }
        }

        // Also send general game state to the room (for spectators, bots, etc.)
        const generalRoom = formatRoomForClient(room);
        io.to(roomCode).emit("roomUpdate", generalRoom);

        // If the first player is a bot, trigger their turn
        const firstPlayer = room.players[room.currentTurn];
        console.log(
          `🎮 First player: ${firstPlayer?.user?.name || "Unknown"}, isBot: ${
            firstPlayer?.isBot
          }`
        );

        if (firstPlayer && firstPlayer.isBot) {
          console.log(
            `🤖 First player is a bot, scheduling bot turn in 2 seconds...`
          );
          setTimeout(() => {
            botService.executeBotTurn(io, roomCode, firstPlayer.user._id);
          }, 2000);
        }

        console.log(`🎮 Game started successfully for room ${roomCode}!`);
        console.log(`🃏 Final card distribution:`);
        room.players.forEach((player, index) => {
          console.log(
            `   Player ${index + 1} (${player.user?.name}): ${
              player.hand.length
            } cards`
          );
        });
        safeCallback({ success: true });
      } catch (err) {
        console.error("Start game error:", err);
        safeCallback({ error: "Server error" });
      }
    });    // Play card
    socket.on(
      "playCard",
      async ({ roomCode, cardIndex, declaredColor }, callback) => {
        try {
          let room = await Room.findOne({ code: roomCode });
          if (!room) return callback({ error: "Room not found" });
          if (room.status !== "active")
            return callback({ error: "Game not active" });

          const playerIndex = room.players.findIndex(
            (p) => (p.user._id || p.user).toString() === userId
          );
          if (playerIndex === -1)
            return callback({ error: "Player not in room" });

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
            if (
              !declaredColor ||
              !["red", "green", "blue", "yellow"].includes(declaredColor)
            ) {
              return callback({
                error: "You must declare a valid color for wild card",
              });
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
            room.direction =
              room.direction === "clockwise" ? "counter" : "clockwise";
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

          // Send personalized game updates to each player
          room = await populateRoomPlayers(room);

          // Send personalized data to each human player
          for (const player of room.players) {
            if (!player.isBot) {
              const playerId = player.user._id
                ? player.user._id.toString()
                : player.user.toString();
              const personalizedRoom = formatRoomForClient(room, playerId);

              // Find the player's socket and send personalized data
              const playerSockets = await io.in(roomCode).fetchSockets();
              const playerSocket = playerSockets.find(
                (s) => s.user._id.toString() === playerId
              );

              if (playerSocket) {
                playerSocket.emit("gameUpdate", personalizedRoom);
              }
            }
          }

          // Also send general game state to the room
          const generalRoom = formatRoomForClient(room);
          io.to(roomCode).emit("roomUpdate", generalRoom);

          // If next player is a bot, trigger their turn
          if (room.status === "active") {
            const nextPlayer = room.players[room.currentTurn];
            if (nextPlayer && nextPlayer.isBot) {
              console.log(
                `🤖 Next player ${nextPlayer.user.name} is a bot, scheduling turn...`
              );
              setTimeout(() => {
                botService.executeBotTurn(io, roomCode, nextPlayer.user._id);
              }, 1000);
            }
          }

          callback({ success: true });
        } catch (err) {
          console.error("Play card error:", err);
          callback({ error: "Server error" });        }
      }
    );    // Draw card
    socket.on("drawCard", async (roomCode, callback) => {
      try {
        console.log(`🃏 Draw card requested by user ${userId} for room ${roomCode}`);
        
        let room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });
        if (room.status !== "active")
          return callback({ error: "Game not active" });        // Debug player lookup
        console.log(`🔍 Looking for player ${userId} in room players:`);
        room.players.forEach((p, index) => {
          const playerId = (p.user._id || p.user).toString();
          console.log(`  Player ${index}: ${playerId} (isBot: ${p.isBot})`);
        });

        const playerIndex = room.players.findIndex(
          (p) => (p.user._id || p.user).toString() === userId.toString()
        );
        
        console.log(`🔍 Player index found: ${playerIndex}`);
        
        if (playerIndex === -1)
          return callback({ error: "Player not in room" });

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

        // Send personalized game updates to each player
        room = await populateRoomPlayers(room);

        // Send personalized data to each human player
        for (const player of room.players) {
          if (!player.isBot) {
            const playerId = player.user._id
              ? player.user._id.toString()
              : player.user.toString();
            const personalizedRoom = formatRoomForClient(room, playerId);

            // Find the player's socket and send personalized data
            const playerSockets = await io.in(roomCode).fetchSockets();
            const playerSocket = playerSockets.find(
              (s) => s.user._id.toString() === playerId
            );

            if (playerSocket) {
              playerSocket.emit("gameUpdate", personalizedRoom);
            }
          }
        }

        // Also send general game state to the room
        const generalRoom = formatRoomForClient(room);
        io.to(roomCode).emit("roomUpdate", generalRoom);

        // If next player is a bot, trigger their turn
        if (room.status === "active") {
          const nextPlayer = room.players[room.currentTurn];
          if (nextPlayer && nextPlayer.isBot) {
            console.log(
              `🤖 Next player ${nextPlayer.user.name} is a bot after draw, scheduling turn...`
            );
            setTimeout(() => {
              botService.executeBotTurn(io, roomCode, nextPlayer.user._id);
            }, 1000);
          }        }        callback({ success: true });
      } catch (err) {
        console.error("Draw card error:", err);
        // Ensure callback is a function before calling
        if (typeof callback === "function") {
          callback({ error: "Server error" });
        }
      }
    });// Say UNO
    socket.on("sayUno", async (roomCode, callback) => {
      try {
        // Ensure callback is a function
        const safeCallback = typeof callback === "function" ? callback : () => {};
        
        const room = await Room.findOne({ code: roomCode });
        if (!room) return safeCallback({ error: "Room not found" });

        const player = room.players.find((p) => (p.user._id || p.user).toString() === userId.toString());
        if (!player) return safeCallback({ error: "Player not in room" });

        if (player.hand.length !== 1) {
          return safeCallback({
            error: "You can only say UNO when you have exactly 1 card",
          });
        }

        player.saidUno = true;
        await room.save();

        io.to(roomCode).emit("playerSaidUno", { userId, roomCode });
        safeCallback({ success: true });
      } catch (err) {
        console.error("Say UNO error:", err);
        // Ensure callback is a function before calling
        if (typeof callback === "function") {
          callback({ error: "Server error" });
        }
      }
    });// Object UNO - penalty for not saying UNO
    socket.on("objectUno", async ({ roomCode, playerId }, callback) => {
      try {
        // Ensure callback is a function
        const safeCallback = typeof callback === "function" ? callback : () => {};
        
        const room = await Room.findOne({ code: roomCode });
        if (!room) return safeCallback({ error: "Room not found" });

        const player = room.players.find((p) => p.user.toString() === playerId);
        if (!player) return safeCallback({ error: "Player not found" });

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
          safeCallback({
            success: true,
            message: "Penalty applied for not saying UNO",
          });
        } else {
          safeCallback({
            error:
              "Cannot object: Player either said UNO or does not have exactly 1 card",
          });
        }
      } catch (err) {
        console.error("Object UNO error:", err);
        // Ensure callback is a function before calling
        if (typeof callback === "function") {
          callback({ error: "Server error" });
        }
      }
    });// Add bot to room
    socket.on("addBot", async (roomCode, callback) => {
      try {
        console.log(`User ${userId} attempting to add bot to room ${roomCode}`);

        let room = await Room.findOne({ code: roomCode });
        if (!room) {
          console.log(`Room ${roomCode} not found`);
          return callback({ error: "Room not found" });
        }

        // Populate players before checking
        room = await populateRoomPlayers(room); // Check if user is host - handle both ObjectId and populated user object
        let hostId;
        console.log(
          `🔍 DEBUG: room.host type=${typeof room.host}, value=`,
          room.host
        );
        console.log(`🔍 DEBUG: userId type=${typeof userId}, value=${userId}`);

        if (room.host && typeof room.host === "object" && room.host._id) {
          // Host is a populated user object
          hostId = room.host._id.toString();
          console.log(
            `🔍 DEBUG: Host is populated object, extracted ID=${hostId}`
          );
        } else if (room.host) {
          // Host is ObjectId or string
          hostId = room.host.toString();
          console.log(
            `🔍 DEBUG: Host is ObjectId/string, converted to=${hostId}`
          );
        } else {
          console.log(`🔍 DEBUG: Host is null/undefined`);
          hostId = null;
        }

        console.log(
          `🔍 Host validation: userId="${userId}", hostId="${hostId}", match=${
            hostId === userId
          }, strictMatch=${hostId === userId.toString()}`
        );

        if (hostId !== userId && hostId !== userId.toString()) {
          console.log(`❌ User ${userId} is not host (host is ${hostId})`);
          return callback({ error: "Only host can add bots" });
        }

        console.log(`✅ Host validation passed for user ${userId}`);

        if (room.status !== "waiting") {
          console.log(`Cannot add bot - room status is ${room.status}`);
          return callback({ error: "Cannot add bots after game has started" });
        }

        if (room.players.length >= 4) {
          console.log(
            `Cannot add bot - room is full (${room.players.length}/4)`
          );
          return callback({ error: "Room is full" });
        }

        console.log(`Adding bot to room ${roomCode}...`);

        // Add bot using bot service
        room = await botService.addBotsToRoom(roomCode, 1);

        // Populate the updated room
        room = await populateRoomPlayers(room);

        const formattedRoom = formatRoomForClient(room);

        console.log(
          `Bot added successfully! Room now has ${formattedRoom.players.length} players`
        );
        console.log(
          `Players: ${formattedRoom.players
            .map((p) => `${p.name}${p.isBot ? " (Bot)" : ""}`)
            .join(", ")}`
        );

        io.to(roomCode).emit("roomUpdate", formattedRoom);
        callback({ success: true, room: formattedRoom });
      } catch (err) {
        console.error("Add bot error:", err);
        callback({ error: err.message || "Server error" });
      }
    }); // Remove bot from room
    socket.on("removeBot", async ({ roomCode, botId }, callback) => {
      try {
        console.log(
          `User ${userId} removing bot ${botId} from room ${roomCode}`
        );

        let room = await Room.findOne({ code: roomCode });
        if (!room) return callback({ error: "Room not found" });

        // Populate players before checking
        room = await populateRoomPlayers(room);

        // Check if user is host - handle both ObjectId and populated user object
        let hostId;
        if (room.host && typeof room.host === "object" && room.host._id) {
          // Host is a populated user object
          hostId = room.host._id.toString();
        } else if (room.host) {
          // Host is ObjectId or string
          hostId = room.host.toString();
        }

        if (hostId !== userId) {
          return callback({ error: "Only host can remove bots" });
        }

        if (room.status !== "waiting") {
          return callback({
            error: "Cannot remove bots after game has started",
          });
        }

        // Remove bot using bot service
        room = await botService.removeBotsFromRoom(roomCode, botId);

        // Populate the updated room
        room = await populateRoomPlayers(room);

        const formattedRoom = formatRoomForClient(room);

        io.to(roomCode).emit("roomUpdate", formattedRoom);
        callback({ success: true, room: formattedRoom });
      } catch (err) {
        console.error("Remove bot error:", err);
        callback({ error: err.message || "Server error" });
      }
    });

    // Handle bot moves
    socket.on(
      "botPlayCard",
      async ({ roomCode, botId, cardIndex, declaredColor }) => {
        try {
          let room = await Room.findOne({ code: roomCode });
          if (!room || room.status !== "active") return;

          const botPlayerIndex = room.players.findIndex(
            (p) => p.isBot && p.user._id === botId
          );

          if (botPlayerIndex === -1 || room.currentTurn !== botPlayerIndex)
            return;

          const botPlayer = room.players[botPlayerIndex];
          const card = botPlayer.hand[cardIndex];

          if (!card) return;

          const topCard = room.discardPile[room.discardPile.length - 1];

          if (!isPlayable(card, topCard, room.currentColor)) return;

          // Remove card from bot's hand
          botPlayer.hand.splice(cardIndex, 1);

          // Add to discard pile
          room.discardPile.push(card);

          // Update current color
          if (card.color === "black") {
            room.currentColor = declaredColor || "red";
          } else {
            room.currentColor = card.color;
          }

          // Handle special cards
          let skipNext = false;
          if (card.value === "Skip") {
            skipNext = true;
          } else if (card.value === "Reverse") {
            room.direction =
              room.direction === "clockwise" ? "counter" : "clockwise";
            if (room.players.length === 2) skipNext = true;
          } else if (card.value === "+2") {
            room.drawStack += 2;
          } else if (card.value === "+4") {
            room.drawStack += 4;
          }

          // Check for win
          if (botPlayer.hand.length === 0) {
            room.status = "finished";
            room.winner = botId;
            await room.save();
            io.to(roomCode).emit("gameEnded", {
              winner: botId,
              winnerName: botPlayer.user.name,
            });
            return;
          }

          // Move to next turn
          room.currentTurn = getNextTurn(room, skipNext ? 2 : 1);

          await room.save();

          // Emit game update
          const formattedRoom = formatRoomForClient(room);
          io.to(roomCode).emit("gameUpdate", formattedRoom);

          // If next player is also a bot, trigger their turn
          const nextPlayer = room.players[room.currentTurn];
          if (nextPlayer && nextPlayer.isBot) {
            setTimeout(() => {
              botService.executeBotTurn(io, roomCode, nextPlayer.user._id);
            }, 1000);
          }
        } catch (err) {
          console.error("Bot play card error:", err);
        }
      }
    );

    socket.on("botDrawCard", async ({ roomCode, botId }) => {
      try {
        let room = await Room.findOne({ code: roomCode });
        if (!room || room.status !== "active") return;

        const botPlayerIndex = room.players.findIndex(
          (p) => p.isBot && p.user._id === botId
        );

        if (botPlayerIndex === -1 || room.currentTurn !== botPlayerIndex)
          return;

        const botPlayer = room.players[botPlayerIndex];

        // Draw card
        if (room.deck.length === 0) {
          const topCard = room.discardPile.pop();
          room.deck = shuffle(room.discardPile);
          room.discardPile = [topCard];
        }

        if (room.deck.length > 0) {
          const drawnCard = room.deck.pop();
          botPlayer.hand.push(drawnCard);
        }

        // Move to next turn
        room.currentTurn = getNextTurn(room);

        await room.save();

        // Emit game update
        const formattedRoom = formatRoomForClient(room);
        io.to(roomCode).emit("gameUpdate", formattedRoom);

        // If next player is also a bot, trigger their turn
        const nextPlayer = room.players[room.currentTurn];
        if (nextPlayer && nextPlayer.isBot) {
          setTimeout(() => {
            botService.executeBotTurn(io, roomCode, nextPlayer.user._id);
          }, 1500);
        }
      } catch (err) {
        console.error("Bot draw card error:", err);
      }
    }); // Send team invitation
    socket.on(
      "sendTeamInvitation",
      async ({ friendId, roomCode }, callback) => {
        try {
          console.log(
            `User ${userId} sending team invitation to ${friendId} for room ${roomCode}`
          );

          let room = await Room.findOne({ code: roomCode });
          if (!room) return callback({ error: "Room not found" });

          room = await populateRoomPlayers(room);

          const friend = await User.findById(friendId);
          if (!friend) return callback({ error: "Friend not found" });

          // Check if room has space
          if (room.players.length >= 4) {
            return callback({ error: "Room is full" });
          } // Check if friend is already in room
          const friendInRoom = room.players.some((p) => {
            if (p.isBot) {
              return false; // Bots are not friends
            }
            const playerId = p.user._id
              ? p.user._id.toString()
              : p.user.toString();
            return playerId === friendId;
          });

          if (friendInRoom) {
            return callback({ error: "Friend is already in the room" });
          }

          // Send invitation to friend (you could store this in database for persistence)
          // For now, we'll emit directly if they're online
          const friendSockets = await io.in("user_" + friendId).fetchSockets();

          if (friendSockets.length > 0) {
            friendSockets.forEach((friendSocket) => {
              friendSocket.emit("teamInvitationReceived", {
                from: {
                  id: userId,
                  name: socket.user.name,
                  picture: socket.user.picture,
                },
                roomCode: roomCode,
                roomId: room._id,
                timestamp: new Date().toISOString(),
              });
            });

            callback({
              success: true,
              message: "Invitation sent successfully",
            });
          } else {
            // Friend is offline, you might want to store notification in database
            callback({
              success: false,
              message: "Friend is currently offline",
            });
          }
        } catch (err) {
          console.error("Send team invitation error:", err);
          callback({ error: "Server error" });
        }
      }
    );

    // Accept team invitation
    socket.on("acceptTeamInvitation", async ({ roomCode }, callback) => {
      try {
        console.log(
          `User ${userId} accepting team invitation for room ${roomCode}`
        );

        // This will reuse the existing joinRoom logic
        socket.emit("joinRoom", roomCode, callback);
      } catch (err) {
        console.error("Accept team invitation error:", err);
        callback({ error: "Server error" });
      }
    }); // Disconnect cleanup
    socket.on("disconnect", async () => {
      try {
        // Remove player from any rooms they are in
        const rooms = await Room.find({ "players.socketId": socket.id });
        for (const room of rooms) {
          room.players = room.players.filter((p) => p.socketId !== socket.id); // If host left, assign new host (first player)
          // Check if user is host - handle both ObjectId and populated user object
          let hostId;
          if (room.host && typeof room.host === "object" && room.host._id) {
            // Host is a populated user object
            hostId = room.host._id.toString();
          } else if (room.host) {
            // Host is ObjectId or string
            hostId = room.host.toString();
          }

          if (hostId === userId && room.players.length > 0) {
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

async function updateUserHistory(userId, gameId, result) {
  const User = require("../models/User");
  await User.findByIdAndUpdate(userId, {
    $push: {
      history: { gameId, result, timestamp: new Date() },
    },
  });
}

const formatRoomForClient = (room, requestingUserId = null) => {
  // Handle host field - could be ObjectId, string, or populated user object
  let hostId;
  if (room.host && typeof room.host === "object" && room.host._id) {
    // Host is a populated user object
    hostId = room.host._id.toString();
  } else if (room.host) {
    // Host is ObjectId or string
    hostId = room.host.toString();
  } else {
    hostId = null;
  }

  return {
    id: room._id,
    code: room.code,
    host: hostId,
    currentTurn: room.currentTurn,
    gameStarted: room.status === "active",
    discardPile: room.discardPile,
    currentColor: room.currentColor,
    direction: room.direction === "clockwise" ? 1 : -1,
    gameEnded: room.status === "finished",
    winner: room.winner,
    allowBots: room.allowBots,
    maxPlayers: room.maxPlayers,
    players: room.players.map((player) => {
      // Handle both regular users and bot players
      const userData = player.isBot ? player.user : player.user;
      const playerId = userData._id
        ? userData._id.toString()
        : userData.toString();

      return {
        id: playerId,
        name: userData.name || `Player ${room.players.indexOf(player) + 1}`,
        picture: userData.picture || null,
        // Send full cards only to the player themselves, card count to others
        cards:
          requestingUserId && playerId === requestingUserId.toString()
            ? Array.isArray(player.hand)
              ? player.hand
              : []
            : Array.isArray(player.hand)
            ? player.hand.length
            : player.hand || 0,
        saidUno: player.saidUno,
        isBot: player.isBot || false,
      };
    }),
  };
};

module.exports = { setupGameSockets };
