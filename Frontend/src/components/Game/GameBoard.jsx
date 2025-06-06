// src/components/Game/GameBoard.jsx
import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext";
import { AuthContext } from "../../context/AuthContext";
import Hand from "./Hand";
import Card from "./Card";

const GameBoard = ({ gameState }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [localHand, setLocalHand] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [unoPressed, setUnoPressed] = useState(false);

  const currentPlayer = gameState?.players?.find(p => p.user._id === user._id);
  const isMyTurn = gameState?.players[gameState.currentTurn]?.user._id === user._id;

  useEffect(() => {
    if (currentPlayer) {
      setLocalHand(currentPlayer.hand);
    }
  }, [gameState]);

  const handleCardClick = (card, index) => {
    if (!isMyTurn) return;
    setSelectedCard({ ...card, index });
  };

  const playCard = () => {
    if (!selectedCard) return;

    socket.emit("play_card", {
      card: selectedCard,
      roomId: gameState.code,
      saidUno: unoPressed,
    });

    setSelectedCard(null);
    setUnoPressed(false);
  };

  const drawCard = () => {
    socket.emit("draw_card", { roomId: gameState.code });
  };

  const sayUno = () => {
    setUnoPressed(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-200 to-blue-100 flex flex-col items-center py-6 px-4">
      <h2 className="text-2xl font-bold mb-4">UNO Room: {gameState.code}</h2>

      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-4xl">
        {/* Turn Info */}
        <div className="mb-4 text-center">
          <p className="text-lg">
            {isMyTurn ? (
              <span className="text-green-600 font-semibold">Your Turn!</span>
            ) : (
              `Waiting for ${gameState.players[gameState.currentTurn]?.user?.name || "..."}` 
            )}
          </p>
        </div>

        {/* Discard Pile */}
        <div className="flex justify-center mb-4">
          <div>
            <p className="text-gray-600 mb-1 text-sm text-center">Top of Discard</p>
            <Card card={gameState.discardPile?.slice(-1)[0]} />
          </div>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
          {gameState.players.map((p, i) => (
            <div key={p.user._id} className="flex items-center justify-between px-4 py-2 border rounded-lg bg-gray-100">
              <span>{p.user.name}</span>
              <span>{p.hand.length} cards</span>
              {gameState.currentTurn === i && <span className="text-xs text-blue-500">🎯</span>}
            </div>
          ))}
        </div>

        {/* Your Hand */}
        <div className="mt-6">
          <Hand hand={localHand} onCardClick={handleCardClick} selectedCard={selectedCard} />
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={sayUno}
            className="bg-yellow-400 text-white px-4 py-2 rounded-lg shadow hover:bg-yellow-500"
          >
            Say UNO
          </button>

          <button
            onClick={drawCard}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
            disabled={!isMyTurn}
          >
            Draw
          </button>

          <button
            onClick={playCard}
            className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600"
            disabled={!selectedCard || !isMyTurn}
          >
            Play Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
