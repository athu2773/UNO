// src/pages/GamePage.jsx
import React from "react";
import GameBoard from "../components/Game/GameBoard";

const GamePage = () => {
  return (
    <div className="min-h-screen bg-green-100 p-4 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-6">UNO Game</h1>
      <GameBoard />
    </div>
  );
};

export default GamePage;
