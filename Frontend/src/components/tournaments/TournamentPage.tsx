import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from '../../hooks/use-toast';

interface Tournament {
  _id: string;
  name: string;
  description: string;
  organizer: { _id: string; username: string };
  type: string;
  status: string;
  maxParticipants: number;
  currentParticipants: number;
  participants: Array<{ user: { _id: string; username: string }; registrationDate: string }>;
  schedule: {
    registrationStart: string;
    registrationEnd: string;
    tournamentStart: string;
  };
  prizes: { first: string; second: string; third: string };
  winner?: { username: string };
  runnerUp?: { username: string };
  thirdPlace?: { username: string };
}

const TournamentPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create tournament form state
  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    type: 'single-elimination',
    maxParticipants: 8,
    registrationStart: '',
    registrationEnd: '',
    tournamentStart: ''
  });

  useEffect(() => {
    fetchTournaments();
  }, [filter]);

  useEffect(() => {
    if (socket) {
      socket.on('tournamentUpdate', handleTournamentUpdate);
      socket.on('tournamentCompleted', handleTournamentCompleted);
      socket.on('matchStarted', handleMatchStarted);
      socket.on('nextMatchReady', handleNextMatchReady);

      return () => {
        socket.off('tournamentUpdate');
        socket.off('tournamentCompleted');
        socket.off('matchStarted');
        socket.off('nextMatchReady');
      };
    }
  }, [socket]);

  const fetchTournaments = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      
      const response = await fetch(`/api/tournaments?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTournaments(data.tournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({ title: 'Error', description: 'Failed to load tournaments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentUpdate = (tournament: Tournament) => {
    setTournaments(prev => 
      prev.map(t => t._id === tournament._id ? tournament : t)
    );
    if (selectedTournament?._id === tournament._id) {
      setSelectedTournament(tournament);
    }
  };

  const handleTournamentCompleted = (data: any) => {
    toast({ 
      title: 'Tournament Completed!', 
      description: `${data.winner.username} won the tournament!` 
    });
    fetchTournaments();
  };

  const handleMatchStarted = (data: any) => {
    toast({ 
      title: 'Match Started', 
      description: `Round ${data.round} match is starting` 
    });
  };

  const handleNextMatchReady = (data: any) => {
    toast({ 
      title: 'Next Match Ready', 
      description: `Round ${data.round} match is ready to start` 
    });
  };

  const createTournament = async () => {
    try {
      // Validate dates
      const now = new Date();
      const regStart = new Date(newTournament.registrationStart);
      const regEnd = new Date(newTournament.registrationEnd);
      const tournStart = new Date(newTournament.tournamentStart);

      if (regStart <= now) {
        toast({ title: 'Error', description: 'Registration start must be in the future', variant: 'destructive' });
        return;
      }

      if (regEnd <= regStart) {
        toast({ title: 'Error', description: 'Registration end must be after start', variant: 'destructive' });
        return;
      }

      if (tournStart <= regEnd) {
        toast({ title: 'Error', description: 'Tournament start must be after registration ends', variant: 'destructive' });
        return;
      }

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newTournament,
          schedule: {
            registrationStart: newTournament.registrationStart,
            registrationEnd: newTournament.registrationEnd,
            tournamentStart: newTournament.tournamentStart
          }
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Tournament created successfully!' });
        setShowCreateDialog(false);
        setNewTournament({
          name: '',
          description: '',
          type: 'single-elimination',
          maxParticipants: 8,
          registrationStart: '',
          registrationEnd: '',
          tournamentStart: ''
        });
        fetchTournaments();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({ title: 'Error', description: 'Failed to create tournament', variant: 'destructive' });
    }
  };

  const registerForTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Successfully registered for tournament!' });
        fetchTournaments();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast({ title: 'Error', description: 'Failed to register', variant: 'destructive' });
    }
  };

  const unregisterFromTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Successfully unregistered from tournament' });
        fetchTournaments();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      toast({ title: 'Error', description: 'Failed to unregister', variant: 'destructive' });
    }
  };

  const startTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Tournament started successfully!' });
        fetchTournaments();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast({ title: 'Error', description: 'Failed to start tournament', variant: 'destructive' });
    }
  };

  const joinTournamentRoom = (tournament: Tournament) => {
    if (socket && user) {
      socket.emit('joinTournament', {
        tournamentId: tournament._id,
        userId: user.id
      });
      setSelectedTournament(tournament);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-blue-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeDisplay = (type: string) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isUserRegistered = (tournament: Tournament) => {
    return tournament.participants.some(p => p.user._id === user?.id);
  };

  const canRegister = (tournament: Tournament) => {
    const now = new Date();
    const regStart = new Date(tournament.schedule.registrationStart);
    const regEnd = new Date(tournament.schedule.registrationEnd);
    
    return tournament.status === 'registration' &&
           now >= regStart && 
           now <= regEnd &&
           tournament.currentParticipants < tournament.maxParticipants &&
           !isUserRegistered(tournament);
  };

  const canUnregister = (tournament: Tournament) => {
    return (tournament.status === 'registration' || tournament.status === 'scheduled') &&
           isUserRegistered(tournament);
  };

  const canStart = (tournament: Tournament) => {
    return user?.id === tournament.organizer._id &&
           tournament.status === 'registration' &&
           tournament.currentParticipants >= 4;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading tournaments...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <div className="flex gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tournaments</SelectItem>
              <SelectItem value="registration">Open for Registration</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>Create Tournament</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Tournament</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Tournament Name"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newTournament.description}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                />
                <Select
                  value={newTournament.type}
                  onValueChange={(value) => setNewTournament(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-elimination">Single Elimination</SelectItem>
                    <SelectItem value="double-elimination">Double Elimination</SelectItem>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newTournament.maxParticipants.toString()}
                  onValueChange={(value) => setNewTournament(prev => ({ ...prev, maxParticipants: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="8">8 Players</SelectItem>
                    <SelectItem value="16">16 Players</SelectItem>
                    <SelectItem value="32">32 Players</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Registration Start</label>
                  <Input
                    type="datetime-local"
                    value={newTournament.registrationStart}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, registrationStart: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Registration End</label>
                  <Input
                    type="datetime-local"
                    value={newTournament.registrationEnd}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, registrationEnd: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tournament Start</label>
                  <Input
                    type="datetime-local"
                    value={newTournament.tournamentStart}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, tournamentStart: e.target.value }))}
                  />
                </div>
                <Button onClick={createTournament} className="w-full">
                  Create Tournament
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <Card key={tournament._id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{tournament.name}</CardTitle>
                <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                  {tournament.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{tournament.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>{getTypeDisplay(tournament.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Participants:</span>
                  <span>{tournament.currentParticipants}/{tournament.maxParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span>Organizer:</span>
                  <span>{tournament.organizer.username}</span>
                </div>
                {tournament.winner && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Winner:</span>
                    <span>{tournament.winner.username}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 space-y-2">
                {canRegister(tournament) && (
                  <Button 
                    onClick={() => registerForTournament(tournament._id)}
                    className="w-full"
                    size="sm"
                  >
                    Register
                  </Button>
                )}
                
                {canUnregister(tournament) && (
                  <Button 
                    onClick={() => unregisterFromTournament(tournament._id)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Unregister
                  </Button>
                )}
                
                {canStart(tournament) && (
                  <Button 
                    onClick={() => startTournament(tournament._id)}
                    className="w-full"
                    size="sm"
                  >
                    Start Tournament
                  </Button>
                )}
                
                {(tournament.status === 'in-progress' || tournament.status === 'completed') && 
                 isUserRegistered(tournament) && (
                  <Button 
                    onClick={() => joinTournamentRoom(tournament)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    View Bracket
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tournaments.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
          <p className="text-gray-500">Be the first to create a tournament!</p>
        </div>
      )}
    </div>
  );
};

export default TournamentPage;
