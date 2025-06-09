import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Users, UserPlus, Send } from 'lucide-react';

interface TeamInvitationProps {
  roomCode: string;
  onSendInvitation: (friendId: string) => void;
  isHost: boolean;
}

const TeamInvitation: React.FC<TeamInvitationProps> = ({ 
  roomCode, 
  onSendInvitation, 
  isHost 
}) => {
  const [friendId, setFriendId] = useState('');

  const handleSendInvitation = () => {
    if (friendId.trim()) {
      onSendInvitation(friendId.trim());
      setFriendId('');
    }
  };

  if (!isHost) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Invite Friends</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <Input
            placeholder="Enter friend's user ID or email"
            value={friendId}
            onChange={(e) => setFriendId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendInvitation();
              }
            }}
          />
          <Button 
            onClick={handleSendInvitation}
            disabled={!friendId.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Room Code: <strong>{roomCode}</strong> - Share this with friends to join directly
        </p>
      </CardContent>
    </Card>
  );
};

export default TeamInvitation;
