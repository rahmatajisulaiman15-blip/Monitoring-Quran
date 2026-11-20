import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { currentMonth } from "./date";

interface MonthContextValue {
  month: string;
  setMonth: (month: string) => void;
}

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth());
  const value = useMemo(() => ({ month, setMonth }), [month]);
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthContextValue {
  const context = useContext(MonthContext);
  if (!context) throw new Error("useMonth harus dipakai di dalam MonthProvider");
  return context;
}
