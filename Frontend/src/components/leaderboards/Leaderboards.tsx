import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Users, Calendar, Star, Award } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface LeaderboardPlayer {
  _id: string;
  username: string;
  avatar?: string;
  level: number;
  stats: {
    totalGamesPlayed: number;
    totalWins: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    tournamentWins: number;
    totalScore: number;
    averageGameTime: number;
  };
  achievements: string[];
  rank: number;
  rankChange: number; // +1 for up, -1 for down, 0 for no change
}

interface LeaderboardsProps {
  className?: string;
}

const Leaderboards: React.FC<LeaderboardsProps> = ({ className = '' }) => {
  const [leaderboardType, setLeaderboardType] = useState<'wins' | 'winRate' | 'level' | 'tournaments'>('wins');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<LeaderboardPlayer | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType, timeFilter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stats/leaderboard?type=${leaderboardType}&timeFilter=${timeFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setPlayers(data.leaderboard);
        setCurrentUser(data.currentUser);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">{rank}</span>;
    }
  };

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
    return <div className="w-4 h-4 bg-gray-500 rounded-full" />;
  };

  const getStatValue = (player: LeaderboardPlayer) => {
    switch (leaderboardType) {
      case 'wins': return player.stats.totalWins;
      case 'winRate': return `${player.stats.winRate.toFixed(1)}%`;
      case 'level': return player.level;
      case 'tournaments': return player.stats.tournamentWins;
      default: return 0;
    }
  };

  const getStatLabel = () => {
    switch (leaderboardType) {
      case 'wins': return 'Total Wins';
      case 'winRate': return 'Win Rate';
      case 'level': return 'Level';
      case 'tournaments': return 'Tournament Wins';
      default: return '';
    }
  };

  const PlayerRow: React.FC<{ player: LeaderboardPlayer; isCurrentUser?: boolean }> = ({ 
    player, 
    isCurrentUser = false 
  }) => (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
      isCurrentUser 
        ? 'bg-blue-900/20 border-blue-600 shadow-lg' 
        : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
    }`}>
      {/* Rank */}
      <div className="flex items-center gap-2 w-12">
        {getRankIcon(player.rank)}
        {getRankChangeIcon(player.rankChange)}
      </div>

      {/* Player Info */}
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="w-12 h-12">
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {player.username.charAt(0).toUpperCase()}
          </div>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${
              isCurrentUser ? 'text-blue-300' : 'text-white'
            }`}>
              {player.username}
            </h3>
            {isCurrentUser && (
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">You</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>Level {player.level}</span>
            <span>•</span>
            <span>{player.stats.totalGamesPlayed} games</span>
            {player.achievements.length > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{player.achievements.length}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        <div className={`text-2xl font-bold ${
          isCurrentUser ? 'text-blue-300' : 'text-white'
        }`}>
          {getStatValue(player)}
        </div>
        <div className="text-sm text-gray-400">
          {player.stats.winRate.toFixed(1)}% win rate
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-white">Leaderboards</h1>
        </div>
        
        <div className="flex gap-3">
          <Select value={leaderboardType} onValueChange={(value: any) => setLeaderboardType(value)}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="wins">Most Wins</SelectItem>
              <SelectItem value="winRate">Best Win Rate</SelectItem>
              <SelectItem value="level">Highest Level</SelectItem>
              <SelectItem value="tournaments">Tournaments</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current User Rank (if not in top 10) */}
      {currentUser && currentUser.rank > 10 && (
        <Card className="p-4 mb-6 bg-gray-800 border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Your Rank</h3>
            <span className="text-sm text-gray-400">#{currentUser.rank} of all players</span>
          </div>
          <PlayerRow player={currentUser} isCurrentUser={true} />
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="bg-gray-800 border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Top Players - {getStatLabel()}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{players.length} players</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-700 h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player, index) => (
                <PlayerRow 
                  key={player._id} 
                  player={player} 
                  isCurrentUser={currentUser?._id === player._id}
                />
              ))}
              
              {players.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Data Available</h3>
                  <p className="text-gray-500">Play some games to see the leaderboard!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="p-4 bg-gray-800 border-gray-700 text-center">
          <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {players.length > 0 ? players[0]?.stats.totalWins || 0 : 0}
          </div>
          <div className="text-sm text-gray-400">Top Wins</div>
        </Card>
        
        <Card className="p-4 bg-gray-800 border-gray-700 text-center">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {players.length > 0 ? (players[0]?.stats.winRate || 0).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-400">Best Win Rate</div>
        </Card>
        
        <Card className="p-4 bg-gray-800 border-gray-700 text-center">
          <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {players.length > 0 ? players[0]?.level || 0 : 0}
          </div>
          <div className="text-sm text-gray-400">Highest Level</div>
        </Card>
        
        <Card className="p-4 bg-gray-800 border-gray-700 text-center">
          <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {players.length > 0 ? players[0]?.stats.tournamentWins || 0 : 0}
          </div>
          <div className="text-sm text-gray-400">Tournament Wins</div>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboards;
