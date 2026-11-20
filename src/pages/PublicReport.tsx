import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Loader2,
  Printer,
  TriangleAlert,
} from "lucide-react";
import type { PublicReport } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { colorForIndex } from "@/lib/palette";
import { formatDateShort, monthLabel, monthShortLabel } from "@/lib/date";
import { pagesInJuz } from "@shared/quran";

export function PublicReportPage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<PublicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .publicReport(token)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Laporan tidak tersedia.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const color = colorForIndex(token.charCodeAt(0) % 30);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-400">
          <Loader2 className="size-4 animate-spin" /> Memuat laporan…
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="card card-pad max-w-sm text-center">
          <TriangleAlert className="mx-auto size-8 text-sand-500" />
          <h1 className="mt-3 text-base font-bold text-ink-900">Laporan tidak dapat dibuka</h1>
          <p className="mt-1.5 text-sm text-ink-400">{error ?? "Tautan mungkin sudah dicabut."}</p>
          <Link to="/" className="btn-secondary mt-4">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  const bestJuz = [...data.juzProgress].sort((a, b) => b.page / b.total - a.page / a.total)[0];
  const maxMonth = Math.max(1, ...data.monthly.map((point) => point.pages));

  return (
    <div className="min-h-dvh px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Laporan hafalan · {monthLabel(data.month)}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer className="size-4" /> Cetak / PDF
            </button>
          </div>
        </div>

        <article className="card print-full overflow-hidden bg-cream-50">
          <header className="relative border-b border-cream-300 px-6 py-6 sm:px-8">
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ background: color }}
              aria-hidden
            />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                  {data.madrasah || "Laporan Hafalan Al-Qur'an"}
                </p>
                <h1 className="mt-1 text-lg font-extrabold tracking-tight text-ink-900">
                  Laporan Hafalan Bulanan
                </h1>
                <p className="mt-0.5 text-xs text-ink-400">
                  {data.className || "Kelas Tahfidz"} · T.A. {data.yearLabel}
                </p>
              </div>
              <div className="rounded-xl border border-cream-300 bg-cream-100 px-3.5 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Periode
                </p>
                <p className="text-sm font-bold text-ink-800">{monthLabel(data.month)}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white"
                style={{ background: color }}
                aria-hidden
              >
                {data.studentName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Nama siswa
                </p>
                <p className="text-xl font-extrabold tracking-tight text-ink-900">
                  {data.studentName}
                </p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 border-b border-cream-300 sm:grid-cols-4">
            {[
              { label: "Halaman bulan ini", value: `${data.monthPages}`, hint: `${data.monthEntries} setoran` },
              { label: "Total tahun ajaran", value: `${data.yearPages}`, hint: "halaman" },
              { label: "Total keseluruhan", value: `${data.totalPages}`, hint: "halaman" },
              {
                label: "Juz terjauh",
                value: bestJuz && bestJuz.page > 0 ? `Juz ${bestJuz.juz}` : "—",
                hint: bestJuz && bestJuz.page > 0 ? `halaman ${bestJuz.page}` : "belum ada",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`px-5 py-4 ${index % 2 === 1 ? "border-l border-cream-300" : ""} ${
                  index >= 2 ? "border-t border-cream-300 sm:border-t-0" : ""
                } ${index > 0 ? "sm:border-l sm:border-cream-300" : ""}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-extrabold text-ink-900">{item.value}</p>
                <p className="text-[10px] text-ink-400">{item.hint}</p>
              </div>
            ))}
          </section>

          <section className="border-b border-cream-300 px-6 py-5 sm:px-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
              Posisi hafalan per juz
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {data.juzProgress.map((juz, index) => {
                const total = juz.total || pagesInJuz(juz.juz);
                const percent = Math.round((juz.page / total) * 100);
                return (
                  <div
                    key={juz.juz}
                    className="rounded-lg border border-cream-300 bg-cream-100/60 p-2.5"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Juz {juz.juz}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-ink-800">
                      {juz.page}
                      <span className="text-[10px] font-semibold text-ink-300"> / {total}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-300">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percent}%`, background: colorForIndex(index) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 border-b border-cream-300 px-6 py-5 sm:grid-cols-[1.15fr_1fr] sm:px-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
                Setoran bulan ini
              </h2>
              {data.entries.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-cream-400 bg-cream-100/60 px-3 py-6 text-center text-xs text-ink-400">
                  Belum ada setoran pada bulan ini.
                </p>
              ) : (
                <table className="mt-2 w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-cream-300 text-left text-[10px] uppercase tracking-wider text-ink-400">
                      <th className="py-1.5 pr-2 font-semibold">Tanggal</th>
                      <th className="py-1.5 pr-2 font-semibold">Juz</th>
                      <th className="py-1.5 pr-2 font-semibold">Halaman</th>
                      <th className="py-1.5 text-right font-semibold">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {data.entries.map((entry, index) => (
                      <tr key={`${entry.date}-${index}`}>
                        <td className="py-1.5 pr-2 text-ink-600">{formatDateShort(entry.date)}</td>
                        <td className="py-1.5 pr-2 text-ink-600">Juz {entry.juz}</td>
                        <td className="py-1.5 pr-2 text-ink-600">
                          {entry.pageStart}–{entry.pageEnd}
                        </td>
                        <td className="py-1.5 text-right font-bold text-ink-800">{entry.pages}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
                Rekap per bulan
              </h2>
              <div className="mt-3 space-y-1.5">
                {data.monthly.map((point) => {
                  const percent = Math.round((point.pages / maxMonth) * 100);
                  const isCurrent = point.month === data.month;
                  return (
                    <div key={point.month} className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-[10px] font-semibold text-ink-400">
                        {monthShortLabel(point.month)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            background: isCurrent ? color : "var(--color-sand-300)",
                          }}
                        />
                      </div>
                      <span
                        className={`w-7 shrink-0 text-right text-[10px] font-bold ${
                          isCurrent ? "text-ink-800" : "text-ink-400"
                        }`}
                      >
                        {point.pages}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <footer className="flex flex-wrap items-end justify-between gap-6 px-6 py-5 sm:px-8">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
                <CheckCircle2 className="size-3.5 text-sage-600" />
                Laporan dibuat otomatis oleh Tahfidz Monitor
              </p>
              <p className="mt-1 text-[10px] text-ink-300">
                Dicetak {formatDateShort(data.generatedAt.slice(0, 10))} · {data.madrasah || data.className}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-ink-400">Guru pengampu</p>
              <div className="mt-6 w-40 border-t border-ink-300 pt-1 text-xs font-semibold text-ink-700">
                {data.teacherName || "—"}
              </div>
            </div>
          </footer>
        </article>

        <p className="no-print mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-300">
          <BookOpenText className="size-3.5" /> Tautan laporan ini dapat dibagikan ke orang tua siswa.
        </p>
      </div>
    </div>
  );
}
