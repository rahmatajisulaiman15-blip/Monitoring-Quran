import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Entry, EntriesResponse } from "@shared/types";
import { JUZ_CONFIG, pagesInJuz } from "@shared/quran";
import { api, ApiError } from "@/lib/api";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";
import { useToast } from "@/lib/ToastContext";
import { MonthPicker } from "@/components/MonthPicker";
import { Avatar, Card, EmptyState, Modal, PageHeading, Spinner } from "@/components/ui";
import { currentMonth, formatDateShort, monthLabel, todayISO } from "@/lib/date";

interface FormState {
  studentId: string;
  date: string;
  juz: number;
  pageStart: number;
  pageEnd: number;
  note: string;
}

function defaultForm(month: string): FormState {
  return {
    studentId: "",
    date: month === currentMonth() ? todayISO() : `${month}-01`,
    juz: 30,
    pageStart: 1,
    pageEnd: 3,
    note: "",
  };
}

export function SetoranPage() {
  const { month } = useMonth();
  const { activeYear } = useAppData();
  const { show } = useToast();
  const [data, setData] = useState<EntriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(() => defaultForm(month));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.entries(month);
      setData(result);
      setForm((prev) => (prev.studentId ? prev : { ...prev, date: defaultForm(month).date }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat setoran.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      date: month === currentMonth() ? todayISO() : `${month}-01`,
    }));
  }, [month]);

  const totalPages = pagesInJuz(form.juz);
  const pages = Math.max(0, form.pageEnd - form.pageStart + 1);
  const validRange =
    form.pageStart >= 1 && form.pageEnd >= form.pageStart && form.pageEnd <= totalPages;

  const studentsById = useMemo(
    () => new Map((data?.students ?? []).map((student) => [student.id, student.name])),
    [data],
  );
  const indexById = useMemo(
    () => new Map((data?.students ?? []).map((student, index) => [student.id, index])),
    [data],
  );

  const filtered = useMemo(() => {
    const rows = data?.entries ?? [];
    if (!query.trim()) return rows;
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (entry) =>
        entry.studentName.toLowerCase().includes(needle) ||
        String(entry.juz).includes(needle) ||
        entry.date.includes(needle),
    );
  }, [data, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.studentId) {
      setError("Pilih siswa terlebih dahulu.");
      return;
    }
    if (!validRange) {
      setError(`Halaman juz ${form.juz} harus antara 1 sampai ${totalPages}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        studentId: form.studentId,
        date: form.date,
        juz: form.juz,
        pageStart: form.pageStart,
        pageEnd: form.pageEnd,
        note: form.note,
      };
      if (editingId) {
        await api.updateEntry(editingId, payload);
        show("Setoran diperbarui.");
      } else {
        await api.createEntry(payload);
        show(`Setoran ${pages} halaman tersimpan.`);
      }
      setEditingId(null);
      setForm((prev) => ({
        ...defaultForm(month),
        studentId: prev.studentId,
        juz: prev.juz,
        pageStart: Math.min(prev.pageEnd + 1, totalPages),
        pageEnd: Math.min(prev.pageEnd + 1, totalPages),
      }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan setoran.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setForm({
      studentId: entry.studentId,
      date: entry.date,
      juz: entry.juz,
      pageStart: entry.pageStart,
      pageEnd: entry.pageEnd,
      note: entry.note,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteEntry(deleteTarget.id);
      show("Setoran dihapus.");
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) {
        setEditingId(null);
        setForm(defaultForm(month));
      }
      await load();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menghapus.", "error");
    }
  };

  return (
    <div>
      <PageHeading
        title="Setoran hafalan"
        subtitle={`Catat halaman yang disetorkan pada ${monthLabel(month)}${
          activeYear ? ` · T.A. ${activeYear.label}` : ""
        }`}
        actions={<MonthPicker year={activeYear} />}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.55fr]">
        <Card className="card-pad h-fit">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-800">
              {editingId ? (
                <Pencil className="size-4 text-ink-400" />
              ) : (
                <Plus className="size-4 text-ink-400" />
              )}
              {editingId ? "Ubah setoran" : "Setoran baru"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm(month));
                  setError(null);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-400 hover:text-ink-700"
              >
                <X className="size-3" /> Batal
              </button>
            ) : null}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3.5">
            <div>
              <label className="label" htmlFor="student">
                Nama siswa
              </label>
              <select
                id="student"
                className="input"
                value={form.studentId}
                onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
                required
              >
                <option value="">— Pilih siswa —</option>
                {(data?.students ?? []).map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="date">
                  Tanggal
                </label>
                <input
                  id="date"
                  type="date"
                  className="input"
                  value={form.date}
                  min={activeYear ? `${activeYear.startMonth}-01` : undefined}
                  max={activeYear ? `${activeYear.endMonth}-31` : undefined}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="juz">
                  Juz
                </label>
                <select
                  id="juz"
                  className="input"
                  value={form.juz}
                  onChange={(event) => {
                    const juz = Number(event.target.value);
                    setForm((prev) => ({
                      ...prev,
                      juz,
                      pageStart: 1,
                      pageEnd: Math.min(prev.pageEnd, pagesInJuz(juz)),
                    }));
                  }}
                >
                  {JUZ_CONFIG.map((config) => (
                    <option key={config.juz} value={config.juz}>
                      Juz {config.juz} ({config.pages} hlm)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="pageStart">
                  Halaman awal
                </label>
                <input
                  id="pageStart"
                  type="number"
                  min={1}
                  max={totalPages}
                  className="input"
                  value={form.pageStart}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pageStart: Number(event.target.value) }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="pageEnd">
                  Halaman akhir
                </label>
                <input
                  id="pageEnd"
                  type="number"
                  min={1}
                  max={totalPages}
                  className="input"
                  value={form.pageEnd}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pageEnd: Number(event.target.value) }))
                  }
                  required
                />
              </div>
            </div>

            <div className="rounded-xl border border-cream-300 bg-cream-100/80 px-3.5 py-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                <BookOpen className="size-3.5" /> Ringkasan
              </p>
              <p className="mt-1.5 text-sm font-bold text-ink-800">
                Juz {form.juz} · Halaman {Math.max(1, form.pageStart)}–
                {Math.max(1, form.pageEnd)}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {validRange ? `${pages} halaman disetorkan` : `Maksimal ${totalPages} halaman`}
                <span className="text-ink-300"> · total juz {totalPages} hlm</span>
              </p>
            </div>

            <div>
              <label className="label" htmlFor="note">
                Catatan <span className="normal-case text-ink-300">(opsional)</span>
              </label>
              <input
                id="note"
                className="input"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Murojaah, lancar, perlu pengulangan…"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={busy || !validRange}>
              {busy ? null : editingId ? <Check className="size-4" /> : <Plus className="size-4" />}
              {editingId ? "Simpan perubahan" : "Simpan setoran"}
            </button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-cream-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink-800">
                <CalendarDays className="size-4 text-ink-400" />
                Setoran {monthLabel(month)}
              </h2>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {data?.totals.entries ?? 0} setoran · {data?.totals.pages ?? 0} halaman
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-300" />
              <input
                className="input py-2 pl-8 text-xs"
                placeholder="Cari siswa / juz…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {loading && !data ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Belum ada setoran"
                description="Gunakan formulir di samping untuk mencatat setoran hafalan."
                icon={<BookOpen className="size-8" />}
              />
            </div>
          ) : (
            <div className="max-h-[640px] overflow-auto">
              <table className="w-full min-w-[540px] border-collapse">
                <thead className="sticky top-0 z-10 bg-cream-100/95 backdrop-blur">
                  <tr>
                    <th className="table-head">Tanggal</th>
                    <th className="table-head">Siswa</th>
                    <th className="table-head">Juz</th>
                    <th className="table-head">Halaman</th>
                    <th className="table-head text-right">Jumlah</th>
                    <th className="table-head" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="group hover:bg-cream-100/60">
                      <td className="table-cell whitespace-nowrap font-medium">
                        {formatDateShort(entry.date)}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={entry.studentName}
                            index={indexById.get(entry.studentId) ?? 0}
                            size={26}
                          />
                          <span className="font-semibold text-ink-800">{entry.studentName}</span>
                        </div>
                      </td>
                      <td className="table-cell whitespace-nowrap">Juz {entry.juz}</td>
                      <td className="table-cell whitespace-nowrap">
                        hlm {entry.pageStart}–{entry.pageEnd}
                      </td>
                      <td className="table-cell whitespace-nowrap text-right font-bold text-ink-800">
                        {entry.pages}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
                            aria-label="Ubah setoran"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Hapus setoran"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus setoran?"
        description={
          deleteTarget
            ? `${deleteTarget.studentName} · ${formatDateShort(deleteTarget.date)} · Juz ${
                deleteTarget.juz
              } hlm ${deleteTarget.pageStart}–${deleteTarget.pageEnd}`
            : undefined
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Batal
            </button>
            <button type="button" className="btn-danger" onClick={confirmDelete}>
              Hapus
            </button>
          </>
        }
      />
    </div>
  );
}
