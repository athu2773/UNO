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
import { 
  Trophy, 
  Users, 
  BarChart3, 
  Crown, 
  Bell, 
  Settings,
  Play,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Star,
  Award,
  TrendingUp
} from 'lucide-react';
import NotificationSystem from './notifications/NotificationSystem';
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

interface QuickStats {
  totalGames: number;
  wins: number;
  winRate: number;
  level: number;
  rank: number;
  achievements: number;
}

interface RecentActivity {
  type: 'game' | 'tournament' | 'achievement';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAvailableRooms();
    fetchQuickStats();
    fetchRecentActivity();
    fetchUnreadNotifications();
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

  const fetchQuickStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/stats/quick', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuickStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/stats/recent-activity', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRecentActivity(response.data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications/count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
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

  const navigateToFeature = (path: string) => {
    navigate(path);
  };

  const formatActivityTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              UNO Dashboard
            </h1>
            <p className="text-xl text-gray-300">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotificationsOpen(true)}
              className="relative border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.picture} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" onClick={handleLogout} className="border-gray-600 text-gray-300 hover:bg-gray-700">
              <Settings className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {quickStats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{quickStats.totalGames}</div>
                <div className="text-sm text-gray-400">Total Games</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{quickStats.wins}</div>
                <div className="text-sm text-gray-400">Wins</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{quickStats.winRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{quickStats.level}</div>
                <div className="text-sm text-gray-400">Level</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">#{quickStats.rank || 'N/A'}</div>
                <div className="text-sm text-gray-400">Global Rank</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-pink-400">{quickStats.achievements}</div>
                <div className="text-sm text-gray-400">Achievements</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Game Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Start playing immediately
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3"
                      size="lg"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create New Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New Room</DialogTitle>
                      <DialogDescription className="text-gray-300">
                        Create a new UNO game room for you and your friends.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">
                        A room code will be generated automatically. Share it with your friends to let them join!
                      </p>
                      <Button 
                        onClick={handleCreateRoom} 
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700"
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
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 font-semibold py-3"
                      size="lg"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Join Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Join Room</DialogTitle>
                      <DialogDescription className="text-gray-300">
                        Enter the room code to join an existing game.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter room code (e.g., ABC123)"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Button 
                        onClick={handleJoinRoom} 
                        disabled={loading || !joinCode.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? 'Joining...' : 'Join Room'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Feature Navigation */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Explore Features</CardTitle>
                <CardDescription className="text-gray-300">
                  Discover all the amazing features
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/tournaments')}
                >
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <span>Tournaments</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/friends')}
                >
                  <Users className="w-6 h-6 text-blue-500" />
                  <span>Friends</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/stats')}
                >
                  <BarChart3 className="w-6 h-6 text-green-500" />
                  <span>Statistics</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/leaderboards')}
                >
                  <Crown className="w-6 h-6 text-purple-500" />
                  <span>Leaderboards</span>
                </Button>
              </CardContent>
            </Card>

            {/* Available Rooms */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Available Rooms</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchAvailableRooms}
                    className="text-gray-300 hover:bg-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Join ongoing games
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availableRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No rooms available</p>
                      <p className="text-sm text-gray-500">Create one to get started!</p>
                    </div>
                  ) : (
                    availableRooms.map((room) => (
                      <div
                        key={room.roomCode}
                        className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors"
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
                          className="bg-blue-600 hover:bg-blue-700"
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-4">
                      <Star className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No recent activity</p>
                    </div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-lg">{activity.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{activity.title}</p>
                          <p className="text-gray-400 text-xs truncate">{activity.description}</p>
                          <p className="text-gray-500 text-xs mt-1">{formatActivityTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/profile')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Profile Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/achievements')}
                >
                  <Award className="w-4 h-4 mr-2" />
                  Achievements
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:bg-gray-700"
                  onClick={() => navigateToFeature('/help')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Game Rules
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Notification System */}
      <NotificationSystem 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
