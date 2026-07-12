import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wraps any route group. If the user is not authenticated,
 * redirects them to /login preserving the originally requested path.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While auth state is being resolved, show a full-screen spinner
  if (loading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{ background: 'var(--color-canvas)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            Verifying session…
          </span>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login, saving intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in — render the child routes (AppShell + pages)
  return <Outlet />;
}
