import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { Summary } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { useMonth } from "@/lib/MonthContext";
import { useAppData } from "@/lib/AppDataContext";
import { useToast } from "@/lib/ToastContext";
import { MonthPicker } from "@/components/MonthPicker";
import { Avatar, Card, EmptyState, Modal, PageHeading, Spinner } from "@/components/ui";
import { monthLabel } from "@/lib/date";

interface StudentForm {
  id?: string;
  name: string;
  className: string;
}

export function StudentsPage() {
  const { month } = useMonth();
  const { settings, activeYear } = useAppData();
  const { show } = useToast();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<StudentForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.summary(month));
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal memuat siswa.", "error");
    } finally {
      setLoading(false);
    }
  }, [month, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const students = useMemo(() => {
    const rows = data?.students ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((student) => student.name.toLowerCase().includes(needle));
  }, [data, query]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (form.id) {
        await api.updateStudent(form.id, { name: form.name, className: form.className });
        show("Data siswa diperbarui.");
      } else {
        await api.createStudent({ name: form.name, className: form.className });
        show("Siswa baru ditambahkan.");
      }
      setForm(null);
      await load();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menyimpan siswa.", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteStudent(deleteTarget.id);
      show("Siswa beserta riwayat setorannya dihapus.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menghapus siswa.", "error");
    }
  };

  return (
    <div>
      <PageHeading
        title="Data siswa"
        subtitle={`${data?.students.length ?? 0} siswa · ${
          settings.className || "Kelas Tahfidz"
        }${activeYear ? ` · T.A. ${activeYear.label}` : ""}`}
        actions={
          <>
            <MonthPicker year={activeYear} />
            <button
              type="button"
              className="btn-primary"
              onClick={() => setForm({ name: "", className: settings.className })}
            >
              <UserPlus className="size-4" /> Tambah siswa
            </button>
          </>
        }
      />

      <Card className="mb-4 card-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <UsersRound className="size-4 text-ink-400" />
            Total halaman {monthLabel(month)}:{" "}
            <span className="font-bold text-ink-800">{data?.monthTotals.pages ?? 0} halaman</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
            <input
              className="input py-2 pl-9 text-sm"
              placeholder="Cari nama siswa…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading && !data ? (
        <Spinner label="Memuat data siswa…" />
      ) : students.length === 0 ? (
        <EmptyState
          title={query ? "Siswa tidak ditemukan" : "Belum ada siswa"}
          description={
            query
              ? "Coba kata kunci lain atau tambahkan siswa baru."
              : "Tambahkan siswa untuk mulai mencatat setoran hafalan."
          }
          icon={<UsersRound className="size-8" />}
          action={
            <button
              type="button"
              className="btn-primary mt-1"
              onClick={() => setForm({ name: "", className: settings.className })}
            >
              <Plus className="size-4" /> Tambah siswa
            </button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-cream-100/80">
                <tr>
                  <th className="table-head w-12">No</th>
                  <th className="table-head">Nama siswa</th>
                  <th className="table-head">Kelas</th>
                  <th className="table-head text-right">Halaman bulan ini</th>
                  <th className="table-head text-right">Halaman T.A.</th>
                  <th className="table-head">Posisi juz</th>
                  <th className="table-head text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {students.map((student) => {
                  const index = (data?.students ?? []).findIndex((item) => item.id === student.id);
                  const reached = student.juzProgress.filter((juz) => juz.page > 0);
                  return (
                    <tr key={student.id} className="group hover:bg-cream-100/60">
                      <td className="table-cell text-ink-400">{index + 1}</td>
                      <td className="table-cell">
                        <Link to={`/siswa/${student.id}`} className="flex items-center gap-2.5">
                          <Avatar name={student.name} index={index} size={32} />
                          <span className="font-semibold text-ink-800 group-hover:text-ink-900">
                            {student.name}
                          </span>
                        </Link>
                      </td>
                      <td className="table-cell text-ink-500">{student.className || "—"}</td>
                      <td className="table-cell text-right font-bold text-ink-900">
                        {student.monthPages}
                      </td>
                      <td className="table-cell text-right text-ink-600">{student.yearPages}</td>
                      <td className="table-cell">
                        {reached.length === 0 ? (
                          <span className="text-[11px] text-ink-300">Belum ada</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {reached.slice(0, 3).map((juz) => (
                              <span
                                key={juz.juz}
                                className="rounded-md bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold text-ink-500"
                              >
                                J{juz.juz}·{juz.page}
                              </span>
                            ))}
                            {reached.length > 3 ? (
                              <span className="text-[10px] font-bold text-ink-300">
                                +{reached.length - 3}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/siswa/${student.id}`}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
                            aria-label="Lihat evaluasi"
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                id: student.id,
                                name: student.name,
                                className: student.className || settings.className,
                              })
                            }
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
                            aria-label="Ubah siswa"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: student.id, name: student.name })}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Hapus siswa"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "Ubah data siswa" : "Tambah siswa"}
        description="Urutan siswa mengikuti urutan penambahan."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
              Batal
            </button>
            <button type="submit" form="student-form" className="btn-primary" disabled={busy}>
              Simpan
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={save} className="space-y-3.5">
          <div>
            <label className="label" htmlFor="student-name">
              Nama lengkap
            </label>
            <input
              id="student-name"
              className="input"
              value={form?.name ?? ""}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              placeholder="Nama siswa"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="student-class">
              Kelas
            </label>
            <input
              id="student-class"
              className="input"
              value={form?.className ?? ""}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, className: event.target.value } : prev))
              }
              placeholder={settings.className}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus siswa?"
        description={
          deleteTarget
            ? `${deleteTarget.name} dan seluruh riwayat setorannya akan dihapus permanen.`
            : undefined
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Batal
            </button>
            <button type="button" className="btn-danger" onClick={confirmDelete}>
              Hapus siswa
            </button>
          </>
        }
      />
    </div>
  );
}
