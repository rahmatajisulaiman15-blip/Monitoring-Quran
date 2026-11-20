import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AcademicYear, Settings } from "@shared/types";
import { api } from "./api";
import { useAuth } from "./AuthContext";

interface AppDataValue {
  settings: Settings;
  years: AcademicYear[];
  activeYear: AcademicYear | null;
  reload: () => Promise<void>;
}

const EMPTY_SETTINGS: Settings = {
  madrasah: "",
  className: "",
  teacherName: "",
  activeYearId: null,
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [years, setYears] = useState<AcademicYear[]>([]);

  const reload = useCallback(async () => {
    try {
      const data = await api.me();
      setSettings(data.settings);
      setYears(data.years);
    } catch {
      // Biarkan nilai lama; halaman terkait akan menampilkan pesan sendiri.
    }
  }, []);

  useEffect(() => {
    if (user) void reload();
  }, [user, reload]);

  const activeYear = useMemo(
    () => years.find((year) => year.id === settings.activeYearId) ?? years[0] ?? null,
    [years, settings.activeYearId],
  );

  const value = useMemo(
    () => ({ settings, years, activeYear, reload }),
    [settings, years, activeYear, reload],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return context;
}
