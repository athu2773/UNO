// src/components/Game/Card.jsx
import React from "react";

const colorClasses = {
  red: "bg-red-600 text-white",
  blue: "bg-blue-600 text-white",
  yellow: "bg-yellow-400 text-black",
  green: "bg-green-600 text-white",
  black: "bg-black text-white",
};

const Card = ({ card, onClick, isPlayable, isSelected }) => {
  // card: { color: "red"|"blue"|"yellow"|"green"|"black", value: number|string }
  // value can be 0-9, "skip", "reverse", "+2", "wild", "+4"

  const baseClass = "w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer select-none";
  const playableClass = isPlayable ? "ring-4 ring-yellow-400" : "";
  const selectedClass = isSelected ? "ring-4 ring-green-500" : "";
  const cardColorClass = colorClasses[card.color] || "bg-gray-300";

  // Show text or icon based on card.value
  const renderCardValue = () => {
    switch (card.value) {
      case "skip":
        return "⛔ Skip";
      case "reverse":
        return "↺ Reverse";
      case "+2":
        return "+2";
      case "wild":
        return "★ Wild";
      case "+4":
        return "+4";
      default:
        return card.value;
    }
  };

  return (
    <div
      className={`${baseClass} ${cardColorClass} ${playableClass} ${selectedClass} shadow-lg`}
      onClick={() => onClick && onClick(card)}
      title={`${card.color.toUpperCase()} ${card.value.toString().toUpperCase()}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick && onClick(card);
      }}
    >
      <span className="text-2xl font-bold">{renderCardValue()}</span>
    </div>
  );
};

export default Card;
