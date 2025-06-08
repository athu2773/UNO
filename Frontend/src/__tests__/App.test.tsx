import { render, screen } from '@testing-library/react';
import App from '../App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

describe('UNO App', () => {
  it('renders landing page by default', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    );
    expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
  });
});
// Add more tests for Dashboard, GameRoom, FriendsPanel, TournamentPage, etc.
