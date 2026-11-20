import type {
  AcademicYear,
  ClassInfo,
  EntriesResponse,
  Entry,
  PublicReport,
  Settings,
  StudentReport,
  Summary,
  TeacherAccount,
  User,
} from "@shared/types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? "Terjadi kesalahan. Coba lagi sebentar.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

function body(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}

let activeClassId: string | null = null;

export function setActiveClassId(id: string | null): void {
  activeClassId = id;
}

function storedClassId(): string | null {
  try {
    const value = localStorage.getItem("mq_selected_class");
    return value && value !== "all" ? value : null;
  } catch {
    return null;
  }
}

function classParam(prefix: string): string {
  const id = activeClassId ?? storedClassId();
  if (!id) return "";
  return `${prefix}classId=${encodeURIComponent(id)}`;
}

export const api = {
  status: () =>
    request<{ needsSetup: boolean; user: User | null }>("/api/auth/status"),

  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      ...body({ email, password }),
    }),

  setup: (payload: {
    email: string;
    password: string;
    name: string;
    className: string;
    madrasah: string;
  }) =>
    request<{ user: User }>("/api/auth/setup", {
      method: "POST",
      ...body(payload),
    }),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  me: () =>
    request<{
      user: User;
      settings: Settings;
      years: AcademicYear[];
      classes?: ClassInfo[];
      ownClass?: ClassInfo | null;
    }>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("/api/auth/password", {
      method: "PATCH",
      ...body({ currentPassword, newPassword }),
    }),

  summary: (month: string) =>
    request<Summary>(`/api/summary?month=${month}${classParam("&")}`),

  classes: () =>
    request<{ classes: ClassInfo[]; teachers: TeacherAccount[] }>("/api/classes"),

  createTeacher: (payload: {
    name: string;
    email: string;
    password: string;
    classId: string;
  }) => request<{ id: string }>("/api/teachers", { method: "POST", ...body(payload) }),

  updateTeacher: (id: string, payload: { password?: string; classId?: string }) =>
    request<{ ok: true }>(`/api/teachers/${id}`, { method: "PATCH", ...body(payload) }),

  deleteTeacher: (id: string) =>
    request<{ ok: true }>(`/api/teachers/${id}`, { method: "DELETE" }),

  updateSettings: (payload: Partial<Settings>) =>
    request<{ settings: Settings }>("/api/settings", {
      method: "PATCH",
      ...body(payload),
    }),

  createYear: (payload: {
    label: string;
    startMonth: string;
    endMonth: string;
    activate?: boolean;
  }) => request<{ year: AcademicYear }>("/api/years", { method: "POST", ...body(payload) }),

  updateYear: (
    id: string,
    payload: Partial<{ label: string; startMonth: string; endMonth: string; activate: boolean }>,
  ) => request<{ ok: true }>(`/api/years/${id}`, { method: "PATCH", ...body(payload) }),

  deleteYear: (id: string) =>
    request<{ ok: true }>(`/api/years/${id}`, { method: "DELETE" }),

  createStudent: (payload: { name: string; className?: string }) =>
    request<{ id: string }>(`/api/students${classParam("?")}`, {
      method: "POST",
      ...body(payload),
    }),

  updateStudent: (id: string, payload: { name?: string; className?: string; active?: boolean }) =>
    request<{ ok: true }>(`/api/students/${id}`, { method: "PATCH", ...body(payload) }),

  deleteStudent: (id: string) =>
    request<{ ok: true }>(`/api/students/${id}`, { method: "DELETE" }),

  studentReport: (id: string, month: string) =>
    request<StudentReport>(`/api/students/${id}?month=${month}`),

  entries: (month: string, studentId?: string) =>
    request<EntriesResponse>(
      `/api/entries?month=${month}${studentId ? `&studentId=${studentId}` : ""}${classParam("&")}`,
    ),

  createEntry: (payload: {
    studentId: string;
    date: string;
    juz: number;
    pageStart: number;
    pageEnd: number;
    note?: string;
  }) => request<{ id: string }>("/api/entries", { method: "POST", ...body(payload) }),

  updateEntry: (
    id: string,
    payload: {
      studentId: string;
      date: string;
      juz: number;
      pageStart: number;
      pageEnd: number;
      note?: string;
    },
  ) => request<{ ok: true }>(`/api/entries/${id}`, { method: "PATCH", ...body(payload) }),

  deleteEntry: (id: string) => request<{ ok: true }>(`/api/entries/${id}`, { method: "DELETE" }),

  createShare: (studentId: string, month: string) =>
    request<{ token: string }>("/api/share", { method: "POST", ...body({ studentId, month }) }),

  revokeShare: (token: string) =>
    request<{ ok: true }>("/api/share", { method: "DELETE", ...body({ token }) }),

  publicReport: (token: string) => request<PublicReport>(`/api/public/share/${token}`),

  generateDemo: () => request<{ inserted: number }>("/api/demo", { method: "POST" }),

  clearEntries: () => request<{ ok: true }>("/api/demo", { method: "DELETE" }),
};

export type { Entry };
