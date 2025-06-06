import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { Toaster } from './components/ui/toaster'

console.log('main.tsx is loading...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

console.log('React app rendered!');
