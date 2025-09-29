const { isPlayable, shuffle } = require("../utils/unoLogic");
const Room = require("../models/Room");

// Bot names pool
const BOT_NAMES = [
  "Bot Alice",
  "Bot Charlie",
  "Bot Diana",
  "Bot Echo",
  "Bot Felix",
  "Bot Grace",
  "Bot Hunter",
  "Bot Iris",
];

/**
 * Create a bot player object
 * @param {String} name - Bot name
 * @param {String} socketId - Socket ID for the bot
 * @returns {Object} - Bot player object
 */
function createBotPlayer(name = null, socketId = null) {
  const botName =
    name || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return {
    user: {
      _id: `bot_${Date.now()}_${Math.random()}`,
      name: botName,
      email: `${botName.toLowerCase().replace(" ", "")}@bot.uno`,
      picture: null,
      isBot: true,
    },
    socketId: socketId || `bot_socket_${Date.now()}`,
    hand: [],
    saidUno: false,
    isBot: true,
  };
}

/**
 * Add bot players to a room
 * @param {String} roomCode - Room code
 * @param {Number} numberOfBots - Number of bots to add
 * @returns {Promise<Object>} - Updated room
 */
async function addBotsToRoom(roomCode, numberOfBots = 1) {
  try {
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.players.length + numberOfBots > 4) {
      throw new Error("Cannot add bots: Room would exceed maximum capacity");
    }

    // Get used names (handle both populated and non-populated users)
    const usedNames = room.players
      .map((p) => {
        if (p.isBot) {
          return p.user.name;
        } else {
          return null;
        }
      })
      .filter(Boolean);

    const availableNames = BOT_NAMES.filter(
      (name) => !usedNames.includes(name)
    );

    for (let i = 0; i < numberOfBots && availableNames.length > 0; i++) {
      const botName = availableNames[i];
      const bot = createBotPlayer(botName);
      room.players.push(bot);
    }

    await room.save();

    return await Room.findOne({ code: roomCode });
  } catch (error) {
    throw error;
  }
}

/**
 * Remove bot players from a room
 * @param {String} roomCode - Room code
 * @param {String} botId - Bot ID to remove (optional, removes all bots if not specified)
 * @returns {Promise<Object>} - Updated room
 */
async function removeBotsFromRoom(roomCode, botId = null) {
  try {
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      throw new Error("Room not found");
    }

    if (botId) {
      room.players = room.players.filter(
        (p) => !(p.isBot && p.user._id === botId)
      );
    } else {
      room.players = room.players.filter((p) => !p.isBot);
    }

    await room.save();
    return await Room.findOne({ code: roomCode });
  } catch (error) {
    throw error;
  }
}

/**
 * Make a bot move in the game
 * @param {String} roomCode - Room code
 * @param {String} botId - Bot player ID
 * @returns {Promise<Object>} - Move result
 */
async function makeBotMove(roomCode, botId) {
  try {
    const room = await Room.findOne({ code: roomCode });
    if (!room || room.status !== "active") {
      throw new Error("Game not active");
    }

    const botPlayerIndex = room.players.findIndex(
      (p) => p.isBot && p.user._id === botId
    );

    if (botPlayerIndex === -1) {
      throw new Error("Bot not found in room");
    }

    if (room.currentTurn !== botPlayerIndex) {
      throw new Error("Not bot's turn");
    }

    const botPlayer = room.players[botPlayerIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];

    // Decide what card to play
    const cardToPlay = chooseCardToPlay(
      botPlayer.hand,
      topCard,
      room.currentColor
    );

    if (cardToPlay) {
      const cardIndex = botPlayer.hand.findIndex(
        (c) => c.color === cardToPlay.color && c.value === cardToPlay.value
      );

      let declaredColor = null;
      if (cardToPlay.color === "black") {
        declaredColor = chooseColor(botPlayer.hand);
      }

      return {
        action: "playCard",
        cardIndex,
        declaredColor,
        card: cardToPlay,
      };
    } else {
      return {
        action: "drawCard",
      };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Decide which card the bot should play from its hand.
 * If no card is playable, return null to indicate draw.
 * @param {Array} botHand - Array of card objects in bot's hand
 * @param {Object} topCard - The current card on top of discard pile
 * @param {String} currentColor - The current color in play
 * @returns {Object|null} - The card to play or null if draw required
 */
function chooseCardToPlay(botHand, topCard, currentColor) {
  // Prioritize playing non-wild cards first (for simplicity)
  for (const card of botHand) {
    if (card.color !== "black" && isPlayable(card, topCard, currentColor)) {
      return card;
    }
  }
  // If no non-wild playable cards, try wild cards
  for (const card of botHand) {
    if (card.color === "black" && isPlayable(card, topCard, currentColor)) {
      return card;
    }
  }
  // No playable card found, must draw
  return null;
}

/**
 * Choose a color when playing a wild card.
 * Simple heuristic: pick the color most in hand.
 * @param {Array} hand - Bot's hand of cards
 * @returns {String} - color chosen ("red", "blue", "green", "yellow")
 */
function chooseColor(hand) {
  const colorCount = { red: 0, blue: 0, green: 0, yellow: 0 };
  hand.forEach((card) => {
    if (colorCount.hasOwnProperty(card.color)) {
      colorCount[card.color]++;
    }
  });
  // Pick color with max count, default red if none
  let maxColor = "red";
  let maxCount = 0;
  for (const color in colorCount) {
    if (colorCount[color] > maxCount) {
      maxCount = colorCount[color];
      maxColor = color;
    }
  }
  return maxColor;
}

/**
 * Execute bot turn automatically with delay for realism
 * @param {Object} io - Socket.io instance
 * @param {String} roomCode - Room code
 * @param {String} botId - Bot ID
 */
async function executeBotTurn(io, roomCode, botId) {
  try {
    console.log(`🤖 Executing bot turn for ${botId} in room ${roomCode}`);

    // Add realistic delay (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;

    setTimeout(async () => {
      try {
        const move = await makeBotMove(roomCode, botId);
        console.log(`🤖 Bot ${botId} decided to:`, move);

        if (move.action === "playCard") {
          // Directly call the bot card play handler
          await handleBotPlayCard(io, {
            roomCode,
            botId,
            cardIndex: move.cardIndex,
            declaredColor: move.declaredColor,
          });
        } else if (move.action === "drawCard") {
          // Directly call the bot draw card handler
          await handleBotDrawCard(io, {
            roomCode,
            botId,
          });
        }
      } catch (error) {
        console.error("Bot turn execution error:", error);
      }
    }, delay);
  } catch (error) {
    console.error("Bot turn setup error:", error);
  }
}

// Handle bot playing a card (extracted from gameSocket.js logic)
async function handleBotPlayCard(
  io,
  { roomCode, botId, cardIndex, declaredColor }
) {
  try {
    console.log(`🤖 Bot ${botId} playing card at index ${cardIndex}`);

    let room = await Room.findOne({ code: roomCode });
    if (!room || room.status !== "active") {
      console.log(`❌ Room not active or not found for bot ${botId}`);
      return;
    }

    const botPlayerIndex = room.players.findIndex(
      (p) => p.isBot && p.user._id === botId
    );

    if (botPlayerIndex === -1 || room.currentTurn !== botPlayerIndex) {
      console.log(`❌ Bot ${botId} not found or not their turn`);
      return;
    }

    const botPlayer = room.players[botPlayerIndex];
    const card = botPlayer.hand[cardIndex];

    if (!card) {
      console.log(
        `❌ Bot ${botId} tried to play invalid card at index ${cardIndex}`
      );
      return;
    }

    const topCard = room.discardPile[room.discardPile.length - 1];

    if (!isPlayable(card, topCard, room.currentColor)) {
      console.log(`❌ Bot ${botId} tried to play unplayable card:`, card);
      return;
    }

    console.log(`✅ Bot ${botId} playing ${card.color} ${card.value}`);

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
    if (card.value === "skip") {
      skipNext = true;
    } else if (card.value === "reverse") {
      room.direction = room.direction === "clockwise" ? "counter" : "clockwise";
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

      // Send personalized game end data
      await sendPersonalizedGameData(io, room, roomCode);
      io.to(roomCode).emit("gameEnded", {
        winner: botId,
        winnerName: botPlayer.user.name,
      });
      return;
    }

    // Move to next turn
    room.currentTurn = getNextTurn(room, skipNext ? 2 : 1);

    await room.save();

    console.log(
      `🤖 Bot ${botId} played card successfully. Next turn: ${room.currentTurn}`
    );

    // Send updated game state to all players
    await sendPersonalizedGameData(io, room, roomCode);

    // If next player is also a bot, trigger their turn
    const nextPlayer = room.players[room.currentTurn];
    if (nextPlayer && nextPlayer.isBot) {
      console.log(
        `🤖 Next player ${nextPlayer.user.name} is also a bot, scheduling turn...`
      );
      setTimeout(() => {
        executeBotTurn(io, roomCode, nextPlayer.user._id);
      }, 1000);
    }
  } catch (err) {
    console.error("Bot play card error:", err);
  }
}

// Handle bot drawing a card
async function handleBotDrawCard(io, { roomCode, botId }) {
  try {
    console.log(`🤖 Bot ${botId} drawing card`);

    let room = await Room.findOne({ code: roomCode });
    if (!room || room.status !== "active") return;

    const botPlayerIndex = room.players.findIndex(
      (p) => p.isBot && p.user._id === botId
    );

    if (botPlayerIndex === -1 || room.currentTurn !== botPlayerIndex) return;

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
      console.log(`🤖 Bot ${botId} drew a card`);
    }

    // Move to next turn
    room.currentTurn = getNextTurn(room);

    await room.save();

    // Send updated game state
    await sendPersonalizedGameData(io, room, roomCode);

    // If next player is also a bot, trigger their turn
    const nextPlayer = room.players[room.currentTurn];
    if (nextPlayer && nextPlayer.isBot) {
      setTimeout(() => {
        executeBotTurn(io, roomCode, nextPlayer.user._id);
      }, 1500);
    }
  } catch (err) {
    console.error("Bot draw card error:", err);
  }
}

// Helper function to send personalized game data to all players
async function sendPersonalizedGameData(io, room, roomCode) {
  // Populate room players
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
}

// Helper functions (need to import from gameSocket.js or duplicate)
function getNextTurn(room, step = 1) {
  const playerCount = room.players.length;
  let current = room.currentTurn;
  if (room.direction === "clockwise") {
    return (current + step) % playerCount;
  } else {
    return (current - step + playerCount) % playerCount;
  }
}

// Import required functions
async function populateRoomPlayers(room) {
  const User = require("../models/User");
  for (let i = 0; i < room.players.length; i++) {
    const player = room.players[i];
    if (!player.isBot && player.user && typeof player.user === "string") {
      try {
        const userData = await User.findById(player.user);
        if (userData) {
          room.players[i].user = userData;
        }
      } catch (err) {
        console.error("Error populating user:", err);
      }
    }
  }
  return room;
}

function formatRoomForClient(room, requestingUserId = null) {
  let hostId;
  if (room.host && typeof room.host === "object" && room.host._id) {
    hostId = room.host._id.toString();
  } else if (room.host) {
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
      const userData = player.isBot ? player.user : player.user;
      const playerId = userData._id
        ? userData._id.toString()
        : userData.toString();

      return {
        id: playerId,
        name: userData.name || `Player ${room.players.indexOf(player) + 1}`,
        picture: userData.picture || null,
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
}

module.exports = {
  chooseCardToPlay,
  chooseColor,
  createBotPlayer,
  addBotsToRoom,
  removeBotsFromRoom,
  makeBotMove,
  executeBotTurn,
  handleBotPlayCard,
  handleBotDrawCard,
};
