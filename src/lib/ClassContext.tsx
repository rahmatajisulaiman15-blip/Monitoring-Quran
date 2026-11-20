import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ClassInfo } from "@shared/types";
import { api, setActiveClassId } from "./api";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "mq_selected_class";

interface ClassValue {
  classes: ClassInfo[];
  selectedClassId: string | null;
  selectedClass: ClassInfo | null;
  setSelectedClassId: (id: string | null) => void;
  reloadClasses: () => Promise<void>;
}

const ClassContextValue = createContext<ClassValue | null>(null);

export function ClassProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelected] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const reloadClasses = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await api.classes();
      setClasses(data.classes);
    } catch {
      /* biarkan kosong */
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      setClasses([]);
      setSelected(null);
      setActiveClassId(null);
      return;
    }
    if (!isAdmin) {
      setSelected(user.classId);
      setActiveClassId(null);
      void api
        .me()
        .then((data) => {
          if (data.ownClass) setClasses([data.ownClass]);
        })
        .catch(() => undefined);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    const next = stored && stored !== "all" ? stored : null;
    setSelected(next);
    setActiveClassId(next);
    void reloadClasses();
  }, [user, isAdmin, reloadClasses]);

  const setSelectedClassId = useCallback((id: string | null) => {
    setSelected(id);
    setActiveClassId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.setItem(STORAGE_KEY, "all");
  }, []);

  const selectedClass = useMemo(
    () => classes.find((row) => row.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const value = useMemo(
    () => ({ classes, selectedClassId, selectedClass, setSelectedClassId, reloadClasses }),
    [classes, selectedClassId, selectedClass, setSelectedClassId, reloadClasses],
  );

  return <ClassContextValue.Provider value={value}>{children}</ClassContextValue.Provider>;
}

export function useClasses(): ClassValue {
  const context = useContext(ClassContextValue);
  if (!context) throw new Error("useClasses harus dipakai di dalam ClassProvider");
  return context;
}
