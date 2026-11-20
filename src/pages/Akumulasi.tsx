import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  Sigma,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Summary } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";
import { MonthPicker } from "@/components/MonthPicker";
import { Avatar, Card, EmptyState, PageHeading, Spinner, StatCard } from "@/components/ui";
import {
  MONTH_NAMES,
  dayName,
  formatDateLong,
  monthLabel,
  parseDate,
} from "@/lib/date";

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(";"),
    )
    .join("\r\n");
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AkumulasiPage() {
  const { month } = useMonth();
  const { activeYear } = useAppData();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat akumulasi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const averagePerDay = useMemo(() => {
    if (!data || data.monthTotals.activeDays === 0) return 0;
    return data.monthTotals.pages / data.monthTotals.activeDays;
  }, [data]);

  const toggle = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const exportCsv = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Akumulasi Hafalan", data.settings.className, `${monthLabel(month)}`, `T.A. ${data.activeYear?.label ?? "-"}`],
      [],
      ["Hari", "Tanggal", "Bulan", "Jumlah Halaman", "Siswa"],
    ];
    for (const day of data.daily) {
      rows.push([
        dayName(day.date),
        day.date.slice(8, 10),
        MONTH_NAMES[parseDate(day.date).getMonth()],
        day.pages,
        day.students.map((student) => `${student.name} (${student.pages})`).join(", "),
      ]);
    }
    rows.push([]);
    rows.push(["Total halaman", data.monthTotals.pages]);
    rows.push([]);
    rows.push(["Nama siswa", "Halaman bulan ini", "Halaman tahun ajaran"]);
    for (const student of data.students) {
      rows.push([student.name, student.monthPages, student.yearPages]);
    }
    downloadCsv(`akumulasi-${data.settings.className || "kelas"}-${month}.csv`, rows);
  };

  return (
    <div>
      <PageHeading
        title="Akumulasi bulanan"
        subtitle={`Rekap setoran harian dan total halaman ${monthLabel(month)}`}
        actions={
          <>
            <MonthPicker year={activeYear} />
            <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!data}>
              <Download className="size-4" /> CSV
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer className="size-4" /> Cetak
            </button>
          </>
        }
      />

      {error ? (
        <Card className="card-pad border-red-200 bg-red-50/70 text-sm font-medium text-red-700">
          {error}
        </Card>
      ) : loading && !data ? (
        <Spinner label="Menghitung akumulasi…" />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={`Total ${monthLabel(month)}`}
              value={
                <>
                  {data.monthTotals.pages}
                  <span className="ml-1 text-sm font-bold text-ink-400">hlm</span>
                </>
              }
              hint={`${data.monthTotals.entries} setoran`}
              icon={<Sigma className="size-5" />}
              accent="#ad936d"
            />
            <StatCard
              label="Rata-rata / hari aktif"
              value={averagePerDay.toFixed(1)}
              hint={`${data.monthTotals.activeDays} hari ada setoran`}
              icon={<TrendingUp className="size-5" />}
              accent="#7C9A92"
            />
            <StatCard
              label="Siswa sudah setor"
              value={`${data.monthTotals.students}/${data.students.length}`}
              hint="Pada bulan ini"
              icon={<Users className="size-5" />}
              accent="#6B8CAE"
            />
            <StatCard
              label={`Total T.A. ${data.activeYear?.label ?? "-"}`}
              value={data.yearTotals.pages}
              hint={`${data.yearTotals.entries} setoran`}
              icon={<CalendarRange className="size-5" />}
              accent="#A9746E"
            />
          </div>

          <Card className="overflow-hidden print-full">
            <div className="flex flex-col gap-1 border-b border-cream-200 px-4 py-3.5">
              <h2 className="text-sm font-bold text-ink-800">Akumulasi harian — {monthLabel(month)}</h2>
              <p className="text-[11px] text-ink-400">
                Hari, tanggal, bulan, dan jumlah halaman yang disetorkan. Klik baris untuk melihat
                rincian siswa.
              </p>
            </div>

            {data.daily.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Belum ada setoran pada bulan ini"
                  description="Setoran yang dicatat akan otomatis terakumulasi di sini."
                  icon={<CalendarRange className="size-8" />}
                  action={
                    <Link to="/setoran" className="btn-primary mt-1">
                      Catat setoran
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead className="bg-cream-100/80">
                    <tr>
                      <th className="table-head w-10" />
                      <th className="table-head">Hari</th>
                      <th className="table-head">Tanggal</th>
                      <th className="table-head">Bulan</th>
                      <th className="table-head text-center">Siswa</th>
                      <th className="table-head text-right">Jumlah halaman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {data.daily.map((day) => {
                      const isOpen = expanded.has(day.date);
                      return (
                        <Fragment key={day.date}>
                          <tr
                            className="cursor-pointer transition hover:bg-cream-100/70"
                            onClick={() => toggle(day.date)}
                          >
                            <td className="table-cell">
                              <span className="grid size-7 place-items-center rounded-lg border border-cream-300 text-ink-400">
                                {isOpen ? (
                                  <ChevronDown className="size-3.5" />
                                ) : (
                                  <ChevronRight className="size-3.5" />
                                )}
                              </span>
                            </td>
                            <td className="table-cell font-semibold text-ink-800">
                              {dayName(day.date)}
                            </td>
                            <td className="table-cell tabular-nums">{day.date.slice(8, 10)}</td>
                            <td className="table-cell">
                              {MONTH_NAMES[parseDate(day.date).getMonth()]}
                            </td>
                            <td className="table-cell text-center">{day.students.length}</td>
                            <td className="table-cell text-right font-extrabold text-ink-900">
                              {day.pages}
                            </td>
                          </tr>
                          {isOpen ? (
                            <tr className="bg-cream-100/40">
                              <td />
                              <td colSpan={5} className="px-4 pb-3 pt-1">
                                <div className="flex flex-wrap gap-1.5">
                                  {day.students.map((student) => {
                                    const index = data.students.findIndex(
                                      (item) => item.id === student.id,
                                    );
                                    return (
                                      <span
                                        key={student.id}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-ink-600"
                                      >
                                        <Avatar name={student.name} index={index} size={20} />
                                        {student.name}
                                        <span className="rounded-full bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                                          {student.pages} hlm
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-cream-100">
                      <td colSpan={5} className="table-cell text-right font-bold text-ink-700">
                        Total halaman {monthLabel(month)}
                      </td>
                      <td className="table-cell text-right text-base font-extrabold text-ink-900">
                        {data.monthTotals.pages}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden print-full">
            <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-ink-800">Rekap per siswa</h2>
                <p className="text-[11px] text-ink-400">
                  Total halaman bulan ini dan sepanjang tahun ajaran.
                </p>
              </div>
              <span className="chip">
                {formatDateLong(`${month}-01`).split(", ")[1]}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead className="bg-cream-100/80">
                  <tr>
                    <th className="table-head">Siswa</th>
                    <th className="table-head text-center">Setoran</th>
                    <th className="table-head text-right">Halaman bulan ini</th>
                    <th className="table-head text-right">Halaman tahun ajaran</th>
                    <th className="table-head text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {data.students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-cream-100/60">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={student.name} index={index} size={28} />
                          <span className="font-semibold text-ink-800">{student.name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center">{student.monthEntries}</td>
                      <td className="table-cell text-right font-bold text-ink-900">
                        {student.monthPages}
                      </td>
                      <td className="table-cell text-right text-ink-600">{student.yearPages}</td>
                      <td className="table-cell text-right">
                        <Link
                          to={`/siswa/${student.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sand-600 hover:underline"
                        >
                          Evaluasi <ChevronRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
