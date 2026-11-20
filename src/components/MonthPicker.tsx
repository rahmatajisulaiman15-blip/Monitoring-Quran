import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonth } from "@/lib/MonthContext";
import { addMonths, monthLabel, monthList } from "@/lib/date";
import type { AcademicYear } from "@shared/types";

export function MonthPicker({
  year,
  className = "",
}: {
  year?: AcademicYear | null;
  className?: string;
}) {
  const { month, setMonth } = useMonth();
  const options = year ? monthList(year.startMonth, year.endMonth) : [];
  const inRange = options.includes(month);

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-cream-300 bg-cream-50/90 p-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => setMonth(addMonths(month, -1))}
        className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 hover:text-ink-800"
        aria-label="Bulan sebelumnya"
      >
        <ChevronLeft className="size-4" />
      </button>
      {options.length > 0 && inRange ? (
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="min-w-[128px] cursor-pointer appearance-none rounded-lg bg-transparent px-1 py-1.5 text-center text-sm font-bold text-ink-800 outline-none"
          aria-label="Pilih bulan"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {monthLabel(option)}
            </option>
          ))}
        </select>
      ) : (
        <span className="min-w-[128px] px-1 text-center text-sm font-bold text-ink-800">
          {monthLabel(month)}
        </span>
      )}
      <button
        type="button"
        onClick={() => setMonth(addMonths(month, 1))}
        className="rounded-lg p-2 text-ink-500 transition hover:bg-cream-200 hover:text-ink-800"
        aria-label="Bulan berikutnya"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
