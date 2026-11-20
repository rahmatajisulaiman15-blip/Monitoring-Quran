import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@shared/types";
import { colorForIndex } from "@/lib/palette";
import { monthShortLabel } from "@/lib/date";
import { JUZ_CONFIG, pagesInJuz } from "@shared/quran";

function ChartTooltip({
  active,
  payload,
  label,
  unit = "halaman",
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: Record<string, unknown> }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-ink-800">{label}</p>
      <p className="mt-0.5 text-ink-500">
        <span className="font-semibold text-ink-800">{item.value ?? 0}</span> {unit}
      </p>
    </div>
  );
}

export function StudentBarChart({
  students,
  metric,
  onSelect,
}: {
  students: Student[];
  metric: "month" | "year";
  onSelect?: (student: Student) => void;
}) {
  const data = useMemo(
    () =>
      students.map((student, index) => ({
        id: student.id,
        shortName: student.name.length > 12 ? `${student.name.slice(0, 11)}…` : student.name,
        name: student.name,
        pages: metric === "month" ? student.monthPages : student.yearPages,
        color: colorForIndex(index),
      })),
    [students, metric],
  );

  const average = data.length
    ? data.reduce((sum, item) => sum + item.pages, 0) / data.length
    : 0;
  const width = Math.max(560, data.length * 46);

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div style={{ minWidth: width }} className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 8, left: -12 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--color-cream-300)" strokeDasharray="3 4" />
            <XAxis
              dataKey="shortName"
              interval={0}
              tick={{ fontSize: 10, fill: "#8f8577", fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-cream-400)" }}
              angle={-45}
              textAnchor="end"
              height={62}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#918676" }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <Tooltip
              cursor={{ fill: "rgba(216, 200, 172, 0.18)" }}
              content={<ChartTooltip />}
            />
            {average > 0 ? (
              <ReferenceLine
                y={average}
                stroke="var(--color-sand-500)"
                strokeDasharray="5 4"
                label={{
                  value: `rata-rata ${Math.round(average)}`,
                  position: "insideTopRight",
                  fill: "#ad936d",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            ) : null}
            <Bar dataKey="pages" radius={[5, 5, 0, 0]} maxBarSize={34}>
              {data.map((item, index) => (
                <Cell
                  key={item.id}
                  fill={item.color}
                  cursor={onSelect ? "pointer" : "default"}
                  onClick={() => {
                    const student = students[index];
                    if (student && onSelect) onSelect(student);
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: { month: string; pages: number }[] }) {
  const chartData = data.map((item) => ({
    name: monthShortLabel(item.month),
    pages: item.pages,
    full: item.month,
  }));
  return (
    <div className="h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ad936d" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#ad936d" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-cream-300)" strokeDasharray="3 4" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#918676", fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-cream-400)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#918676" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="pages"
            stroke="#a98f6a"
            strokeWidth={2.4}
            fill="url(#trendFill)"
            dot={{ r: 3, strokeWidth: 2, fill: "#fdfbf7", stroke: "#a98f6a" }}
            activeDot={{ r: 4.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function JuzBars({
  data,
  palette = "sand",
}: {
  data: { juz: number; pages: number }[];
  palette?: "sand" | "student";
}) {
  const max = Math.max(1, ...data.map((item) => item.pages));
  return (
    <div className="space-y-3">
      {JUZ_CONFIG.map((config, index) => {
        const item = data.find((row) => row.juz === config.juz);
        const pages = item?.pages ?? 0;
        const percent = Math.round((pages / max) * 100);
        const color =
          palette === "student" ? colorForIndex(index) : "var(--color-sand-400)";
        return (
          <div key={config.juz} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs font-bold text-ink-600">Juz {config.juz}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, background: color }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-semibold text-ink-500">
              {pages} hlm
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function JuzProgressGrid({
  data,
}: {
  data: { juz: number; page: number; total: number }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {JUZ_CONFIG.map((config, index) => {
        const item = data.find((row) => row.juz === config.juz);
        const page = item?.page ?? 0;
        const total = pagesInJuz(config.juz);
        const percent = Math.round((page / total) * 100);
        const color = colorForIndex(index);
        return (
          <div
            key={config.juz}
            className="rounded-xl border border-cream-300 bg-cream-50 p-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Juz {config.juz}
              </span>
              <span className="text-[11px] font-semibold text-ink-400">{percent}%</span>
            </div>
            <p className="mt-2 text-sm font-bold text-ink-800">
              Halaman {page} <span className="text-ink-300">/ {total}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
