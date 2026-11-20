import { useEffect, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { colorForIndex } from "@/lib/palette";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card card-pad relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: accent ?? "var(--color-sand-400)" }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            {label}
          </p>
          <p className="stat-value mt-2">{value}</p>
          {hint ? <p className="mt-1.5 text-xs font-medium text-ink-400">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream-200 text-ink-500">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Spinner({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-ink-400">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-cream-400 bg-cream-100/50 px-6 py-12 text-center">
      {icon ? <div className="text-ink-300">{icon}</div> : null}
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-400">{description}</p> : null}
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
      <div
        className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[92vh] overflow-y-auto rounded-t-2xl border border-cream-300 bg-cream-50 p-5 shadow-2xl sm:rounded-2xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-ink-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-ink-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-cream-200 hover:text-ink-700"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Avatar({
  name,
  index,
  size = 40,
}: {
  name: string;
  index: number;
  size?: number;
}) {
  const initials = name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white/95"
      style={{
        width: size,
        height: size,
        backgroundColor: colorForIndex(index),
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials || "S"}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  className = "",
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-cream-300/70 ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percent}%`, background: color ?? "var(--color-sand-400)" }}
      />
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
