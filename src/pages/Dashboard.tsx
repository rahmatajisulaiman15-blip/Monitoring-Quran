import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookMarked,
  CalendarCheck2,
  ChartColumnBig,
  ChevronRight,
  Layers,
  Users,
} from "lucide-react";
import type { Summary } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { useMonth } from "@/lib/MonthContext";
import { MonthPicker } from "@/components/MonthPicker";
import { StudentBarChart, TrendChart, JuzBars } from "@/components/charts";
import { Avatar, Card, EmptyState, PageHeading, Spinner, StatCard } from "@/components/ui";
import { colorForIndex } from "@/lib/palette";
import { formatDateShort, monthLabel } from "@/lib/date";

export function DashboardPage() {
  const { month } = useMonth();
  const navigate = useNavigate();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "year">("month");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .summary(month)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const students = data?.students ?? [];
  const totalStudents = students.length;
  const submittedStudents = data?.monthTotals.students ?? 0;
  const topStudents = [...students]
    .filter((student) => (mode === "month" ? student.monthPages : student.yearPages) > 0)
    .sort((a, b) => (mode === "month" ? b.monthPages - a.monthPages : b.yearPages - a.yearPages))
    .slice(0, 5);

  return (
    <div>
      <PageHeading
        title="Dashboard"
        subtitle={
          data
            ? `${data.className || data.settings.className || "Semua kelas"} · ${totalStudents} siswa${
                data.activeYear ? ` · T.A. ${data.activeYear.label}` : ""
              }`
            : "Ringkasan capaian hafalan kelas"
        }
        actions={<MonthPicker year={data?.activeYear} />}
      />

      {error ? (
        <Card className="card-pad mb-4 border-red-200 bg-red-50/70 text-sm font-medium text-red-700">
          {error}
        </Card>
      ) : null}

      {loading && !data ? (
        <Spinner label="Memuat ringkasan…" />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total siswa"
              value={totalStudents}
              hint={`${students.filter((student) => student.active).length} siswa aktif`}
              icon={<Users className="size-5" />}
            />
            <StatCard
              label={`Halaman ${monthLabel(month).split(" ")[0]}`}
              value={data.monthTotals.pages}
              hint={`${data.monthTotals.entries} setoran tercatat`}
              icon={<BookMarked className="size-5" />}
              accent="#ad936d"
            />
            <StatCard
              label="Sudah setor"
              value={`${submittedStudents}/${totalStudents}`}
              hint={`${Math.max(0, totalStudents - submittedStudents)} siswa belum setor`}
              icon={<CalendarCheck2 className="size-5" />}
              accent="#7C9A92"
            />
            <StatCard
              label="Total tahun ajaran"
              value={data.yearTotals.pages}
              hint={`${data.yearTotals.entries} setoran sepanjang tahun`}
              icon={<Layers className="size-5" />}
              accent="#A9746E"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <Card className="card-pad min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ChartColumnBig className="size-4 text-ink-400" />
                    <h2 className="text-sm font-bold text-ink-800">Capaian tiap siswa</h2>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    Klik batang untuk membuka evaluasi siswa. Setiap anak memiliki warna tetap.
                  </p>
                </div>
                <div className="inline-flex shrink-0 rounded-lg border border-cream-300 bg-cream-100 p-0.5">
                  {(
                    [
                      { key: "month", label: "Bulan ini" },
                      { key: "year", label: "Tahun ajaran" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMode(option.key)}
                      className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                        mode === option.key
                          ? "bg-cream-50 text-ink-900 shadow-sm"
                          : "text-ink-400 hover:text-ink-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 min-w-0">
                <StudentBarChart
                  students={students}
                  metric={mode}
                  onSelect={(student) => navigate(`/siswa/${student.id}`)}
                />
              </div>
            </Card>

            <div className="min-w-0 space-y-4">
              <Card className="card-pad">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink-800">Peringkat setoran</h2>
                  <span className="chip">{mode === "month" ? "Bulan" : "Tahun"}</span>
                </div>
                {topStudents.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-cream-400 bg-cream-100/60 px-4 py-6 text-center text-xs text-ink-400">
                    Belum ada setoran pada periode ini.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2.5">
                    {topStudents.map((student) => {
                      const index = students.findIndex((item) => item.id === student.id);
                      return (
                        <li key={student.id}>
                          <Link
                            to={`/siswa/${student.id}`}
                            className="flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition hover:bg-cream-200/70"
                          >
                            <Avatar name={student.name} index={index} size={34} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink-800">
                                {student.name}
                              </p>
                              <p className="text-[11px] text-ink-400">
                                {student.monthEntries} setoran bulan ini
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-ink-800">
                              {mode === "month" ? student.monthPages : student.yearPages}
                              <span className="ml-1 text-[10px] font-semibold text-ink-400">hlm</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link
                  to="/siswa"
                  className="mt-3 flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-cream-200"
                >
                  Lihat semua siswa
                  <ChevronRight className="size-3.5" />
                </Link>
              </Card>

              <Card className="card-pad">
                <h2 className="text-sm font-bold text-ink-800">Sebaran halaman per juz</h2>
                <p className="mt-1 text-xs text-ink-400">Akumulasi kelas pada {monthLabel(month)}.</p>
                <div className="mt-4">
                  <JuzBars data={data.juzTotals} />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-300">
                  Juz 30: 23 halaman · Juz 29–26: 20 halaman masing-masing.
                </p>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <Card className="card-pad">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-ink-800">Tren hafalan per bulan</h2>
                  <p className="mt-1 text-xs text-ink-400">
                    {data.activeYear
                      ? `Tahun ajaran ${data.activeYear.label}`
                      : "Belum ada tahun ajaran aktif"}
                  </p>
                </div>
                <span className="chip">
                  <ArrowUpRight className="size-3" />
                  {data.yearTotals.pages} halaman
                </span>
              </div>
              <div className="mt-4">
                <TrendChart data={data.monthly} />
              </div>
            </Card>

            <Card className="card-pad">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-800">Setoran terbaru</h2>
                <Link
                  to="/akumulasi"
                  className="text-[11px] font-bold text-sand-600 hover:underline"
                >
                  Akumulasi
                </Link>
              </div>
              {data.daily.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Belum ada setoran bulan ini"
                    description="Mulai catat setoran pertama agar grafik terisi."
                    action={
                      <Link to="/setoran" className="btn-primary mt-1">
                        Catat setoran
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-cream-200">
                  {data.daily.slice(0, 5).map((day) => (
                    <li key={day.date} className="flex items-center gap-3 py-2.5">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                        style={{ background: colorForIndex(day.date.length % 30) }}
                      >
                        {day.date.slice(8, 10)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-800">
                          {formatDateShort(day.date)}
                        </p>
                        <p className="text-[11px] text-ink-400">
                          {day.students.length} siswa · {day.entries} setoran
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-ink-800">
                        {day.pages}
                        <span className="ml-1 text-[10px] font-semibold text-ink-400">hlm</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
