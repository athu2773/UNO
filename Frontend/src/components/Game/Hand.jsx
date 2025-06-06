// src/components/Game/Hand.jsx
import React from "react";
import Card from "./Card";

const Hand = ({ hand, onCardClick, selectedCard }) => {
  if (!hand || hand.length === 0) return <p className="text-center text-gray-500">No cards in hand.</p>;

  return (
    <div className="overflow-x-auto mt-4">
      <div className="flex gap-3">
        {hand.map((card, index) => (
          <div
            key={index}
            className={`cursor-pointer transition-transform duration-200 ${
              selectedCard?.index === index ? "scale-110" : "hover:scale-105"
            }`}
            onClick={() => onCardClick(card, index)}
          >
            <Card card={card} isSelected={selectedCard?.index === index} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hand;
