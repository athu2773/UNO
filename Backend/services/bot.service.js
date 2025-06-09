// File: services/bot.service.js
const { isPlayable } = require("../utils/unoLogic");
const Room = require("../models/Room");

// Bot names pool
const BOT_NAMES = [
  "Bot Alice", "Bot Charlie", "Bot Diana", "Bot Echo",
  "Bot Felix", "Bot Grace", "Bot Hunter", "Bot Iris"
];

/**
 * Create a bot player object
 * @param {String} name - Bot name
 * @param {String} socketId - Socket ID for the bot
 * @returns {Object} - Bot player object
 */
function createBotPlayer(name = null, socketId = null) {
  const botName = name || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return {
    user: {
      _id: `bot_${Date.now()}_${Math.random()}`,
      name: botName,
      email: `${botName.toLowerCase().replace(' ', '')}@bot.uno`,
      picture: null,
      isBot: true
    },
    socketId: socketId || `bot_socket_${Date.now()}`,
    hand: [],
    saidUno: false,
    isBot: true
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
      throw new Error('Room not found');
    }

    if (room.players.length + numberOfBots > 4) {
      throw new Error('Cannot add bots: Room would exceed maximum capacity');
    }

    // Get used names (handle both populated and non-populated users)
    const usedNames = room.players.map(p => {
      if (p.isBot) {
        return p.user.name;
      } else {
        // For regular users, we can't get the name without populating
        // So we'll just use a placeholder check
        return null;
      }
    }).filter(Boolean);
    
    const availableNames = BOT_NAMES.filter(name => !usedNames.includes(name));
    
    for (let i = 0; i < numberOfBots && availableNames.length > 0; i++) {
      const botName = availableNames[i];
      const bot = createBotPlayer(botName);
      room.players.push(bot);
    }

    await room.save();
    
    // Return the room without population - the caller will handle it
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
      throw new Error('Room not found');
    }

    if (botId) {
      room.players = room.players.filter(p => 
        !(p.isBot && p.user._id === botId)
      );
    } else {
      room.players = room.players.filter(p => !p.isBot);
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
    if (!room || room.status !== 'active') {
      throw new Error('Game not active');
    }

    const botPlayerIndex = room.players.findIndex(p => 
      p.isBot && p.user._id === botId
    );

    if (botPlayerIndex === -1) {
      throw new Error('Bot not found in room');
    }

    if (room.currentTurn !== botPlayerIndex) {
      throw new Error('Not bot\'s turn');
    }

    const botPlayer = room.players[botPlayerIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];
    
    // Decide what card to play
    const cardToPlay = chooseCardToPlay(botPlayer.hand, topCard, room.currentColor);
    
    if (cardToPlay) {
      const cardIndex = botPlayer.hand.findIndex(c => 
        c.color === cardToPlay.color && c.value === cardToPlay.value
      );
      
      let declaredColor = null;
      if (cardToPlay.color === 'black') {
        declaredColor = chooseColor(botPlayer.hand);
      }

      return {
        action: 'playCard',
        cardIndex,
        declaredColor,
        card: cardToPlay
      };
    } else {
      return {
        action: 'drawCard'
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
    // Add realistic delay (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;
    
    setTimeout(async () => {
      try {
        const move = await makeBotMove(roomCode, botId);
        
        if (move.action === 'playCard') {
          // Trigger the actual bot play card event
          io.to(roomCode).emit('processBotPlayCard', {
            roomCode,
            botId,
            cardIndex: move.cardIndex,
            declaredColor: move.declaredColor,
            card: move.card
          });
        } else if (move.action === 'drawCard') {
          // Trigger the actual bot draw card event
          io.to(roomCode).emit('processBotDrawCard', {
            roomCode,
            botId
          });
        }
      } catch (error) {
        console.error('Bot turn execution error:', error);
      }
    }, delay);
  } catch (error) {
    console.error('Bot turn setup error:', error);
  }
}

module.exports = {
  chooseCardToPlay,
  chooseColor,
  createBotPlayer,
  addBotsToRoom,
  removeBotsFromRoom,
  makeBotMove,
  executeBotTurn,
};
