import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppRouter } from './routes/AppRouter';
import './styles/globals.css';
import { AuthProvider } from './context/AuthContext';

const defaultGoogleClientId =
  '466743662626-7c6hg0i82n1fmnuir2niu1pof4qbhvui.apps.googleusercontent.com';
const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
const googleClientId =
  envGoogleClientId && envGoogleClientId.length > 0 ? envGoogleClientId : defaultGoogleClientId;

if (!googleClientId || googleClientId.length === 0) {
  console.error('Google Client ID не настроен! Google OAuth не будет работать.');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
