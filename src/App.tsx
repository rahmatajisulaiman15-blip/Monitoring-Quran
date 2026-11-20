import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { BookOpenText, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { SetoranPage } from "@/pages/Setoran";
import { AkumulasiPage } from "@/pages/Akumulasi";
import { StudentsPage } from "@/pages/Students";
import { StudentDetailPage } from "@/pages/StudentDetail";
import { SettingsPage } from "@/pages/Settings";
import { PublicReportPage } from "@/pages/PublicReport";
import { KelasPage } from "@/pages/Kelas";

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink-400">
        <span className="grid size-12 place-items-center rounded-2xl bg-ink-800 text-cream-100">
          <BookOpenText className="size-6" strokeWidth={1.8} />
        </span>
        <span className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="size-4 animate-spin" /> Menyiapkan aplikasi…
        </span>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="card card-pad max-w-sm text-center">
        <p className="text-4xl font-extrabold text-ink-200">404</p>
        <h1 className="mt-2 text-base font-bold text-ink-900">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-400">
          Periksa kembali alamat halaman yang Anda tuju.
        </p>
        <Link to="/" className="btn-primary mt-4">
          Ke dashboard
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/r/:token" element={<PublicReportPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/setoran" element={<SetoranPage />} />
        <Route path="/akumulasi" element={<AkumulasiPage />} />
        <Route path="/siswa" element={<StudentsPage />} />
        <Route path="/siswa/:id" element={<StudentDetailPage />} />
        <Route path="/kelas" element={<KelasPage />} />
        <Route path="/pengaturan" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export { Outlet };
