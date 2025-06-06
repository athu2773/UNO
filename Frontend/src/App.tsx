import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import GameRoom from './components/game/GameRoom';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute - user:', user, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
};

// Public Route component (redirect to dashboard if logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  console.log('PublicRoute - user:', user, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Routes>
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/game/:roomCode" 
          element={
            <ProtectedRoute>
              <GameRoom />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
