import React from "react";
import UnoCard from "./UnoCard";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "../../lib/utils";

interface Player {
  id: string;
  name: string;
  picture?: string;
  cards: GameCard[] | number; // <-- Make sure this matches GameRoom.tsx
  saidUno?: boolean;
  isBot?: boolean;
}

interface GameCard {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string | number;
  type: 'number' | 'action' | 'wild';
}

interface Room {
  id: string;
  code: string;
  host: string;
  players: Player[];
  currentTurn: number;
  gameStarted: boolean;
  discardPile: GameCard[];
  currentColor: string;
  direction: number;
  gameEnded?: boolean;
  winner?: string;
}

interface User {
  id: string;
  name: string;
  picture?: string;
}

interface GameBoardProps {
  room: Room;
  currentUser: User;
  onStartGame: () => void;
  onObjectUno: (playerId: string) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  room, 
  currentUser, 
  onStartGame, 
  onObjectUno 
}) => {
  if (!room) return null;

  const topCard = room.discardPile?.[room.discardPile.length - 1];
  const isHost = room.host === currentUser?.id;

  // Position players around the table
  const getPlayerPosition = (index: number, total: number): string => {
    const positions: Record<number, string[]> = {
      2: ["bottom", "top"],
      3: ["bottom", "top-left", "top-right"],
      4: ["bottom", "left", "top", "right"],
    };

    return positions[total]?.[index] || "bottom";
  };

  const getPositionClass = (position: string): string => {
    switch (position) {
      case "bottom":
        return "bottom-4 left-1/2 transform -translate-x-1/2";
      case "top":
        return "top-4 left-1/2 transform -translate-x-1/2";
      case "left":
        return "left-4 top-1/2 transform -translate-y-1/2";
      case "right":
        return "right-4 top-1/2 transform -translate-y-1/2";
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      default:
        return "bottom-4 left-1/2 transform -translate-x-1/2";
    }
  };

  const getCardFanClass = (position: string): string => {
    switch (position) {
      case "bottom":
        return "flex-row";
      case "top":
        return "flex-row-reverse";
      case "left":
        return "flex-col";
      case "right":
        return "flex-col-reverse";
      case "top-left":
        return "flex-row";
      case "top-right":
        return "flex-row-reverse";
      default:
        return "flex-row";
    }
  };

  if (!room.gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-center mb-4">
              Room: {room.code}
            </h2>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Players ({room.players.length}/4):
              </h3>                <div className="space-y-2">
                {room.players.map((player, index) => (
                  <div 
                    key={`waiting-room-${room.code}-${player.id}-${index}`} 
                    className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                  ><Avatar className="h-8 w-8">
                      <AvatarImage src={player.picture} />
                      <AvatarFallback>
                        {player.name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>                    <span className="flex-1">{player.name || 'Unknown Player'}</span>
                    {player.isBot && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Bot
                      </span>
                    )}
                    {player.id === room.host && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {isHost && room.players.length >= 2 && (
                <Button 
                  onClick={onStartGame} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Start Game
                </Button>
              )}

              {!isHost && (
                <p className="text-center text-gray-600">
                  Waiting for host to start the game...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (room.gameEnded) {
    const winner = room.players.find(p => p.id === room.winner);
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-3xl font-bold mb-4 text-green-600">
              Game Over!
            </h2>
            {winner && (
              <div className="space-y-4">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={winner.picture} />
                  <AvatarFallback className="text-2xl">
                    {winner.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">
                  {winner.name} wins!
                </h3>
              </div>
            )}
            {isHost && (
              <Button 
                onClick={onStartGame} 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
              >
                Start New Game
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] bg-green-800 rounded-xl overflow-hidden">
      {/* Center area with deck and discard pile */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-8">
        {/* Draw pile */}
        <div className="relative">
          <div className="w-16 h-24 bg-blue-900 rounded-lg border-2 border-blue-800 flex items-center justify-center">
            <span className="text-white font-bold text-xs">DECK</span>
          </div>
          <div className="absolute -top-1 -left-1 w-16 h-24 bg-blue-800 rounded-lg -z-10"></div>
        </div>

        {/* Discard pile */}
        <div className="relative">
          {topCard ? (
            <UnoCard card={topCard} size="normal" />
          ) : (
            <div className="w-16 h-24 bg-gray-400 rounded-lg border-2 border-gray-500"></div>
          )}
        </div>
      </div>

      {/* Game direction indicator */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow">
        <span className="text-sm font-semibold">
          Direction: {room.direction === 1 ? "→" : "←"}
        </span>
      </div>

      {/* Current color indicator */}
      <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold">Color:</span>
          <div 
            className={cn(
              "w-4 h-4 rounded-full",
              room.currentColor === "red" && "bg-red-500",
              room.currentColor === "green" && "bg-green-500",
              room.currentColor === "blue" && "bg-blue-500",
              room.currentColor === "yellow" && "bg-yellow-500"
            )}
          />
        </div>
      </div>      {/* Players positioned around the table */}
      {room.players.map((player, index) => {
        const position = getPlayerPosition(index, room.players.length);
        const isCurrentPlayer = room.currentTurn === index;
        const isCurrentUser = player.id === currentUser.id;
          return (
          <div
            key={`game-board-${room.code}-${player.id}-${index}`}
            className={cn(
              "absolute",
              getPositionClass(position)
            )}
          >
            <Card 
              className={cn(
                "min-w-[120px]",
                isCurrentPlayer && "ring-2 ring-yellow-400 ring-opacity-75",
                isCurrentUser && "bg-blue-50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={player.picture} />                    <AvatarFallback className="text-xs">
                      {player.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {player.name || 'Unknown Player'}
                      {player.isBot && (
                        <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                          Bot
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Array.isArray(player.cards) ? player.cards.length : player.cards} cards
                    </p>
                  </div>
                </div>

                {/* Player's cards representation */}
                <div className={cn("flex gap-1", getCardFanClass(position))}>
                  {Array.from({ length: Math.min(Array.isArray(player.cards) ? player.cards.length : player.cards, 5) }).map((_, cardIndex) => (
                    <div
                      key={cardIndex}
                      className="w-3 h-5 bg-blue-900 rounded-sm border border-blue-800"
                    />
                  ))}
                  {(Array.isArray(player.cards) ? player.cards.length : player.cards) > 5 && (
                    <span className="text-xs text-gray-600 ml-1">
                      +{(Array.isArray(player.cards) ? player.cards.length : player.cards) - 5}
                    </span>
                  )}
                </div>

                {/* UNO indicator and object button */}
                {player.cards === 1 && player.saidUno && (
                  <div className="mt-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded text-center">
                    UNO!
                  </div>
                )}
                
                {player.cards === 1 && !player.saidUno && player.id !== currentUser.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onObjectUno(player.id)}
                    className="mt-2 w-full text-xs bg-red-600 hover:bg-red-700 text-white"
                  >
                    Object UNO!
                  </Button>
                )}

                {isCurrentPlayer && (
                  <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-center">
                    Current Turn
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
