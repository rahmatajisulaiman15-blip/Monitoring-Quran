import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@shared/types";
import { api, ApiError } from "./api";

interface AuthContextValue {
  user: User | null;
  needsSetup: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (payload: {
    email: string;
    password: string;
    name: string;
    className: string;
    madrasah: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const status = await api.status();
      setUser(status.user);
      setNeedsSetup(status.needsSetup);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
    setNeedsSetup(false);
  }, []);

  const setup = useCallback(
    async (payload: {
      email: string;
      password: string;
      name: string;
      className: string;
      madrasah: string;
    }) => {
      const result = await api.setup(payload);
      setUser(result.user);
      setNeedsSetup(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
    setUser(null);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, needsSetup, loading, login, setup, logout, refresh }),
    [user, needsSetup, loading, login, setup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return context;
}
