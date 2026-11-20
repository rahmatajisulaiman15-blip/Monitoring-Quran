import type { Env } from "./env";
import type { AcademicYear, Settings } from "../shared/types";

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  madrasah TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  teacher_name TEXT NOT NULL DEFAULT '',
  active_year_id TEXT
);
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  start_month TEXT NOT NULL,
  end_month TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  date TEXT NOT NULL,
  juz INTEGER NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_student ON entries(student_id, date);
CREATE INDEX IF NOT EXISTS idx_entries_year ON entries(academic_year_id, date);
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  grade INTEGER NOT NULL,
  parallel TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS share_links (
  token TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(student_id, month)
);
`;

let ready: Promise<void> | null = null;

export function ensureSchema(env: Env): Promise<void> {
  if (!ready) {
    const statements = SCHEMA.split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    ready = env.DB.batch(statements.map((statement) => env.DB.prepare(statement)))
      .then(() => migrate(env))
      .catch((error) => {
        ready = null;
        throw error;
      });
  }
  return ready;
}

/* ------------------------------- classes ---------------------------------- */

export interface ClassRow {
  id: string;
  name: string;
  grade: number;
  parallel: string;
  sort_order: number;
}

export const CLASS_PARALLELS = ["A", "B", "C", "D"];
export const CLASS_GRADES = [1, 2, 3, 4, 5, 6];

export function normalizeClassName(raw: string): string {
  return raw
    .replace(/^kelas\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function classLabel(name: string): string {
  return `Kelas ${name}`;
}

export async function listClasses(env: Env): Promise<ClassRow[]> {
  const res = await env.DB.prepare(
    "SELECT id, name, grade, parallel, sort_order FROM classes ORDER BY sort_order ASC, name ASC",
  ).all<ClassRow>();
  return res.results ?? [];
}

export async function getClass(env: Env, id: string): Promise<ClassRow | null> {
  return env.DB.prepare(
    "SELECT id, name, grade, parallel, sort_order FROM classes WHERE id = ?",
  )
    .bind(id)
    .first<ClassRow>();
}

export async function findClassByName(env: Env, name: string): Promise<ClassRow | null> {
  return env.DB.prepare(
    "SELECT id, name, grade, parallel, sort_order FROM classes WHERE UPPER(name) = ?",
  )
    .bind(normalizeClassName(name))
    .first<ClassRow>();
}

export async function createClass(
  env: Env,
  input: { name: string; grade: number; parallel: string; sortOrder: number },
): Promise<ClassRow> {
  const id = uid();
  await env.DB.prepare(
    "INSERT INTO classes (id, name, grade, parallel, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, input.name.toUpperCase(), input.grade, input.parallel.toUpperCase(), input.sortOrder, nowISO())
    .run();
  return { id, name: input.name.toUpperCase(), grade: input.grade, parallel: input.parallel.toUpperCase(), sort_order: input.sortOrder };
}

async function addColumn(env: Env, sql: string): Promise<void> {
  try {
    await env.DB.prepare(sql).run();
  } catch {
    /* kolom sudah ada */
  }
}

async function migrate(env: Env): Promise<void> {
  await addColumn(env, "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'");
  await addColumn(env, "ALTER TABLE users ADD COLUMN class_id TEXT");
  await addColumn(env, "ALTER TABLE students ADD COLUMN class_id TEXT");

  const existing = await listClasses(env);
  if (!existing.length) {
    let order = 0;
    for (const grade of CLASS_GRADES) {
      for (const parallel of CLASS_PARALLELS) {
        order += 1;
        await createClass(env, {
          name: `${grade}${parallel}`,
          grade,
          parallel,
          sortOrder: order,
        });
      }
    }
  }

  const legacy = await env.DB.prepare(
    "SELECT id, class_name FROM students WHERE class_id IS NULL",
  ).all<{ id: string; class_name: string }>();
  for (const row of legacy.results ?? []) {
    const target =
      (await findClassByName(env, row.class_name || "")) ??
      (await findClassByName(env, "4A")) ??
      (await listClasses(env))[0] ??
      null;
    if (target) {
      await env.DB.prepare("UPDATE students SET class_id = ? WHERE id = ?")
        .bind(target.id, row.id)
        .run();
    }
  }

  const users = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
  if ((users?.n ?? 0) === 1) {
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE role <> 'admin'").run();
  }
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

/* ---------------------------------- dates --------------------------------- */

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEndExclusive(month: string): string {
  return `${addMonths(month, 1)}-01`;
}

export function yearStartDate(year: AcademicYear): string {
  return `${year.startMonth}-01`;
}

export function yearEndInclusive(year: AcademicYear): string {
  return `${year.endMonth}-31`;
}

export function defaultAcademicYear(): Omit<AcademicYear, "id"> {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return {
    label: `${startYear}/${startYear + 1}`,
    startMonth: `${startYear}-07`,
    endMonth: `${startYear + 1}-06`,
  };
}

/* --------------------------------- settings -------------------------------- */

export async function getSettings(env: Env): Promise<Settings> {
  const row = await env.DB.prepare(
    "SELECT madrasah, class_name, teacher_name, active_year_id FROM settings WHERE id = 1",
  ).first<{
    madrasah: string;
    class_name: string;
    teacher_name: string;
    active_year_id: string | null;
  }>();
  return {
    madrasah: row?.madrasah ?? "",
    className: row?.class_name ?? "",
    teacherName: row?.teacher_name ?? "",
    activeYearId: row?.active_year_id ?? null,
  };
}

export async function saveSettings(env: Env, settings: Settings): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO settings (id, madrasah, class_name, teacher_name, active_year_id)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       madrasah = excluded.madrasah,
       class_name = excluded.class_name,
       teacher_name = excluded.teacher_name,
       active_year_id = excluded.active_year_id`,
  )
    .bind(settings.madrasah, settings.className, settings.teacherName, settings.activeYearId)
    .run();
}

/* ------------------------------ academic years ----------------------------- */

export async function listYears(env: Env): Promise<AcademicYear[]> {
  const res = await env.DB.prepare(
    "SELECT id, label, start_month, end_month FROM academic_years ORDER BY start_month DESC",
  ).all<{ id: string; label: string; start_month: string; end_month: string }>();
  return (res.results ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    startMonth: row.start_month,
    endMonth: row.end_month,
  }));
}

export async function getActiveYear(env: Env): Promise<AcademicYear | null> {
  const settings = await getSettings(env);
  const years = await listYears(env);
  if (!years.length) return null;
  return years.find((y) => y.id === settings.activeYearId) ?? years[0];
}

export async function createYear(
  env: Env,
  year: Omit<AcademicYear, "id">,
): Promise<AcademicYear> {
  const id = uid();
  await env.DB.prepare(
    "INSERT INTO academic_years (id, label, start_month, end_month, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, year.label, year.startMonth, year.endMonth, nowISO())
    .run();
  return { id, ...year };
}

/* --------------------------------- students -------------------------------- */

export interface StudentRow {
  id: string;
  name: string;
  class_name: string;
  active: number;
  sort_order: number;
  created_at: string;
}

export async function listStudentRows(env: Env, classId?: string | null): Promise<StudentRow[]> {
  const res = classId
    ? await env.DB.prepare(
        "SELECT id, name, class_name, active, sort_order, created_at FROM students WHERE class_id = ? ORDER BY sort_order ASC, name ASC",
      )
        .bind(classId)
        .all<StudentRow>()
    : await env.DB.prepare(
        "SELECT id, name, class_name, active, sort_order, created_at FROM students ORDER BY sort_order ASC, name ASC",
      ).all<StudentRow>();
  return res.results ?? [];
}

export async function countStudentsInClass(env: Env, classId: string): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM students WHERE class_id = ?")
    .bind(classId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export async function seedStudents(
  env: Env,
  className: string,
  count = 30,
  classId?: string | null,
): Promise<void> {
  const stmt = env.DB.prepare(
    "INSERT INTO students (id, name, class_name, class_id, active, sort_order, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
  );
  const batch = [];
  for (let i = 1; i <= count; i++) {
    batch.push(
      stmt.bind(uid(), `Siswa ${String(i).padStart(2, "0")}`, className, classId ?? null, i, nowISO()),
    );
  }
  await env.DB.batch(batch);
}

/* ---------------------------------- users ---------------------------------- */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  class_id: string | null;
  created_at: string;
}

export async function listTeachers(env: Env): Promise<UserRow[]> {
  const res = await env.DB.prepare(
    "SELECT id, email, name, role, class_id, created_at FROM users WHERE role <> 'admin' ORDER BY created_at ASC",
  ).all<UserRow>();
  return res.results ?? [];
}

export async function createUserRow(
  env: Env,
  input: {
    email: string;
    name: string;
    hash: string;
    salt: string;
    role: string;
    classId: string | null;
  },
): Promise<string> {
  const id = uid();
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash, salt, created_at, role, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, input.email, input.name, input.hash, input.salt, nowISO(), input.role, input.classId)
    .run();
  return id;
}

/* ---------------------------------- entries -------------------------------- */

export interface EntryRow {
  id: string;
  student_id: string;
  academic_year_id: string;
  date: string;
  juz: number;
  page_start: number;
  page_end: number;
  note: string;
  created_at: string;
}

export function entryPages(row: { page_start: number; page_end: number }): number {
  return row.page_end - row.page_start + 1;
}
