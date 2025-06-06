import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useSocket } from "../../context/SocketContext";
import { Send } from "lucide-react";
import { cn } from "../../lib/utils";

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type?: 'user' | 'system';
}

interface User {
  id: string;
  name: string;
  picture?: string;
}

interface ChatBoxProps {
  roomCode: string;
  messages: Message[];
  currentUser: User;
}

const ChatBox: React.FC<ChatBoxProps> = ({ roomCode, messages, currentUser }) => {
  const [newMessage, setNewMessage] = useState("");
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;    socket.emit("sendMessage", {
      roomId: roomCode,
      message: newMessage.trim(),
    });

    setNewMessage("");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Game Chat</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-2",
                  message.userId === currentUser.id ? "justify-end" : "justify-start"
                )}
              >
                {message.userId !== currentUser.id && message.type !== 'system' && (
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarFallback className="text-xs">
                      {message.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-3 py-2",
                    message.type === 'system' 
                      ? "bg-gray-100 text-gray-700 text-center text-sm italic mx-auto"
                      : message.userId === currentUser.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  )}
                >
                  {message.type !== 'system' && message.userId !== currentUser.id && (
                    <div className="text-xs font-semibold mb-1">
                      {message.username}
                    </div>
                  )}
                  
                  <div className="break-words">{message.content}</div>
                  
                  {message.type !== 'system' && (
                    <div 
                      className={cn(
                        "text-xs mt-1 opacity-70",
                        message.userId === currentUser.id ? "text-right" : "text-left"
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  )}
                </div>

                {message.userId === currentUser.id && message.type !== 'system' && (
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarImage src={currentUser.picture} />
                    <AvatarFallback className="text-xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              maxLength={200}
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={!newMessage.trim()}
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          <div className="text-xs text-gray-500 mt-1 text-right">
            {newMessage.length}/200
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBox;
