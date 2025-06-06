import { render, screen } from '@testing-library/react';
import App from '../App';
import { BrowserRouter } from 'react-router-dom';

describe('UNO App', () => {
  it('renders landing page by default', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
  });
});
// Add more tests for Dashboard, GameRoom, FriendsPanel, TournamentPage, etc.
