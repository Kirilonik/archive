import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppRouter } from './routes/AppRouter';
import './styles/globals.css';
import { AuthProvider } from './context/AuthContext';

const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
const googleClientId = envGoogleClientId && envGoogleClientId.length > 0 ? envGoogleClientId : null;

if (!googleClientId) {
  console.warn(
    'Google Client ID не настроен (VITE_GOOGLE_CLIENT_ID). Google OAuth не будет работать.',
  );
}

const App = () => (
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </GoogleOAuthProvider>
      ) : (
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
