import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function AdminRoute() {
  const { isAuthed, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

