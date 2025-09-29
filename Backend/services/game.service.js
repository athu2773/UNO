const Room = require("../models/Room");
const User = require("../models/User");
const { generateDeck, shuffle, isPlayable } = require("../utils/unoLogic");
const crypto = require("crypto");

/**
 * Generate a unique room code
 */
function generateRoomCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. 'A1B2C3'
}

/**
 * Create a new game room with the creator as host
 * @param {String} hostUserId - Mongo ObjectId of host user
 * @returns {Promise<Room>} created room document
 */
async function createRoom(hostUserId) {
  const code = generateRoomCode();

  // Generate and shuffle deck
  let deck = generateDeck();

  // Deal 7 cards each to host (initially only 1 player)
  const hand = deck.splice(0, 7);

  const room = new Room({
    code,
    host: hostUserId,
    players: [
      {
        user: hostUserId,
        hand,
        socketId: null, // to be assigned on socket join
        saidUno: false,
      },
    ],
    deck,
    discardPile: [],
    currentTurn: 0,
    direction: "clockwise",
    drawStack: 0,
    currentColor: null,
    status: "waiting",
  });

  // Start discard pile with first valid card from deck (skip wild)
  let firstCard;
  while (deck.length) {
    const card = deck.shift();
    if (card.color !== "black") {
      firstCard = card;
      break;
    } else {
      deck.push(card); // move wild card to end
    }
  }
  if (!firstCard) {
    throw new Error("Failed to initialize discard pile");
  }

  room.discardPile.push(firstCard);
  room.currentColor = firstCard.color;

  await room.save();
  return room;
}

/**
 * Add player to room if space available
 * @param {String} roomCode 
 * @param {String} userId 
 * @returns {Promise<Room>}
 */
async function joinRoom(roomCode, userId) {
  const room = await Room.findOne({ code: roomCode });

  if (!room) throw new Error("Room not found");
  if (room.players.length >= 4) throw new Error("Room is full");
  if (room.players.find(p => p.user.toString() === userId)) throw new Error("Already joined");

  // Deal 7 cards from deck
  if (room.deck.length < 7) {
    // reshuffle discardPile except top card back to deck if needed
    reshuffleDeck(room);
  }
  const hand = room.deck.splice(0, 7);

  room.players.push({
    user: userId,
    hand,
    socketId: null,
    saidUno: false,
  });

  // If 4 players joined, start the game automatically
  if (room.players.length === 4) {
    room.status = "active";
  }

  await room.save();
  return room;
}

/**
 * Reshuffle discard pile except top card back to deck when deck is low
 * @param {Room} room 
 */
function reshuffleDeck(room) {
  if (room.discardPile.length <= 1) {
    throw new Error("Not enough cards to reshuffle");
  }
  const topCard = room.discardPile.pop();
  room.deck = shuffle([...room.deck, ...room.discardPile]);
  room.discardPile = [topCard];
}

/**
 * Get player index for given user id in room
 * @param {Room} room 
 * @param {String} userId 
 * @returns {Number} index or -1 if not found
 */
function getPlayerIndex(room, userId) {
  return room.players.findIndex(p => p.user.toString() === userId);
}

/**
 * Play a card from player's hand
 * @param {Room} room 
 * @param {String} userId 
 * @param {Object} cardToPlay - {color, value}
 * @param {String} chosenColor - for wild cards, new color chosen
 * @returns {Room} updated room
 */
async function playCard(room, userId, cardToPlay, chosenColor = null) {
  if (room.status !== "active") throw new Error("Game not active");
  const playerIdx = getPlayerIndex(room, userId);
  if (playerIdx === -1) throw new Error("Player not in room");
  if (playerIdx !== room.currentTurn) throw new Error("Not your turn");

  const player = room.players[playerIdx];

  // Find card in hand matching color and value
  const cardIndex = player.hand.findIndex(
    (c) => c.color === cardToPlay.color && c.value === cardToPlay.value
  );
  if (cardIndex === -1) throw new Error("Card not in hand");

  const topCard = room.discardPile[room.discardPile.length - 1];

  // Check if card is playable
  if (!isPlayable(cardToPlay, topCard, room.currentColor)) {
    throw new Error("Card not playable");
  }

  // Remove card from hand
  const playedCard = player.hand.splice(cardIndex, 1)[0];

  // Add card to discard pile
  room.discardPile.push(playedCard);

  // Update current color (for wild cards or normal card)
  if (playedCard.color === "black") {
    if (!chosenColor) throw new Error("Must choose a color for wild card");
    room.currentColor = chosenColor;
  } else {
    room.currentColor = playedCard.color;
  }

  // Reset drawStack if playing non-draw cards, or increment if +2 or +4 played
  if (playedCard.value === "+2") {
    room.drawStack += 2;
  } else if (playedCard.value === "+4") {
    room.drawStack += 4;
  } else if (playedCard.value !== "+2" && playedCard.value !== "+4") {
    // If card not draw card, reset drawStack
    room.drawStack = 0;
  }

  // Handle special cards effects (skip, reverse)
  if (playedCard.value === "skip") {
    room.currentTurn = getNextTurn(room, 2); // skip next player
  } else if (playedCard.value === "reverse") {
    room.direction = room.direction === "clockwise" ? "counter" : "clockwise";
    if (room.players.length === 2) {
      // In two-player game reverse acts as skip
      room.currentTurn = getNextTurn(room, 2);
    } else {
      room.currentTurn = getNextTurn(room, 1);
    }
  } else {
    // Normal advance turn
    if (playedCard.value !== "skip") {
      room.currentTurn = getNextTurn(room, 1);
    }
  }

  // Check UNO condition: if player has 1 card, must say UNO, if 0 cards game ends
  if (player.hand.length === 1) {
    player.saidUno = false; // must say UNO before next play
  }

  if (player.hand.length === 0) {
    room.status = "finished";
    room.winner = player.user;
    await recordGameResult(room, player.user);
  }

  await room.save();
  return room;
}

/**
 * Get the next turn index according to direction and step count
 * @param {Room} room 
 * @param {Number} step 
 * @returns {Number} next player index
 */
function getNextTurn(room, step = 1) {
  const len = room.players.length;
  let next = room.currentTurn;
  for (let i = 0; i < step; i++) {
    if (room.direction === "clockwise") {
      next = (next + 1) % len;
    } else {
      next = (next - 1 + len) % len;
    }
  }
  return next;
}

/**
 * Draw cards for player, considering drawStack if any
 * @param {Room} room 
 * @param {String} userId 
 * @returns {Object} { room, drawnCards }
 */
async function drawCards(room, userId) {
  if (room.status !== "active") throw new Error("Game not active");
  const playerIdx = getPlayerIndex(room, userId);
  if (playerIdx === -1) throw new Error("Player not in room");
  if (playerIdx !== room.currentTurn) throw new Error("Not your turn");

  const player = room.players[playerIdx];
  let count = room.drawStack || 1;

  // Refill deck if needed
  if (room.deck.length < count) {
    reshuffleDeck(room);
  }

  // Draw cards
  const drawnCards = room.deck.splice(0, count);
  player.hand.push(...drawnCards);

  // Reset drawStack after draw
  room.drawStack = 0;

  // Advance turn
  room.currentTurn = getNextTurn(room, 1);

  await room.save();

  return { room, drawnCards };
}

/**
 * Record game result to users' histories
 * @param {Room} room 
 * @param {String} winnerUserId 
 */
async function recordGameResult(room, winnerUserId) {
  for (const player of room.players) {
    const result = player.user.toString() === winnerUserId.toString() ? "win" : "loss";
    await User.findByIdAndUpdate(player.user, {
      $push: { history: { gameId: room._id, result } },
    });
  }
}

module.exports = {
  createRoom,
  joinRoom,
  playCard,
  drawCards,
};
