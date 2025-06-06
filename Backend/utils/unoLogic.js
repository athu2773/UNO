const colors = ["red", "green", "blue", "yellow"];
const numbers = [...Array(10).keys()]; // 0-9
const specialCards = ["skip", "+2", "reverse"];
const wildCards = ["wild", "+4"];

function generateDeck() {
  const deck = [];

  // Numbered and action cards by color
  colors.forEach((color) => {
    deck.push({ color, value: "0" }); // one 0 per color
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, value: i.toString() });
      deck.push({ color, value: i.toString() });
    }
    specialCards.forEach((value) => {
      deck.push({ color, value });
      deck.push({ color, value });
    });
  });

  // Wild cards (no color)
  for (let i = 0; i < 4; i++) {
    wildCards.forEach((value) => deck.push({ color: "black", value }));
  }

  return shuffle(deck);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function isPlayable(card, topCard, currentColor) {
  return (
    card.color === currentColor ||
    card.value === topCard.value ||
    card.color === "black"
  );
}

module.exports = {
  generateDeck,
  shuffle,
  isPlayable,
};
