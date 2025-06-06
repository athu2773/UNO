// File: services/bot.service.js
const { isPlayable } = require("../utils/unoLogic");

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

module.exports = {
  chooseCardToPlay,
  chooseColor,
};
