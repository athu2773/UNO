import React from 'react';
import { Card } from '../ui/card';
import { Avatar } from '../ui/avatar';
import { Crown, Trophy, Calendar, Clock } from 'lucide-react';

interface Player {
  _id: string;
  username: string;
  avatar?: string;
  level: number;
}

interface Match {
  _id: string;
  round: number;
  position: number;
  player1: Player | null;
  player2: Player | null;
  winner: Player | null;
  score: {
    player1: number;
    player2: number;
  };
  status: 'pending' | 'in-progress' | 'completed';
  scheduledAt?: Date;
  completedAt?: Date;
}

interface TournamentBracketProps {
  matches: Match[];
  totalRounds: number;
  isElimination: boolean;
  currentRound: number;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({
  matches,
  totalRounds,
  isElimination,
  currentRound
}) => {
  const getMatchesByRound = (round: number) => {
    return matches.filter(match => match.round === round).sort((a, b) => a.position - b.position);
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-900/20 border-green-600';
      case 'in-progress': return 'bg-blue-900/20 border-blue-600';
      default: return 'bg-gray-800 border-gray-600';
    }
  };

  const getRoundName = (round: number) => {
    if (!isElimination) return `Round ${round}`;
    
    const remainingRounds = totalRounds - round + 1;
    switch (remainingRounds) {
      case 1: return 'Final';
      case 2: return 'Semi-Final';
      case 3: return 'Quarter-Final';
      case 4: return 'Round of 16';
      case 5: return 'Round of 32';
      default: return `Round ${round}`;
    }
  };

  const PlayerCard: React.FC<{ player: Player | null; isWinner: boolean; score?: number }> = ({ 
    player, 
    isWinner, 
    score 
  }) => {
    if (!player) {
      return (
        <div className="flex items-center gap-3 p-2 bg-gray-700/50 rounded border-2 border-dashed border-gray-600">
          <div className="w-8 h-8 bg-gray-600 rounded-full" />
          <span className="text-gray-400 text-sm">TBD</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 p-2 rounded border-2 transition-all ${
        isWinner 
          ? 'bg-yellow-900/20 border-yellow-500 shadow-lg' 
          : 'bg-gray-700/50 border-gray-600'
      }`}>
        <div className="relative">
          <Avatar className="w-8 h-8">
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {player.username.charAt(0).toUpperCase()}
            </div>
          </Avatar>
          {isWinner && (
            <Crown className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isWinner ? 'text-yellow-300' : 'text-white'
          }`}>
            {player.username}
          </p>
          <p className="text-xs text-gray-400">Level {player.level}</p>
        </div>
        {typeof score === 'number' && (
          <span className={`text-sm font-bold ${
            isWinner ? 'text-yellow-300' : 'text-gray-300'
          }`}>
            {score}
          </span>
        )}
      </div>
    );
  };

  const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
    const isCurrentMatch = match.round === currentRound && match.status === 'pending';

    return (
      <Card className={`p-4 ${getMatchStatusColor(match.status)} ${
        isCurrentMatch ? 'ring-2 ring-blue-500' : ''
      } relative`}>
        {isCurrentMatch && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            Next Match
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">
              Match {match.position}
            </span>
            {match.status === 'in-progress' && (
              <div className="flex items-center gap-1 text-blue-400">
                <Clock className="w-3 h-3" />
                <span className="text-xs">Live</span>
              </div>
            )}
            {match.completedAt && (
              <div className="flex items-center gap-1 text-green-400">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">
                  {new Date(match.completedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <PlayerCard 
            player={match.player1} 
            isWinner={match.winner?._id === match.player1?._id}
            score={match.status === 'completed' ? match.score.player1 : undefined}
          />
          
          <div className="text-center">
            <span className="text-xs text-gray-400">vs</span>
          </div>
          
          <PlayerCard 
            player={match.player2} 
            isWinner={match.winner?._id === match.player2?._id}
            score={match.status === 'completed' ? match.score.player2 : undefined}
          />
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 overflow-x-auto pb-4">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = getMatchesByRound(round);
          const isCurrentRound = round === currentRound;

          return (
            <div key={round} className="flex-shrink-0 min-w-[280px]">
              <div className={`text-center mb-4 p-2 rounded-lg ${
                isCurrentRound 
                  ? 'bg-blue-900/20 border border-blue-600' 
                  : 'bg-gray-800'
              }`}>
                <h3 className={`font-bold ${
                  isCurrentRound ? 'text-blue-300' : 'text-white'
                }`}>
                  {getRoundName(round)}
                </h3>
                <p className="text-xs text-gray-400">
                  {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}
                </p>
              </div>

              <div className="space-y-6">
                {roundMatches.map((match, index) => (
                  <div key={match._id} className="relative">
                    <MatchCard match={match} />
                    
                    {/* Connection lines for bracket visualization */}
                    {round < totalRounds && (
                      <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-600 transform -translate-y-1/2" />
                    )}
                    
                    {round < totalRounds && index % 2 === 0 && roundMatches[index + 1] && (
                      <>
                        {/* Vertical line connecting pairs */}
                        <div className="absolute top-1/2 -right-4 w-0.5 bg-gray-600" 
                             style={{ 
                               height: `${(roundMatches[index + 1] ? 200 : 100)}px`,
                               transform: 'translateY(-50%)'
                             }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tournament Champion */}
      {matches.some(m => m.round === totalRounds && m.winner) && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border border-yellow-600 rounded-lg p-6">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-xl font-bold text-yellow-300 mb-1">Tournament Champion</h3>
              {(() => {
                const finalMatch = matches.find(m => m.round === totalRounds && m.winner);
                return finalMatch?.winner ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold">
                        {finalMatch.winner.username.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold text-white">{finalMatch.winner.username}</p>
                      <p className="text-sm text-gray-400">Level {finalMatch.winner.level}</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentBracket;
