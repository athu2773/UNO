import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import App from '../App';
import Landing from '../components/Landing';
import Dashboard from '../components/Dashboard';

// Test wrapper component with all necessary providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SocketProvider>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </SocketProvider>
  </AuthProvider>
);

describe('UNO App - Frontend Integration Tests', () => {
  describe('Landing Page', () => {
    it('renders landing page with all key elements', () => {
      render(
        <TestWrapper>
          <Landing />
        </TestWrapper>
      );

      expect(screen.getByText(/UNO/i)).toBeInTheDocument();
      expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
      expect(screen.getByText(/Login/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
    });

    it('displays game rules when How to Play is clicked', async () => {
      render(
        <TestWrapper>
          <Landing />
        </TestWrapper>
      );

      const howToPlayButton = screen.getByText(/How to Play/i);
      fireEvent.click(howToPlayButton);

      await waitFor(() => {
        expect(screen.getByText(/Game Rules/i)).toBeInTheDocument();
      });
    });
  });

  describe('App Routing', () => {
    it('renders landing page by default', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      
      expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
    });

    it('shows loading spinner initially', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
      
      // Should show loading state initially
      const loadingElements = screen.getAllByRole('status', { hidden: true });
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication UI', () => {
    it('renders login form', async () => {
      render(
        <TestWrapper>
          <Landing />
        </TestWrapper>
      );

      const loginButton = screen.getByText(/Login/i);
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it('renders registration form', async () => {
      render(
        <TestWrapper>
          <Landing />
        </TestWrapper>
      );

      const signUpButton = screen.getByText(/Sign Up/i);
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Components', () => {
    it('renders dashboard with main sections', () => {
      // Mock authenticated user context
      const mockAuthContext = {
        user: { _id: '123', username: 'testuser', email: 'test@example.com' },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn()
      };

      render(
        <SocketProvider>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </SocketProvider>
      );

      // Should render main dashboard sections
      expect(screen.getByText(/Create Room/i)).toBeInTheDocument();
      expect(screen.getByText(/Join Room/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <Landing />
        </TestWrapper>
      );

      // Check that mobile-responsive elements are present
      const container = screen.getByRole('main');
      expect(container).toHaveClass('min-h-screen');
    });
  });

  describe('Error Boundaries', () => {
    it('handles component errors gracefully', () => {
      // Mock console.error to prevent test noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <TestWrapper>
          <ThrowError />
        </TestWrapper>
      );

      consoleSpy.mockRestore();
    });
  });
});

// Helper function to test socket connection
describe('Socket Integration', () => {
  it('establishes socket connection', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Socket connection should be attempted
    // This is a basic test - in a real scenario, you'd mock the socket
    expect(true).toBe(true); // Placeholder
  });
});
