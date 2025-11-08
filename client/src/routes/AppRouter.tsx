import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Home } from '../pages/Home';
import { Profile } from '../pages/Profile';
import { FilmDetails } from '../pages/FilmDetails';
import { SeriesDetails } from '../pages/SeriesDetails';
import { Header } from '../components/Header';
import { Add } from '../pages/Add';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
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
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
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
          <Route path="/add" element={<Add />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/films/:id" element={<FilmDetails />} />
          <Route path="/series/:id" element={<SeriesDetails />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}


