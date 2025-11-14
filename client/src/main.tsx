import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppRouter } from './routes/AppRouter';
import './styles/globals.css';
import { AuthProvider } from './context/AuthContext';

const defaultGoogleClientId = '466743662626-7c6hg0i82n1fmnuir2niu1pof4qbhvui.apps.googleusercontent.com';
const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
const googleClientId = envGoogleClientId && envGoogleClientId.length > 0 ? envGoogleClientId : defaultGoogleClientId;
const isGoogleAuthConfigured = Boolean(envGoogleClientId && envGoogleClientId.length > 0);
const isProduction = import.meta.env.PROD;

if (!isGoogleAuthConfigured && !isProduction) {
  // Предупреждение только в dev режиме
  console.warn('VITE_GOOGLE_CLIENT_ID is not set; using default client id. Set VITE_GOOGLE_CLIENT_ID in your env for production.');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GoogleOAuthProvider clientId={googleClientId ?? ''}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);


