import React, { useState } from "react";
import UnoCard from "./UnoCard";
import { Button } from "../ui/button";
import { useSocket } from "../../context/SocketContext";
import { toast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";

interface Card {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string | number;
  type: 'number' | 'action' | 'wild';
}

interface PlayerHandProps {
  cards: Card[];
  currentCard: Card | null;
  currentColor: string;
  isMyTurn: boolean;
  roomCode: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  currentCard,
  currentColor,
  isMyTurn,
  roomCode,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { socket } = useSocket();

  const isCardPlayable = (card: Card) => {
    if (!currentCard) return false;
    return (
      card.color === currentColor ||
      card.value === currentCard.value ||
      card.color === "black"
    );
  };

  const handleCardClick = (card: Card, index: number) => {
    if (!isMyTurn) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to play a card",
        variant: "destructive",
      });
      return;
    }

    if (!isCardPlayable(card)) {
      toast({
        title: "Invalid move",
        description: "This card cannot be played right now",
        variant: "destructive",
      });
      return;
    }

    setSelectedCard(card);

    // If it's a wild card, wait for color selection
    if (card.color === "black") {
      return;
    }

    // Play the card immediately for non-wild cards
    playCard(card, index);
  };

  const playCard = (card: Card, _index: number, declaredColor?: string) => {
    if (!socket) return;

    const cardData = declaredColor ? { ...card, declaredColor } : card;
    
    console.log("🃏 Playing card:", cardData, "from room:", roomCode);
    socket.emit("playCard", roomCode, cardData, (response: any) => {
      console.log("🃏 Play card response:", response);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Card played",
          description: `Played ${card.value} of ${card.color}`,
        });
        setSelectedCard(null);
      }
    });
  };

  const handleColorSelection = (color: string) => {
    if (!selectedCard) return;

    const cardIndex = cards.findIndex(c => c.id === selectedCard.id);
    playCard(selectedCard, cardIndex, color);
  };

  const handleDrawCard = () => {
    if (!socket || !isMyTurn) return;

    console.log("🃏 Drawing card for room:", roomCode);
    socket.emit("drawCard", roomCode, (response: any) => {
      console.log("🃏 Draw card response:", response);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Card drawn",
          description: "You drew a card from the deck",
        });
      }
    });
  };

  const handleSayUno = () => {
    if (!socket) return;

    socket.emit("sayUno", roomCode, (response: any) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "UNO!",
          description: "You said UNO!",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Color selection for wild cards */}
      {selectedCard && selectedCard.color === "black" && (
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-3 text-center text-gray-800">
            Choose a color
          </h3>
          <div className="flex space-x-2">
            {["red", "green", "blue", "yellow"].map((color) => (
              <Button
                key={color}
                onClick={() => handleColorSelection(color)}
                className={cn(
                  "w-12 h-12 rounded-full",
                  color === "red" && "bg-red-500 hover:bg-red-600",
                  color === "green" && "bg-green-500 hover:bg-green-600",
                  color === "blue" && "bg-blue-500 hover:bg-blue-600",
                  color === "yellow" && "bg-yellow-500 hover:bg-yellow-600"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Player's hand */}
      <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
        {cards.map((card, index) => (
          <UnoCard
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card, index)}
            isPlayable={isMyTurn && isCardPlayable(card)}
            isSelected={selectedCard?.id === card.id}
            className="transform hover:scale-105 transition-transform duration-200"
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex space-x-4">
        <Button
          onClick={handleDrawCard}
          disabled={!isMyTurn}
          variant="outline"
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        >
          Draw Card
        </Button>
        
        {cards.length === 2 && (
          <Button
            onClick={handleSayUno}
            className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
          >
            Say UNO!
          </Button>
        )}
      </div>

      {/* Card count indicator */}
      <div className="text-white text-sm">
        Cards in hand: {cards.length}
      </div>
    </div>
  );
};

export default PlayerHand;