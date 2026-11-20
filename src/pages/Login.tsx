import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  BarChart3,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { needsSetup, login, setup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("Kelas Tahfidz");
  const [madrasah, setMadrasah] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsSetup) {
        await setup({ email, password, name, className, madrasah });
      } else {
        await login(email, password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-800 p-12 text-cream-100 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(216,200,172,0.22), transparent 45%), radial-gradient(circle at 80% 70%, rgba(139,163,149,0.22), transparent 42%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-cream-100/10 text-cream-100 ring-1 ring-cream-100/20">
              <BookOpenText className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-tight">Tahfidz Monitor</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream-300/70">
                Juz 26 – 30
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-[34px] font-extrabold leading-[1.15] tracking-tight">
            Catat, pantau, dan laporkan hafalan Al-Qur'an setiap anak.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cream-300/80">
            Satu tempat untuk 30 santri: setoran harian, akumulasi bulanan, evaluasi per juz,
            hingga laporan siap dibagikan kepada orang tua.
          </p>

          <div className="mt-10 grid max-w-md gap-3">
            {[
              { icon: BarChart3, text: "Grafik balok 30 warna untuk tiap siswa" },
              { icon: Sparkles, text: "Akumulasi halaman harian & bulanan otomatis" },
              { icon: ShieldCheck, text: "Laporan bulanan siap dibagikan ke orang tua" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-cream-200/90">
                <span className="grid size-8 place-items-center rounded-lg bg-cream-100/10">
                  <item.icon className="size-4" strokeWidth={1.9} />
                </span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl border border-cream-100/15 bg-cream-100/[0.06] p-5">
          <p className="font-arabic text-right text-2xl leading-relaxed text-cream-100">
            خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
          </p>
          <p className="mt-2 text-xs leading-relaxed text-cream-300/70">
            “Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya.”
            <span className="mt-1 block text-[11px] text-cream-300/50">— HR. Bukhari</span>
          </p>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-ink-800 text-cream-100">
              <BookOpenText className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-ink-900">Tahfidz Monitor</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                Juz 26 – 30
              </p>
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sand-600">
            {needsSetup ? "Langkah pertama" : "Selamat datang kembali"}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">
            {needsSetup ? "Buat akun pengajar" : "Masuk ke akun Anda"}
          </h2>
          <p className="mt-1.5 text-sm text-ink-400">
            {needsSetup
              ? "Akun ini akan mengelola data hafalan kelas. 30 data siswa dibuat otomatis dan bisa diubah namanya."
              : "Gunakan email dan password yang terdaftar."}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {needsSetup ? (
              <>
                <div>
                  <label className="label" htmlFor="name">
                    Nama pengajar
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
                    <input
                      id="name"
                      className="input pl-9"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ust. Ahmad Fauzi"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="className">
                      Nama kelas
                    </label>
                    <input
                      id="className"
                      className="input"
                      value={className}
                      onChange={(event) => setClassName(event.target.value)}
                      placeholder="Kelas 5A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="madrasah">
                      Madrasah / lembaga
                    </label>
                    <input
                      id="madrasah"
                      className="input"
                      value={madrasah}
                      onChange={(event) => setMadrasah(event.target.value)}
                      placeholder="MTs Al-Hikmah"
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
                <input
                  id="email"
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="guru@madrasah.id"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
                <input
                  id="password"
                  type="password"
                  className="input pl-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={needsSetup ? "Minimal 6 karakter" : "••••••••"}
                  autoComplete={needsSetup ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {needsSetup ? "Buat akun & mulai" : "Masuk"}
              {!busy ? <ArrowRight className="size-4" /> : null}
            </button>
          </form>

          <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-ink-300">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Password disimpan dalam bentuk hash (PBKDF2-SHA256) dan sesi login berlaku 30 hari.
          </p>
        </div>
      </section>
    </div>
  );
}
