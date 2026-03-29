import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { LoadingState } from "./LoadingState";

export function ProtectedRoute({ allowedRoles = null }) {
  const { initializing, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <LoadingState fullScreen label="Loading your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length) {
    const role = String(user?.role || "").toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map((item) => String(item).toLowerCase());
    if (!normalizedAllowedRoles.includes(role)) {
      return <Navigate replace to="/" />;
    }
  }

  return <Outlet />;
}
