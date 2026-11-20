import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpenText,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  School,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAppData } from "@/lib/AppDataContext";
import { useClasses } from "@/lib/ClassContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, adminOnly: false },
  { to: "/setoran", label: "Setoran", icon: BookOpenText, end: false, adminOnly: false },
  { to: "/akumulasi", label: "Akumulasi", icon: CalendarDays, end: false, adminOnly: false },
  { to: "/siswa", label: "Siswa", icon: Users, end: false, adminOnly: false },
  { to: "/kelas", label: "Kelas & Guru", icon: School, end: false, adminOnly: true },
  { to: "/pengaturan", label: "Pengaturan", icon: SettingsIcon, end: false, adminOnly: false },
];

function ClassSelect() {
  const { user } = useAuth();
  const { classes, selectedClassId, setSelectedClassId } = useClasses();
  if (user?.role !== "admin") return null;
  return (
    <div className="mt-4 rounded-xl border border-cream-300 bg-cream-100/70 p-3">
      <label
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400"
        htmlFor="class-picker"
      >
        Kelas dilihat
      </label>
      <select
        id="class-picker"
        className="input mt-1.5 text-sm"
        value={selectedClassId ?? "all"}
        onChange={(event) => {
          const next = event.target.value === "all" ? null : event.target.value;
          setSelectedClassId(next);
          window.location.reload();
        }}
      >
        <option value="all">Semua kelas</option>
        {classes.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-xl bg-ink-800 text-cream-100 shadow-sm">
        <BookOpenText className="size-5" strokeWidth={1.8} />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-extrabold tracking-tight text-ink-900">
          Tahfidz Monitor
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          Juz 26–30
        </span>
      </span>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { settings, activeYear } = useAppData();
  const { selectedClass } = useClasses();
  const navigate = useNavigate();
  const navItems = NAV.filter((item) => !item.adminOnly || user?.role === "admin");
  const classLabel = selectedClass ? selectedClass.label : settings.className;
  const accountName =
    user?.role === "admin" ? settings.teacherName || user?.name || "Admin" : user?.name || "Pengajar";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-cream-300 bg-cream-50/85 px-4 py-5 backdrop-blur lg:flex">
        <div className="px-2">
          <Brand />
        </div>

        <ClassSelect />

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              <item.icon className="size-[18px]" strokeWidth={1.9} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-xl border border-cream-300 bg-cream-100/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            {settings.madrasah || "Tahun ajaran"}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-ink-800">
            {classLabel || "Kelas Tahfidz"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-ink-400">
            {activeYear ? `T.A. ${activeYear.label}` : "Belum ada tahun ajaran"}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl px-1 py-2">
          <span className="grid size-9 place-items-center rounded-full bg-sand-300 text-sm font-bold text-ink-800">
            {(accountName || "G").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink-800">{accountName}</p>
            <p className="truncate text-[11px] text-ink-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-cream-200 hover:text-ink-700"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-cream-300 bg-cream-100/85 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-1">
            <span className="chip">{activeYear ? `T.A. ${activeYear.label}` : "—"}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-cream-200 hover:text-ink-700"
              aria-label="Keluar"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-300 bg-cream-50/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition ${
                  isActive ? "text-ink-900" : "text-ink-400"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid size-8 place-items-center rounded-lg transition ${
                      isActive ? "bg-ink-800 text-cream-100" : ""
                    }`}
                  >
                    <item.icon className="size-[18px]" strokeWidth={1.9} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
