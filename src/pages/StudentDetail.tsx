import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookCheck,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { StudentReport } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";
import { useToast } from "@/lib/ToastContext";
import { MonthPicker } from "@/components/MonthPicker";
import { JuzProgressGrid, TrendChart } from "@/components/charts";
import {
  Avatar,
  Card,
  EmptyState,
  Modal,
  PageHeading,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatDateShort, monthLabel, monthShortLabel } from "@/lib/date";

export function StudentDetailPage() {
  const { id = "" } = useParams();
  const { month } = useMonth();
  const { activeYear } = useAppData();
  const { show } = useToast();
  const [data, setData] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.studentReport(id, month);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data siswa.");
    } finally {
      setLoading(false);
    }
  }, [id, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const cumulative = useMemo(() => {
    let total = 0;
    return (data?.monthly ?? []).map((point) => {
      total += point.pages;
      return { ...point, cumulative: total };
    });
  }, [data]);

  const shareText = useMemo(() => {
    if (!data) return "";
    const lines = [
      `Assalamu'alaikum, berikut laporan hafalan Al-Qur'an ${data.student.name} (${data.student.className || data.settings.className}) untuk bulan ${monthLabel(month)}:`,
      "",
      `Total setoran: ${data.monthEntries} kali`,
      `Halaman bulan ini: ${data.monthPages} halaman`,
      `Total T.A. ${data.year?.label ?? "-"}: ${data.yearPages} halaman`,
      "",
      "Posisi hafalan per juz:",
      ...data.juzProgress
        .filter((juz) => juz.page > 0)
        .map((juz) => `• Juz ${juz.juz}: halaman ${juz.page} dari ${juz.total}`),
      ...(shareLink ? ["", `Laporan lengkap: ${shareLink}`] : []),
      "",
      `Guru pengampu: ${data.settings.teacherName || "-"}`,
    ];
    return lines.join("\n");
  }, [data, month, shareLink]);

  const openShare = async () => {
    setShareOpen(true);
    if (shareLink) return;
    setShareBusy(true);
    try {
      const { token } = await api.createShare(id, month);
      setShareLink(`${window.location.origin}/r/${token}`);
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal membuat tautan laporan.", "error");
    } finally {
      setShareBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      show("Tautan laporan disalin.");
    } catch {
      show("Browser menolak akses clipboard. Salin manual dari kolom tautan.", "error");
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteEntry(deleteTarget.id);
      show("Setoran dihapus.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menghapus setoran.", "error");
    }
  };

  const index = data ? 0 : -1;

  return (
    <div>
      <Link
        to="/siswa"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink-400 transition hover:text-ink-700"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke daftar siswa
      </Link>

      {error ? (
        <Card className="card-pad border-red-200 bg-red-50/70 text-sm font-medium text-red-700">
          {error}
        </Card>
      ) : loading && !data ? (
        <Spinner label="Memuat evaluasi siswa…" />
      ) : data ? (
        <div className="space-y-4">
          <Card className="card-pad">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <Avatar name={data.student.name} index={index} size={56} />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
                    {data.student.name}
                  </h1>
                  <p className="mt-0.5 text-sm text-ink-400">
                    {data.student.className || data.settings.className || "Kelas Tahfidz"}
                    {data.year ? ` · T.A. ${data.year.label}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MonthPicker year={activeYear ?? data.year} />
                <button type="button" className="btn-primary" onClick={openShare}>
                  <MessageCircle className="size-4" /> Bagikan laporan
                </button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={`Halaman ${monthShortLabel(month)}`}
              value={data.monthPages}
              hint={`${data.monthEntries} setoran`}
              icon={<CalendarDays className="size-5" />}
              accent="#ad936d"
            />
            <StatCard
              label="Halaman tahun ajaran"
              value={data.yearPages}
              hint={`${data.yearEntryCount} setoran`}
              icon={<BookCheck className="size-5" />}
              accent="#7C9A92"
            />
            <StatCard
              label="Total seluruh riwayat"
              value={data.totalPages}
              hint="Sejak pencatatan dimulai"
              icon={<Check className="size-5" />}
              accent="#6B8CAE"
            />
            <StatCard
              label="Setoran terakhir"
              value={
                data.entries[0] ? formatDateShort(data.entries[0].date) : "—"
              }
              hint={data.entries[0] ? `Juz ${data.entries[0].juz} halaman ${data.entries[0].pageStart}–${data.entries[0].pageEnd}` : "Belum ada bulan ini"}
              icon={<ShieldCheck className="size-5" />}
              accent="#A9746E"
            />
          </div>

          <Card className="card-pad">
            <h2 className="text-sm font-bold text-ink-800">Posisi hafalan per juz</h2>
            <p className="mt-1 text-xs text-ink-400">
              Halaman terjauh yang sudah disetorkan pada tiap juz (juz 30: 23 halaman, juz 29–26:
              20 halaman).
            </p>
            <div className="mt-4">
              <JuzProgressGrid data={data.juzProgress} />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="card-pad">
              <h2 className="text-sm font-bold text-ink-800">
                Perkembangan per bulan — {data.year?.label ?? "-"}
              </h2>
              <p className="mt-1 text-xs text-ink-400">Jumlah halaman yang disetorkan setiap bulan.</p>
              <div className="mt-3">
                <TrendChart data={data.monthly} />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-cream-200 px-4 py-3">
                <h2 className="text-sm font-bold text-ink-800">Evaluasi bulanan</h2>
                <p className="text-[11px] text-ink-400">Total dan akumulasi halaman per bulan.</p>
              </div>
              <div className="max-h-[280px] overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-cream-100/95 backdrop-blur">
                    <tr>
                      <th className="table-head">Bulan</th>
                      <th className="table-head text-right">Halaman</th>
                      <th className="table-head text-right">Akumulasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {cumulative.map((point) => (
                      <tr
                        key={point.month}
                        className={
                          point.month === month ? "bg-sand-300/20 font-semibold" : undefined
                        }
                      >
                        <td className="table-cell">{monthLabel(point.month)}</td>
                        <td className="table-cell text-right font-bold text-ink-800">
                          {point.pages}
                        </td>
                        <td className="table-cell text-right text-ink-500">{point.cumulative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-ink-800">
                  Setoran {monthLabel(month)}
                </h2>
                <p className="text-[11px] text-ink-400">
                  {data.monthEntries} setoran · {data.monthPages} halaman
                </p>
              </div>
              <Link to="/setoran" className="text-[11px] font-bold text-sand-600 hover:underline">
                + Tambah setoran
              </Link>
            </div>
            {data.entries.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Belum ada setoran bulan ini"
                  description="Catat setoran agar laporan bulanan bisa dibagikan."
                  icon={<BookCheck className="size-8" />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead className="bg-cream-100/80">
                    <tr>
                      <th className="table-head">Tanggal</th>
                      <th className="table-head">Juz</th>
                      <th className="table-head">Halaman</th>
                      <th className="table-head text-right">Jumlah</th>
                      <th className="table-head">Catatan</th>
                      <th className="table-head" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {data.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="table-cell whitespace-nowrap font-medium">
                          {formatDateShort(entry.date)}
                        </td>
                        <td className="table-cell">Juz {entry.juz}</td>
                        <td className="table-cell">
                          hlm {entry.pageStart}–{entry.pageEnd}
                        </td>
                        <td className="table-cell text-right font-bold text-ink-800">
                          {entry.pages}
                        </td>
                        <td className="table-cell text-ink-400">{entry.note || "—"}</td>
                        <td className="table-cell text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: entry.id,
                                label: `${formatDateShort(entry.date)} · Juz ${entry.juz} hlm ${entry.pageStart}–${entry.pageEnd}`,
                              })
                            }
                            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Hapus setoran"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Bagikan laporan ke orang tua"
        description={`Laporan ${data?.student.name ?? ""} untuk ${monthLabel(month)} dapat dibuka tanpa login.`}
        wide
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShareOpen(false)}>
              Tutup
            </button>
            <a
              className="btn-primary"
              href={shareLink ?? "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!shareLink}
              onClick={(event) => {
                if (!shareLink) event.preventDefault();
              }}
            >
              <ExternalLink className="size-4" /> Buka laporan
            </a>
          </>
        }
      >
        {shareBusy ? (
          <div className="flex items-center gap-2 py-6 text-sm text-ink-400">
            <Loader2 className="size-4 animate-spin" /> Membuat tautan…
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="share-link">
                Tautan laporan
              </label>
              <div className="flex gap-2">
                <input
                  id="share-link"
                  readOnly
                  className="input bg-cream-100 text-xs"
                  value={shareLink ?? ""}
                  onFocus={(event) => event.target.select()}
                />
                <button type="button" className="btn-secondary shrink-0" onClick={copyLink}>
                  <Copy className="size-4" />
                </button>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                <Link2 className="size-3" /> Tautan tetap sama untuk siswa dan bulan yang sama.
              </p>
            </div>

            <div className="rounded-xl border border-cream-300 bg-cream-100/70 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Pratinjau pesan
              </p>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-600">
                {shareText}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                className="btn-primary"
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" /> Kirim via WhatsApp
              </a>
              <button type="button" className="btn-secondary" onClick={copyLink}>
                <Copy className="size-4" /> Salin pesan & tautan
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-300">
              Tombol “Salin pesan & tautan” menyalin tautan saja. Gunakan WhatsApp untuk mengirim
              ringkasan lengkap, atau buka laporan lalu cetak/simpan sebagai PDF.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus setoran?"
        description={deleteTarget?.label}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Batal
            </button>
            <button type="button" className="btn-danger" onClick={confirmDeleteEntry}>
              Hapus
            </button>
          </>
        }
      />
    </div>
  );
}
