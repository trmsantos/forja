import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";

type AuthState = {
  user: api.User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: api.User) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me(token)
      .then(setUser)
      .catch(() => api.clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    api.setToken(res.token);
    setUser(res.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.register(name, email, password);
    api.setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    api.clearToken();
    setUser(null);
  }

  async function refresh() {
    const token = api.getToken();
    if (!token) return;
    try {
      setUser(await api.me(token));
    } catch {
      logout();
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
