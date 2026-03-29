import { createContext, useContext, useEffect, useState } from "react";

import { getCurrentUser, loginRequest } from "../api/endpoints";
import { AUTH_STATE_EVENT, clearAuthToken, getAuthToken, setAuthToken } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    function syncToken() {
      const nextToken = getAuthToken();
      setToken(nextToken);

      if (!nextToken) {
        setUser(null);
        setInitializing(false);
      }
    }

    window.addEventListener(AUTH_STATE_EVENT, syncToken);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, syncToken);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapUser() {
      if (!token) {
        setUser(null);
        setInitializing(false);
        return;
      }

      setInitializing(true);

      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        clearAuthToken();
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    bootstrapUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(username, password) {
    const tokenResponse = await loginRequest({ username, password });
    setAuthToken(tokenResponse.access_token);
    setToken(tokenResponse.access_token);

    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setInitializing(false);
    return currentUser;
  }

  function logout() {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setInitializing(false);
  }

  return (
    <AuthContext.Provider
      value={{
        initializing,
        isAuthenticated: Boolean(token),
        login,
        logout,
        token,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
