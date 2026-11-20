import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  CalendarPlus,
  Database,
  KeyRound,
  Loader2,
  Save,
  School,
  Trash2,
} from "lucide-react";
import type { AcademicYear } from "@shared/types";
import { api, ApiError } from "@/lib/api";
import { useAppData } from "@/lib/AppDataContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/lib/ToastContext";
import { Card, Modal, PageHeading } from "@/components/ui";
import { addMonths, monthLabel } from "@/lib/date";
import { JUZ_CONFIG, TOTAL_PAGES } from "@shared/quran";

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="card-pad">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream-200 text-ink-500">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink-800">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-400">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function SettingsPage() {
  const { settings, years, activeYear, reload } = useAppData();
  const { user } = useAuth();
  const { show } = useToast();

  const [identity, setIdentity] = useState({
    madrasah: settings.madrasah,
    className: settings.className,
    teacherName: settings.teacherName,
  });
  const [identityBusy, setIdentityBusy] = useState(false);

  const [newYear, setNewYear] = useState({ label: "", startMonth: "", endMonth: "" });
  const [yearTouched, setYearTouched] = useState(false);
  const [yearBusy, setYearBusy] = useState(false);
  const [deleteYear, setDeleteYear] = useState<AcademicYear | null>(null);

  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [demoBusy, setDemoBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    setIdentity({
      madrasah: settings.madrasah,
      className: settings.className,
      teacherName: settings.teacherName,
    });
  }, [settings]);

  useEffect(() => {
    if (yearTouched || !activeYear) return;
    const start = addMonths(activeYear.endMonth, 1);
    const end = addMonths(start, 11);
    const startYear = start.slice(0, 4);
    setNewYear({ label: `${startYear}/${Number(startYear) + 1}`, startMonth: start, endMonth: end });
  }, [activeYear, yearTouched]);

  const nextYearPreview = useMemo(
    () =>
      newYear.startMonth && newYear.endMonth
        ? `${monthLabel(newYear.startMonth)} – ${monthLabel(newYear.endMonth)}`
        : "—",
    [newYear.startMonth, newYear.endMonth],
  );

  const saveIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
    setIdentityBusy(true);
    try {
      await api.updateSettings(identity);
      await reload();
      show("Identitas kelas disimpan.");
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menyimpan.", "error");
    } finally {
      setIdentityBusy(false);
    }
  };

  const addYear = async (event: React.FormEvent) => {
    event.preventDefault();
    setYearBusy(true);
    try {
      await api.createYear({ ...newYear, activate: true });
      await reload();
      show("Tahun ajaran baru dibuat dan diaktifkan.");
      setYearTouched(false);
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal membuat tahun ajaran.", "error");
    } finally {
      setYearBusy(false);
    }
  };

  const activateYear = async (year: AcademicYear) => {
    try {
      await api.updateYear(year.id, { activate: true });
      await reload();
      show(`Tahun ajaran ${year.label} diaktifkan.`);
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal mengaktifkan.", "error");
    }
  };

  const removeYear = async () => {
    if (!deleteYear) return;
    try {
      await api.deleteYear(deleteYear.id);
      await reload();
      show("Tahun ajaran dihapus.");
      setDeleteYear(null);
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menghapus tahun ajaran.", "error");
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.next !== password.confirm) {
      show("Konfirmasi password tidak sama.", "error");
      return;
    }
    setPasswordBusy(true);
    try {
      await api.changePassword(password.current, password.next);
      setPassword({ current: "", next: "", confirm: "" });
      show("Password diperbarui.");
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal mengubah password.", "error");
    } finally {
      setPasswordBusy(false);
    }
  };

  const fillDemo = async () => {
    setDemoBusy(true);
    try {
      const result = await api.generateDemo();
      show(`${result.inserted} setoran contoh ditambahkan.`);
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal membuat data contoh.", "error");
    } finally {
      setDemoBusy(false);
    }
  };

  const clearEntries = async () => {
    try {
      await api.clearEntries();
      show("Seluruh riwayat setoran dihapus.");
      setClearOpen(false);
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Gagal menghapus data.", "error");
    }
  };

  return (
    <div>
      <PageHeading
        title="Pengaturan"
        subtitle="Identitas kelas, tahun ajaran, akun, dan data aplikasi"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          icon={<School className="size-4" />}
          title="Identitas kelas"
          description="Nama ini tampil di dashboard dan laporan orang tua."
        >
          <form onSubmit={saveIdentity} className="space-y-3.5">
            <div>
              <label className="label" htmlFor="madrasah">
                Madrasah / lembaga
              </label>
                              <input
                  id="madrasah"
                  className="input"
                  readOnly={user?.role !== "admin"}
                  value={identity.madrasah}
                onChange={(event) =>
                  setIdentity((prev) => ({ ...prev, madrasah: event.target.value }))
                }
                placeholder="MTs Al-Hikmah"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="class-name">
                  Nama kelas
                </label>
                <input
                  id="class-name"
                  className="input"
                  readOnly={user?.role !== "admin"}
                  value={identity.className}
                  onChange={(event) =>
                    setIdentity((prev) => ({ ...prev, className: event.target.value }))
                  }
                  placeholder="Kelas 5A"
                />
              </div>
              <div>
                <label className="label" htmlFor="teacher-name">
                  Guru pengampu
                </label>
                <input
                  id="teacher-name"
                  className="input"
                  value={identity.teacherName}
                  onChange={(event) =>
                    setIdentity((prev) => ({ ...prev, teacherName: event.target.value }))
                  }
                  placeholder="Ust. Ahmad Fauzi"
                />
                <p className="mt-1 text-[11px] text-ink-400">
                  Nama ini tampil di laporan orang tua dan di panel akun.
                </p>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={identityBusy}>
              {identityBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan identitas
            </button>
          </form>
        </SectionCard>

        <SectionCard
          icon={<CalendarPlus className="size-4" />}
          title="Tahun ajaran"
          description="Ganti tahun ajaran tanpa membuat ulang data siswa."
        >
          <div className="space-y-2">
            {years.map((year) => {
              const isActive = activeYear?.id === year.id;
              return (
                <div
                  key={year.id}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 ${
                    isActive
                      ? "border-sand-400 bg-sand-300/20"
                      : "border-cream-300 bg-cream-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-ink-800">
                      {year.label}
                      {isActive ? <BadgeCheck className="size-3.5 text-sage-600" /> : null}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      {monthLabel(year.startMonth)} – {monthLabel(year.endMonth)}
                    </p>
                  </div>
                  {!isActive ? (
                    <>
                      <button
                        type="button"
                        className="text-[11px] font-bold text-sand-600 hover:underline"
                        onClick={() => activateYear(year)}
                      >
                        Aktifkan
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteYear(year)}
                        aria-label="Hapus tahun ajaran"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="chip border-sage-400/40 bg-sage-400/15 text-sage-600">
                      Aktif
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={addYear} className="mt-4 rounded-xl border border-dashed border-cream-400 bg-cream-100/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              Tahun ajaran baru
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="year-label">
                  Nama
                </label>
                <input
                  id="year-label"
                  className="input"
                  value={newYear.label}
                  onChange={(event) => {
                    setYearTouched(true);
                    setNewYear((prev) => ({ ...prev, label: event.target.value }));
                  }}
                  placeholder="2026/2027"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="year-start">
                  Mulai
                </label>
                <input
                  id="year-start"
                  type="month"
                  className="input"
                  value={newYear.startMonth}
                  onChange={(event) => {
                    setYearTouched(true);
                    setNewYear((prev) => ({ ...prev, startMonth: event.target.value }));
                  }}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="year-end">
                  Selesai
                </label>
                <input
                  id="year-end"
                  type="month"
                  className="input"
                  value={newYear.endMonth}
                  onChange={(event) => {
                    setYearTouched(true);
                    setNewYear((prev) => ({ ...prev, endMonth: event.target.value }));
                  }}
                  required
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-400">Rentang: {nextYearPreview}</p>
            <button type="submit" className="btn-secondary mt-3 w-full" disabled={yearBusy}>
              {yearBusy ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
              Buat & aktifkan tahun ajaran
            </button>
          </form>
        </SectionCard>

        <SectionCard
          icon={<KeyRound className="size-4" />}
          title="Akun pengajar"
          description="Email login dan penggantian password."
        >
          <form onSubmit={savePassword} className="space-y-3.5">
            <div>
              <label className="label" htmlFor="account-email">
                Email
              </label>
              <input
                id="account-email"
                className="input bg-cream-100"
                value={user?.email ?? ""}
                readOnly
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="current-pass">
                  Password saat ini
                </label>
                <input
                  id="current-pass"
                  type="password"
                  className="input"
                  value={password.current}
                  onChange={(event) =>
                    setPassword((prev) => ({ ...prev, current: event.target.value }))
                  }
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="label" htmlFor="new-pass">
                  Password baru
                </label>
                <input
                  id="new-pass"
                  type="password"
                  className="input"
                  value={password.next}
                  onChange={(event) =>
                    setPassword((prev) => ({ ...prev, next: event.target.value }))
                  }
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="confirm-pass">
                Ulangi password baru
              </label>
              <input
                id="confirm-pass"
                type="password"
                className="input"
                value={password.confirm}
                onChange={(event) =>
                  setPassword((prev) => ({ ...prev, confirm: event.target.value }))
                }
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={passwordBusy}>
              {passwordBusy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Ubah password
            </button>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            icon={<Database className="size-4" />}
            title="Data aplikasi"
            description="Bantu uji coba atau bersihkan data setoran."
          >
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={fillDemo} disabled={demoBusy}>
                {demoBusy ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                Isi data contoh bulan ini
              </button>
              <button type="button" className="btn-danger" onClick={() => setClearOpen(true)}>
                <Trash2 className="size-4" /> Hapus semua setoran
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              Data contoh berguna untuk melihat tampilan grafik. Data siswa dan tahun ajaran tidak
              terhapus.
            </p>
          </SectionCard>

          <SectionCard
            icon={<BookOpen className="size-4" />}
            title="Kurikulum halaman juz"
            description={`Total ${TOTAL_PAGES} halaman untuk juz 26–30.`}
          >
            <div className="grid grid-cols-5 gap-2">
              {JUZ_CONFIG.map((config) => (
                <div
                  key={config.juz}
                  className="rounded-xl border border-cream-300 bg-cream-100/70 p-2.5 text-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    Juz {config.juz}
                  </p>
                  <p className="mt-0.5 text-lg font-extrabold text-ink-800">{config.pages}</p>
                  <p className="text-[10px] text-ink-300">halaman</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
              Setiap setoran dicatat dengan juz dan urutan halaman, misalnya “Juz 30 halaman 5”
              atau “Juz 29 halaman 8”.
            </p>
          </SectionCard>
        </div>
      </div>

      <Modal
        open={Boolean(deleteYear)}
        onClose={() => setDeleteYear(null)}
        title="Hapus tahun ajaran?"
        description={
          deleteYear
            ? `${deleteYear.label} hanya dapat dihapus jika belum memiliki data setoran.`
            : undefined
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteYear(null)}>
              Batal
            </button>
            <button type="button" className="btn-danger" onClick={removeYear}>
              Hapus
            </button>
          </>
        }
      />

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Hapus semua setoran?"
        description="Seluruh riwayat setoran pada semua tahun ajaran akan dihapus permanen. Data siswa tetap ada."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setClearOpen(false)}>
              Batal
            </button>
            <button type="button" className="btn-danger" onClick={clearEntries}>
              Ya, hapus semua
            </button>
          </>
        }
      />
    </div>
  );
}
