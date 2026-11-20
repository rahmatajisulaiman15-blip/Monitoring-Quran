import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Plus, School, Trash2, UserRound, Users } from "lucide-react";
import type { ClassInfo, TeacherAccount } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { useClasses } from "@/lib/ClassContext";
import { useToast } from "@/lib/ToastContext";
import { Card, Modal, PageHeading } from "@/components/ui";

export function KelasPage() {
  const { classes, reloadClasses, setSelectedClassId } = useClasses();
  const { show } = useToast();
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", classId: "" });
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeacherAccount | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeacherAccount | null>(null);

  const load = async () => {
    try {
      const data = await api.classes();
      setTeachers(data.teachers);
      await reloadClasses();
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Gagal memuat data kelas.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalStudents = useMemo(
    () => classes.reduce((sum, row) => sum + row.students, 0),
    [classes],
  );
  const classesWithTeacher = useMemo(
    () => classes.filter((row) => row.teacher).length,
    [classes],
  );

  const openTeacherForm = (row?: ClassInfo) => {
    setForm({ name: "", email: "", password: "", classId: row?.id ?? "" });
    setFormOpen(true);
  };

  const submitTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createTeacher(form);
      show("Akun guru dibuat. 30 nama siswa disiapkan untuk kelas itu.");
      setFormOpen(false);
      await load();
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Gagal membuat akun guru.", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    try {
      await api.updateTeacher(resetTarget.id, { password: resetPassword });
      show("Password guru diperbarui. Sesi lamanya otomatis keluar.");
      setResetTarget(null);
      setResetPassword("");
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Gagal mengubah password.", "error");
    }
  };

  const removeTeacher = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTeacher(deleteTarget.id);
      show("Akun guru dihapus. Data siswa tetap tersimpan.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      show(error instanceof ApiError ? error.message : "Gagal menghapus akun.", "error");
    }
  };

  const openClass = (row: ClassInfo) => {
    setSelectedClassId(row.id);
    window.location.href = "/";
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Kelas & Guru"
        subtitle="Kelola 24 kelas (1A–6D) dan akun guru pengampu"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="card-pad">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Total kelas</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">{classes.length}</p>
          <p className="text-[11px] text-ink-400">kelas 1 sampai 6, paralel A–D</p>
        </Card>
        <Card className="card-pad">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Total siswa</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">{totalStudents}</p>
          <p className="text-[11px] text-ink-400">seluruh kelas terdaftar</p>
        </Card>
        <Card className="card-pad">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Kelas berguru</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">{classesWithTeacher}</p>
          <p className="text-[11px] text-ink-400">dari {classes.length} kelas</p>
        </Card>
      </div>

      <Card className="card-pad">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-ink-800">Daftar kelas</h2>
            <p className="text-[11px] text-ink-400">Klik “Buka” untuk memantau kelas tersebut.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => openTeacherForm()}>
            <Plus className="size-4" /> Tambah akun guru
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-cream-300 bg-cream-50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-800">
                    <School className="size-3.5 text-ink-400" /> {row.label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">
                    <Users className="size-3" /> {row.students} siswa
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-500">
                    <UserRound className="size-3" />
                    {row.teacher ? row.teacher.name : "belum ada guru"}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-bold text-sand-600 hover:underline"
                  onClick={() => openClass(row)}
                >
                  Buka
                </button>
              </div>
              {!row.teacher ? (
                <button
                  type="button"
                  className="mt-2 text-[11px] font-semibold text-ink-400 hover:text-ink-700 hover:underline"
                  onClick={() => openTeacherForm(row)}
                >
                  + Tambah guru untuk {row.name}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="card-pad">
        <h2 className="text-sm font-bold text-ink-800">Akun guru</h2>
        <p className="text-[11px] text-ink-400">
          Guru hanya bisa membuka data kelasnya sendiri.
        </p>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </p>
        ) : teachers.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Belum ada akun guru. Tambahkan lewat tombol di atas.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3 font-semibold">Nama</th>
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Kelas</th>
                  <th className="py-2 pr-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-cream-200 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-ink-800">{teacher.name}</td>
                    <td className="py-2 pr-3 text-ink-500">{teacher.email}</td>
                    <td className="py-2 pr-3 text-ink-500">{teacher.className ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
                          title="Ganti password"
                          onClick={() => {
                            setResetTarget(teacher);
                            setResetPassword("");
                          }}
                        >
                          <KeyRound className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-600"
                          title="Hapus akun guru"
                          onClick={() => setDeleteTarget(teacher)}
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Tambah akun guru"
        description="Akun ini hanya bisa membuka kelas yang dipilih. Jika kelas masih kosong, 30 nama siswa akan disiapkan otomatis."
      >
        <form onSubmit={submitTeacher} className="space-y-3">
          <div>
            <label className="label" htmlFor="teacher-name">
              Nama guru
            </label>
            <input
              id="teacher-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ustzh. Siti Aminah"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="teacher-email">
              Email login
            </label>
            <input
              id="teacher-email"
              type="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="guru@sekolah.id"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="teacher-password">
                Password awal
              </label>
              <input
                id="teacher-password"
                className="input"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="teacher-class">
                Kelas
              </label>
              <select
                id="teacher-class"
                className="input"
                value={form.classId}
                onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
                required
              >
                <option value="">Pilih kelas</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                    {row.teacher ? " (sudah ada guru)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Buat akun
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={`Ganti password ${resetTarget?.name ?? ""}`}
        description="Guru akan keluar dari sesi lamanya dan harus masuk dengan password baru."
      >
        <form onSubmit={submitReset} className="space-y-3">
          <div>
            <label className="label" htmlFor="reset-password">
              Password baru
            </label>
            <input
              id="reset-password"
              className="input"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              <KeyRound className="size-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Hapus akun ${deleteTarget?.name ?? ""}?`}
        description="Akun login guru dihapus, tetapi data siswa dan setorannya tetap tersimpan."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Batal
            </button>
            <button type="button" className="btn-danger" onClick={removeTeacher}>
              Hapus akun
            </button>
          </>
        }
      />
    </div>
  );
}
