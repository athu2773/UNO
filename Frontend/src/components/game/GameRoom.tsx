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
  isBot?: boolean;
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
  allowBots?: boolean;
  maxPlayers?: number;
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

    // Always call joinRoom, but the backend should handle duplicates properly
    console.log("Joining room:", roomCode);
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
    });    // Socket event listeners
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("gameStarted", handleGameStarted);    socket.on("gameUpdate", handleGameUpdate);
    socket.on("playerSaidUno", handlePlayerSaidUno);
    socket.on("receiveMessage", handleChatMessage);
    socket.on("gameEnded", handleGameEnded);
    socket.on("playerLeft", handlePlayerLeft);
    socket.on("error", handleError);
    socket.on("teamInvitationReceived", handleTeamInvitationReceived);    return () => {
      socket.off("roomUpdate");
      socket.off("gameStarted");      socket.off("gameUpdate");
      socket.off("playerSaidUno");
      socket.off("receiveMessage");
      socket.off("gameEnded");
      socket.off("playerLeft");
      socket.off("error");
      socket.off("teamInvitationReceived");
    };
  }, [socket, user, roomCode, navigate]);  const handleRoomUpdate = (updatedRoom: Room) => {
    console.log('Room updated:', {
      players: updatedRoom.players.map(p => `${p.name}${p.isBot ? ' (Bot)' : ''}`),
      host: updatedRoom.host,
      currentUserId: user?.id,
      isHost: user?.id === updatedRoom.host,
      gameStarted: updatedRoom.gameStarted
    });
    
    // Debug Room Management visibility conditions
    console.log('🔍 Room Management Visibility Check:', {
      gameStarted: updatedRoom.gameStarted,
      userId: user?.id,
      roomHost: updatedRoom.host,
      userIdType: typeof user?.id,
      roomHostType: typeof updatedRoom.host,
      isEqual: user?.id === updatedRoom.host,
      shouldShowRoomManagement: !updatedRoom.gameStarted && user?.id === updatedRoom.host
    });
    
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
  const handleAddBot = () => {
    console.log('Adding bot to room:', roomCode);
    if (!socket || !roomCode) return;

    socket.emit("addBot", roomCode, (response: any) => {
      console.log('Bot add response:', response);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bot Added",
          description: "A bot player has been added to the room",
        });
      }
    });
  };

  const handleRemoveBot = (botId: string) => {
    if (!socket || !roomCode) return;

    socket.emit("removeBot", { roomCode, botId }, (response: any) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bot Removed",
          description: "Bot player has been removed from the room",
        });
      }
    });
  };

  const handleInviteFriend = (friendId: string) => {
    if (!socket || !roomCode) return;

    socket.emit("sendTeamInvitation", { friendId, roomCode }, (response: any) => {
      if (response.error) {
        toast({
          title: "Invitation Failed",
          description: response.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation Sent",
          description: response.message || "Team invitation sent successfully",
        });
      }
    });
  };

  const handleTeamInvitationReceived = (invitation: any) => {
    toast({
      title: "Team Invitation Received",
      description: `${invitation.from.name} invited you to join their UNO game!`,
      action: (
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={() => {
              if (socket) {
                socket.emit("acceptTeamInvitation", { roomCode: invitation.roomCode }, (response: any) => {
                  if (response.error) {
                    toast({
                      title: "Failed to Join",
                      description: response.error,
                      variant: "destructive",
                    });
                  } else {
                    navigate(`/game/${invitation.roomCode}`);
                  }
                });
              }
            }}
          >
            Accept
          </Button>
          <Button size="sm" variant="outline">
            Decline
          </Button>
        </div>
      ),
    });
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

  // Add debugging helper to window for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugUNO = {
        room,
        user,
        socket,
        isHost: user?.id === room?.host,
        gameStarted: room?.gameStarted,
        addBot: handleAddBot,
        socketConnected: socket?.connected
      };
    }
  }, [room, user, socket]);

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
            </Card>          </div>
        </div>        {/* Debug Information */}
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <p>Game Started: {room.gameStarted ? 'Yes' : 'No'}</p>
          <p>User ID: {user?.id} (type: {typeof user?.id})</p>
          <p>Room Host: {room.host} (type: {typeof room.host})</p>
          <p>Is Host: {user?.id === room.host ? 'Yes' : 'No'}</p>
          <p>Should Show Room Management: {(!room.gameStarted && user?.id === room.host) ? 'Yes' : 'No'}</p>
        </div>        {/* Debug Info - Temporary */}
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-bold">Debug Info:</h3>
          <p>Game Started: {room.gameStarted ? 'Yes' : 'No'}</p>
          <p>User ID: {user?.id} (type: {typeof user?.id})</p>
          <p>Room Host: {typeof room.host === 'string' ? room.host : JSON.stringify(room.host)} (type: {typeof room.host})</p>
          <p>Is Host: {user?.id === room.host ? 'Yes' : 'No'}</p>
          <p>Should Show Room Management: {(!room.gameStarted && user?.id === room.host) ? 'Yes' : 'No'}</p>
        </div>

        {/* Bot Management and Team Invitations */}
        {!room.gameStarted && user?.id === room.host && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {/* Bot Management */}
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleAddBot}
                      disabled={room.players.length >= (room.maxPlayers || 4)}
                      size="sm"
                      variant="outline"
                    >
                      Add Bot Player
                    </Button>
                    
                    {room.players.filter(p => p.isBot).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {room.players
                          .filter(p => p.isBot)
                          .map(bot => (
                            <Button
                              key={bot.id}
                              onClick={() => handleRemoveBot(bot.id)}
                              size="sm"
                              variant="destructive"
                            >
                              Remove {bot.name}
                            </Button>
                          ))
                        }
                      </div>
                    )}
                  </div>

                  {/* Team Invitation */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Invite Friends:</span>
                    <Button
                      onClick={() => {
                        // For demo purposes, we'll simulate inviting a friend
                        // In a real app, you'd have a friend selection modal
                        const friendId = prompt("Enter friend's user ID to invite:");
                        if (friendId) {
                          handleInviteFriend(friendId);
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Send Invitation
                    </Button>
                  </div>
                </div>                <div className="mt-4 text-sm text-gray-600">
                  <p>Room: {room.players.length} / {room.maxPlayers || 4} players</p>
                  <p>Bots: {room.players.filter(p => p.isBot).length}</p>
                  <p>Human players: {room.players.filter(p => !p.isBot).length}</p>
                  <p className="text-xs">Debug - Host: {room.host}, You: {user?.id}, Match: {user?.id === room.host ? 'YES' : 'NO'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
