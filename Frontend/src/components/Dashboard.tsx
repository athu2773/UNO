import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';
import axios from 'axios';

interface Room {
  roomCode: string;
  host: string;
  players: Array<{
    id: string;
    name: string;
    picture?: string;
  }>;
  gameState: string;
  maxPlayers: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, logout } = useAuth();
  
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  useEffect(() => {
    fetchAvailableRooms();
  }, []);
  const fetchAvailableRooms = async () => {
    try {
      const response = await axios.get('/api/game/list', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAvailableRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };
  const handleCreateRoom = async () => {
    if (!socket) return;
    
    setLoading(true);
    socket.emit('createRoom', (response: any) => {
      setLoading(false);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else if (response.success && response.room) {
        navigate(`/game/${response.room.code}`);
      }
    });
  };
  const handleJoinRoom = async () => {
    if (!socket || !joinCode.trim()) return;
    
    setLoading(true);
    socket.emit('joinRoom', joinCode.trim().toUpperCase(), (response: any) => {
      setLoading(false);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else if (response.success && response.room) {
        navigate(`/game/${response.room.code}`);
      }
    });
  };

  const handleJoinFromList = (roomCode: string) => {
    if (!socket) return;
    
    setLoading(true);
    socket.emit('joinRoom', roomCode, (response: any) => {
      setLoading(false);
      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      } else if (response.success && response.room) {
        navigate(`/game/${response.room.code}`);
      }
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Game Dashboard</h1>
            <p className="text-gray-300">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={user?.picture} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-300">
                  Start playing immediately
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      🎮 Create New Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Room</DialogTitle>
                      <DialogDescription>
                        Create a new UNO game room for you and your friends.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        A room code will be generated automatically. Share it with your friends to let them join!
                      </p>
                      <Button 
                        onClick={handleCreateRoom} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? 'Creating...' : 'Create Room'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      size="lg"
                    >
                      🔗 Join Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join Room</DialogTitle>
                      <DialogDescription>
                        Enter the room code to join an existing game.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter room code (e.g., ABC123)"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <Button 
                        onClick={handleJoinRoom} 
                        disabled={loading || !joinCode.trim()}
                        className="w-full"
                      >
                        {loading ? 'Joining...' : 'Join Room'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Available Rooms */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Available Rooms
                <Button variant="ghost" size="sm" onClick={fetchAvailableRooms}>
                  🔄 Refresh
                </Button>
              </CardTitle>
              <CardDescription className="text-gray-300">
                Join ongoing games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableRooms.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">
                    No rooms available. Create one to get started!
                  </p>
                ) : (
                  availableRooms.map((room) => (
                    <div
                      key={room.roomCode}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div>
                        <p className="text-white font-semibold">
                          Room {room.roomCode}
                        </p>
                        <p className="text-sm text-gray-300">
                          {room.players.length}/{room.maxPlayers} players • {room.gameState}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleJoinFromList(room.roomCode)}
                        disabled={room.players.length >= room.maxPlayers || loading}
                      >
                        Join
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
