import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route so only authenticated users (or a specific role) can access it.
 *
 * Props:
 *   role  – optional string ("admin"). When provided, the user's role must match.
 *
 * Shows a loading indicator while the auth state is being restored on first load,
 * preventing a premature redirect to /login before we know who the user is.
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Logged in but wrong role — send home rather than showing a blank page
    return <Navigate to="/" replace />;
  }

  return children;
}
