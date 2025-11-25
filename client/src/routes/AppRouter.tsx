import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Home } from '../pages/Home';
import { Profile } from '../pages/Profile';
import { FilmDetails } from '../pages/FilmDetails';
import { SeriesDetails } from '../pages/SeriesDetails';
import { Header } from '../components/Header';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { VerifyEmail } from '../pages/VerifyEmail';
import { CheckEmail } from '../pages/CheckEmail';
import { ForgotPassword } from '../pages/ForgotPassword';
import { ResetPassword } from '../pages/ResetPassword';
import { useAuth } from '../context/AuthContext';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center text-text">
        <span>Загрузка...</span>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export function AppRouter() {
  return (
    <div className="min-h-screen text-text">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            color: 'rgb(15, 23, 42)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/films/:id" element={<FilmDetails />} />
          <Route path="/series/:id" element={<SeriesDetails />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
