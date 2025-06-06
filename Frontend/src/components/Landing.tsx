import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../context/AuthContext';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const token = searchParams.get('token');
    console.log('Landing component - token from URL:', token);
    if (token) {
      console.log('Token found, calling login...');
      login(token);
    }
  }, [searchParams, login]);

  useEffect(() => {
    console.log('Landing component - user state changed:', user);
    if (user) {
      console.log('User exists, navigating to dashboard...');
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Welcome Section */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-6xl font-bold text-white mb-4 font-[Fredoka]">
              UNO
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Play the classic card game with friends online!
            </p>
            <Button 
              onClick={handleGoogleLogin}
              size="lg"
              className="bg-white text-blue-900 hover:bg-gray-100 text-lg px-8 py-3"
            >
              🚀 Sign in with Google
            </Button>
          </div>
        </div>

        {/* Game Rules Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">How to Play</CardTitle>
            <CardDescription className="text-gray-300">
              Quick rules to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">🎯 Objective</h3>
              <p>Be the first player to get rid of all your cards!</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🎮 Gameplay</h3>
              <ul className="space-y-1 text-sm">
                <li>• Match the top card by color or number</li>
                <li>• Use action cards to skip, reverse, or draw</li>
                <li>• Play Wild cards to change colors</li>
                <li>• Say \"UNO\" when you have one card left!</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🏆 Special Cards</h3>
              <ul className="space-y-1 text-sm">
                <li>• Skip (⊘): Next player loses their turn</li>
                <li>• Reverse (⟲): Reverse the direction of play</li>
                <li>• Draw Two (+2): Next player draws 2 cards</li>
                <li>• Wild (🌈): Choose any color</li>
                <li>• Wild Draw Four (+4): Choose color, next player draws 4</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Landing;
