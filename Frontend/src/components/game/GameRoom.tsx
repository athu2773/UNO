import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "./GameBoard";
import PlayerHand from "./PlayerHand";
import ChatBox from "./ChatBox";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface GameCard {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string | number;
  type: 'number' | 'action' | 'wild';
}

interface Player {
  id: string;
  name: string;
  picture?: string;
  cards: GameCard[] | number;
  saidUno?: boolean;
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

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type?: 'user' | 'system';
}

const GameRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket || !user || !roomCode) return;

    // Join the room
    socket.emit("joinRoom", roomCode, (response: any) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
        navigate("/dashboard");
      } else {
        setRoom(response.room);
        setLoading(false);
      }
    });

    // Socket event listeners
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameStarted", handleGameStarted);    socket.on("gameUpdate", handleGameUpdate);
    socket.on("playerSaidUno", handlePlayerSaidUno);
    socket.on("receiveMessage", handleChatMessage);
    socket.on("gameEnded", handleGameEnded);
    socket.on("playerLeft", handlePlayerLeft);
    socket.on("error", handleError);

    return () => {
      socket.off("roomUpdate");
      socket.off("gameStarted");      socket.off("gameUpdate");
      socket.off("playerSaidUno");
      socket.off("receiveMessage");
      socket.off("gameEnded");
      socket.off("playerLeft");
      socket.off("error");
    };
  }, [socket, user, roomCode, navigate]);

  const handleRoomUpdate = (updatedRoom: Room) => {
    setRoom(updatedRoom);
  };

  const handleGameStarted = (gameRoom: Room) => {
    setRoom(gameRoom);
    toast({
      title: "Game Started!",
      description: "The UNO game has begun. Good luck!",
    });
  };

  const handleGameUpdate = (gameRoom: Room) => {
    setRoom(gameRoom);
  };

  const handlePlayerSaidUno = ({ username }: { username: string }) => {
    toast({
      title: "UNO!",
      description: `${username} said UNO!`,
    });
  };

  const handleChatMessage = (message: Message) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleGameEnded = ({ winner, room: gameRoom }: { winner: string; room: Room }) => {
    setRoom(gameRoom);
    const winnerPlayer = gameRoom.players.find(p => p.id === winner);
    toast({
      title: "Game Over!",
      description: `${winnerPlayer?.name || 'Someone'} wins the game!`,
    });
  };

  const handlePlayerLeft = ({ username }: { username: string }) => {
    toast({
      title: "Player Left",
      description: `${username} left the game`,
      variant: "destructive",
    });
  };

  const handleError = (error: { message: string }) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  };

  const handleStartGame = () => {
    if (!socket || !roomCode) return;

    socket.emit("startGame", { roomCode });
  };

  const handleObjectUno = (playerId: string) => {
    if (!socket || !roomCode) return;

    socket.emit("objectUno", { roomCode, playerId });
    
    toast({
      title: "UNO Objection",
      description: "You objected to a player's UNO call!",
    });
  };

  const handleLeaveRoom = () => {
    if (socket && roomCode) {
      socket.emit("leaveRoom", roomCode);
    }
    navigate("/dashboard");
  };

  const getCurrentPlayerHand = (): GameCard[] => {
    if (!room || !user) return [];
    
    const currentPlayer = room.players.find(p => p.id === user.id);
    if (!currentPlayer) return [];
    
    // If cards is an array, return it; if it's a number, return empty array
    return Array.isArray(currentPlayer.cards) ? currentPlayer.cards : [];
  };

  const isMyTurn = (): boolean => {
    if (!room || !user) return false;
    
    const currentPlayerIndex = room.currentTurn;
    const currentPlayer = room.players[currentPlayerIndex];
    
    return currentPlayer?.id === user.id;
  };

  const getCurrentCard = (): GameCard | null => {
    if (!room || !room.discardPile || room.discardPile.length === 0) return null;
    return room.discardPile[room.discardPile.length - 1];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Room not found</h2>
            <p className="text-gray-600 mb-4">
              The room you're looking for doesn't exist or has been closed.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveRoom}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Leave Room</span>
            </Button>
            
            <Card>
              <CardContent className="px-4 py-2">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-sm text-gray-600">Room Code:</span>
                    <span className="ml-2 font-mono font-bold text-lg">
                      {room.code}
                    </span>
                  </div>
                  
                  {room.gameStarted && (
                    <div className="text-sm">
                      <span className="text-gray-600">Turn:</span>
                      <span className="ml-2 font-semibold">
                        {room.players[room.currentTurn]?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game board area */}
          <div className="lg:col-span-3">
            <GameBoard
              room={{
                ...room,
                players: room.players.map(p => ({
                  ...p,
                  cards: Array.isArray(p.cards) ? p.cards.length : p.cards
                }))
              }}
              currentUser={user!}
              onStartGame={handleStartGame}
              onObjectUno={handleObjectUno}
            />
          </div>

          {/* Player hand area */}
          { !room.gameEnded && (
            <div className="lg:col-span-1">
              {room.gameStarted && (
                <div className="mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center">Your Hand</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PlayerHand
                        cards={getCurrentPlayerHand().map(card => ({
                          ...card,
                          value: String(card.value),
                        }))}
                        currentCard={
                          getCurrentCard()
                            ? { ...getCurrentCard()!, value: String(getCurrentCard()!.value) }
                            : null
                        }
                        isMyTurn={isMyTurn()}
                        currentColor={room.currentColor}
                        roomCode={roomCode!}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
          {/* Chat sidebar */}
          <div className="lg:col-span-1">
            <ChatBox
              messages={chatMessages}
              roomCode={roomCode!}
              currentUser={user!}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
