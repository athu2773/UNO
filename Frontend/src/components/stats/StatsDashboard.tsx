import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../../hooks/use-toast';

interface PlayerStats {
  _id: string;
  user: {
    _id: string;
    username: string;
    createdAt: string;
  };
  games: {
    total: number;
    won: number;
    lost: number;
    winRate: number;
    casual: number;
  };
  tournaments: {
    participated: number;
    won: number;
    winRate: number;
  };
  cards: {
    totalPlayed: number;
    specialCardsUsed: number;
    drawTwoPlayed: number;
    skipPlayed: number;
    reversePlayed: number;
    wildPlayed: number;
    wildDrawFourPlayed: number;
  };
  uno: {
    successfulCalls: number;
    missedCalls: number;
    accuracy: number;
  };
  time: {
    totalPlayTime: number;
    averageGameDuration: number;
    fastestGame?: number;
    longestGame?: number;
    averageTurnTime?: number;
    longestTurn?: number;
  };
  streaks: {
    currentWin: number;
    currentLoss: number;
    bestWin: number;
  };
  social: {
    friendsCount: number;
    multiplayerGames: number;
  };
}

interface Achievement {
  _id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  unlockedAt: string;
}

interface LeaderboardEntry {
  rank: number;
  user: { username: string };
  stats: PlayerStats;
}

const StatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState('winRate');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUserStats();
    fetchUserAchievements();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/stats/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({ title: 'Error', description: 'Failed to load statistics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      const response = await fetch('/api/stats/achievements/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAchievements(data);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/stats/leaderboard?type=${leaderboardType}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getAchievementsByType = (type: string) => {
    return achievements.filter(achievement => achievement.type === type);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">No statistics available</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Statistics Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'achievements' ? 'default' : 'outline'}
            onClick={() => setActiveTab('achievements')}
          >
            Achievements
          </Button>
          <Button
            variant={activeTab === 'leaderboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </Button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Game Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.games.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.games.won}W / {stats.games.lost}L
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.games.winRate.toFixed(1)}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${stats.games.winRate}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tournament Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tournaments.won}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.tournaments.participated} participated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Play Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(stats.time.totalPlayTime)}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatTime(stats.time.averageGameDuration)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Card Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Cards Played:</span>
                  <span className="font-bold">{stats.cards.totalPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Cards Used:</span>
                  <span className="font-bold">{stats.cards.specialCardsUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Draw Two Cards:</span>
                  <span className="font-bold">{stats.cards.drawTwoPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Skip Cards:</span>
                  <span className="font-bold">{stats.cards.skipPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reverse Cards:</span>
                  <span className="font-bold">{stats.cards.reversePlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wild Cards:</span>
                  <span className="font-bold">{stats.cards.wildPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wild Draw Four:</span>
                  <span className="font-bold">{stats.cards.wildDrawFourPlayed}</span>
                </div>
              </CardContent>
            </Card>

            {/* UNO & Time Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-semibold">UNO Calls</h4>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-bold text-green-600">{stats.uno.successfulCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missed:</span>
                    <span className="font-bold text-red-600">{stats.uno.missedCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className="font-bold">{stats.uno.accuracy.toFixed(1)}%</span>
                  </div>
                </div>

                <hr />

                <div className="space-y-2">
                  <h4 className="font-semibold">Time Records</h4>
                  {stats.time.fastestGame && (
                    <div className="flex justify-between">
                      <span>Fastest Game:</span>
                      <span className="font-bold">{formatTime(stats.time.fastestGame)}</span>
                    </div>
                  )}
                  {stats.time.longestGame && (
                    <div className="flex justify-between">
                      <span>Longest Game:</span>
                      <span className="font-bold">{formatTime(stats.time.longestGame)}</span>
                    </div>
                  )}
                  {stats.time.averageTurnTime && (
                    <div className="flex justify-between">
                      <span>Avg Turn Time:</span>
                      <span className="font-bold">{stats.time.averageTurnTime.toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Streaks */}
          <Card>
            <CardHeader>
              <CardTitle>Streaks & Social</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.streaks.currentWin}</div>
                  <p className="text-sm text-muted-foreground">Current Win Streak</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.streaks.bestWin}</div>
                  <p className="text-sm text-muted-foreground">Best Win Streak</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.social.multiplayerGames}</div>
                  <p className="text-sm text-muted-foreground">Multiplayer Games</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Achievement Progress</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold">{achievements.length}</div>
                <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
              </CardContent>
            </Card>
          </div>

          {/* Achievement Categories */}
          {['milestone', 'streak', 'card', 'uno', 'tournament', 'social', 'time', 'special'].map(type => {
            const typeAchievements = getAchievementsByType(type);
            if (typeAchievements.length === 0) return null;

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="capitalize">{type} Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typeAchievements.map(achievement => (
                      <div 
                        key={achievement._id}
                        className="flex items-center p-3 border rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100"
                      >
                        <div className="text-2xl mr-3">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold">{achievement.name}</div>
                          <div className="text-sm text-gray-600">{achievement.description}</div>
                          <div className="text-xs text-gray-500">
                            Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {achievements.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements yet</h3>
              <p className="text-gray-500">Start playing to unlock achievements!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Global Leaderboard</h2>
            <Select value={leaderboardType} onValueChange={setLeaderboardType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="totalWins">Total Wins</SelectItem>
                <SelectItem value="totalGames">Total Games</SelectItem>
                <SelectItem value="tournaments">Tournament Wins</SelectItem>
                <SelectItem value="playTime">Play Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-1">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.user.username}
                    className={`flex items-center justify-between p-4 ${
                      entry.user.username === user?.username ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-semibold">{entry.user.username}</div>
                        {entry.user.username === user?.username && (
                          <div className="text-sm text-blue-600">You</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {leaderboardType === 'winRate' && (
                        <div className="font-bold">{entry.stats.games.winRate.toFixed(1)}%</div>
                      )}
                      {leaderboardType === 'totalWins' && (
                        <div className="font-bold">{entry.stats.games.won}</div>
                      )}
                      {leaderboardType === 'totalGames' && (
                        <div className="font-bold">{entry.stats.games.total}</div>
                      )}
                      {leaderboardType === 'tournaments' && (
                        <div className="font-bold">{entry.stats.tournaments.won}</div>
                      )}
                      {leaderboardType === 'playTime' && (
                        <div className="font-bold">{formatDuration(entry.stats.time.totalPlayTime)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leaderboard data</h3>
              <p className="text-gray-500">Play more games to appear on the leaderboard!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
