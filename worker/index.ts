import type { Env } from "./env";
import {
  addMonths,
  classLabel,
  countStudentsInClass,
  createClass,
  createUserRow,
  createYear,
  currentMonth,
  defaultAcademicYear,
  ensureSchema,
  entryPages,
  findClassByName,
  getActiveYear,
  getClass,
  getSettings,
  listClasses,
  listStudentRows,
  listTeachers,
  listYears,
  monthEndExclusive,
  monthStart,
  nowISO,
  saveSettings,
  seedStudents,
  uid,
  yearEndInclusive,
  yearStartDate,
} from "./db";
import {
  SESSION_COOKIE,
  clearCookie,
  hashPassword,
  randomToken,
  readCookie,
  sessionCookie,
  sha256,
  verifyPassword,
} from "./crypto";
import { JUZ_ORDER, pagesInJuz } from "../shared/quran";

const SESSION_DAYS = 30;
const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  classId: string | null;
}

interface Scope {
  isAdmin: boolean;
  classId: string | null;
}

function userPayload(user: SessionUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    classId: user.classId,
  };
}

function resolveScope(user: SessionUser, url: URL): Scope {
  if (user.role === "admin") {
    const wanted = url.searchParams.get("classId");
    return { isAdmin: true, classId: wanted && wanted !== "all" ? wanted : null };
  }
  return { isAdmin: false, classId: user.classId };
}

function classCondition(scope: Scope): { sql: string; binds: string[] } {
  if (scope.classId) {
    return { sql: "student_id IN (SELECT id FROM students WHERE class_id = ?)", binds: [scope.classId] };
  }
  if (scope.isAdmin) return { sql: "1 = 1", binds: [] };
  return { sql: "1 = 0", binds: [] };
}

async function studentInScope(env: Env, scope: Scope, studentId: string): Promise<boolean> {
  if (scope.isAdmin) return true;
  if (!scope.classId) return false;
  const row = await env.DB.prepare(
    "SELECT 1 AS ok FROM students WHERE id = ? AND class_id = ?",
  )
    .bind(studentId, scope.classId)
    .first<{ ok: number }>();
  return Boolean(row);
}

async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.class_id, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
  )
    .bind(hash)
    .first<{
      id: string;
      email: string;
      name: string;
      role: string;
      class_id: string | null;
      expires_at: string;
    }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(hash).run();
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    classId: row.class_id,
  };
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken(32);
  const hash = await sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(hash, userId, nowISO(), expires)
    .run();
  return token;
}

function secureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const host = request.headers.get("Host");
    if (originHost === host) return true;
    const loopback = (h: string) =>
      h.startsWith("localhost:") || h.startsWith("127.0.0.1:") || h === "localhost" || h === "127.0.0.1";
    return Boolean(host && loopback(originHost) && loopback(host));
  } catch {
    return false;
  }
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

/* --------------------------------- payloads -------------------------------- */

interface RawEntry {
  id: string;
  student_id: string;
  date: string;
  juz: number;
  page_start: number;
  page_end: number;
  note: string;
  created_at: string;
  academic_year_id: string;
}

function mapEntry(row: RawEntry, studentName: string) {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName,
    date: row.date,
    juz: row.juz,
    pageStart: row.page_start,
    pageEnd: row.page_end,
    pages: entryPages(row),
    note: row.note,
    createdAt: row.created_at,
  };
}

const ENTRY_COLUMNS =
  "id, student_id, academic_year_id, date, juz, page_start, page_end, note, created_at";

async function fetchEntries(
  env: Env,
  where: string,
  bindings: unknown[],
): Promise<RawEntry[]> {
  const res = await env.DB.prepare(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE ${where} ORDER BY date DESC, created_at DESC`,
  )
    .bind(...bindings)
    .all<RawEntry>();
  return res.results ?? [];
}

async function allJuzProgress(env: Env): Promise<Map<string, Map<number, number>>> {
  const res = await env.DB.prepare(
    "SELECT student_id, juz, MAX(page_end) AS page FROM entries GROUP BY student_id, juz",
  ).all<{ student_id: string; juz: number; page: number }>();
  const map = new Map<string, Map<number, number>>();
  for (const row of res.results ?? []) {
    if (!map.has(row.student_id)) map.set(row.student_id, new Map());
    map.get(row.student_id)!.set(row.juz, row.page);
  }
  return map;
}

function buildJuzProgress(pages: Map<number, number> | undefined) {
  return JUZ_ORDER.map((juz) => ({
    juz,
    page: pages?.get(juz) ?? 0,
    total: pagesInJuz(juz),
  }));
}

async function studentProgressFor(env: Env, studentId: string) {
  const res = await env.DB.prepare(
    "SELECT juz, MAX(page_end) AS page FROM entries WHERE student_id = ? GROUP BY juz",
  )
    .bind(studentId)
    .all<{ juz: number; page: number }>();
  const map = new Map<number, number>();
  for (const row of res.results ?? []) map.set(row.juz, row.page);
  return buildJuzProgress(map);
}

async function summaryPayload(env: Env, monthParam: string | null, scope: Scope) {
  const settings = await getSettings(env);
  const years = await listYears(env);
  const activeYear = years.find((y) => y.id === settings.activeYearId) ?? years[0] ?? null;
  const month = monthParam && MONTH_RE.test(monthParam) ? monthParam : currentMonth();
  const scopeFilter = classCondition(scope);
  const currentClass = scope.classId ? await getClass(env, scope.classId) : null;

  const studentRows = await listStudentRows(env, scope.classId);
  const monthEntries = await fetchEntries(env, `date >= ? AND date < ? AND ${scopeFilter.sql}`, [
    monthStart(month),
    monthEndExclusive(month),
    ...scopeFilter.binds,
  ]);
  const yearEntries = activeYear
    ? await fetchEntries(env, `academic_year_id = ? AND date >= ? AND date <= ? AND ${scopeFilter.sql}`, [
        activeYear.id,
        yearStartDate(activeYear),
        yearEndInclusive(activeYear),
        ...scopeFilter.binds,
      ])
    : [];
  const juzMap = await allJuzProgress(env);

  const nameById = new Map(studentRows.map((s) => [s.id, s.name]));
  const perStudent = new Map<string, { pages: number; entries: number; last: string | null }>();
  for (const entry of monthEntries) {
    const current = perStudent.get(entry.student_id) ?? { pages: 0, entries: 0, last: null };
    current.pages += entryPages(entry);
    current.entries += 1;
    if (!current.last || entry.date > current.last) current.last = entry.date;
    perStudent.set(entry.student_id, current);
  }
  const yearPagesByStudent = new Map<string, number>();
  const yearEntriesByStudent = new Map<string, number>();
  for (const entry of yearEntries) {
    yearPagesByStudent.set(
      entry.student_id,
      (yearPagesByStudent.get(entry.student_id) ?? 0) + entryPages(entry),
    );
    yearEntriesByStudent.set(
      entry.student_id,
      (yearEntriesByStudent.get(entry.student_id) ?? 0) + 1,
    );
  }

  const students = studentRows.map((row) => {
    const stats = perStudent.get(row.id);
    return {
      id: row.id,
      name: row.name,
      className: row.class_name || settings.className,
      active: row.active === 1,
      sortOrder: row.sort_order,
      monthPages: stats?.pages ?? 0,
      monthEntries: stats?.entries ?? 0,
      yearPages: yearPagesByStudent.get(row.id) ?? 0,
      lastDate: stats?.last ?? null,
      juzProgress: buildJuzProgress(juzMap.get(row.id)),
    };
  });

  // Akumulasi harian
  const dailyMap = new Map<string, { pages: number; entries: number; students: Map<string, number> }>();
  for (const entry of monthEntries) {
    const day = dailyMap.get(entry.date) ?? { pages: 0, entries: 0, students: new Map() };
    day.pages += entryPages(entry);
    day.entries += 1;
    day.students.set(
      entry.student_id,
      (day.students.get(entry.student_id) ?? 0) + entryPages(entry),
    );
    dailyMap.set(entry.date, day);
  }
  const daily = [...dailyMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, value]) => ({
      date,
      pages: value.pages,
      entries: value.entries,
      students: [...value.students.entries()].map(([id, pages]) => ({
        id,
        name: nameById.get(id) ?? "Siswa",
        pages,
      })),
    }));

  // Tren per bulan dalam tahun ajaran
  const monthlyMap = new Map<string, number>();
  for (const entry of yearEntries) {
    const key = entry.date.slice(0, 7);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + entryPages(entry));
  }
  const monthly: { month: string; pages: number }[] = [];
  if (activeYear) {
    let cursor = activeYear.startMonth;
    let guard = 0;
    while (cursor <= activeYear.endMonth && guard < 24) {
      monthly.push({ month: cursor, pages: monthlyMap.get(cursor) ?? 0 });
      cursor = addMonths(cursor, 1);
      guard += 1;
    }
  } else {
    monthly.push({ month, pages: monthEntries.reduce((sum, e) => sum + entryPages(e), 0) });
  }

  const juzPages = new Map<number, number>();
  for (const entry of monthEntries) {
    juzPages.set(entry.juz, (juzPages.get(entry.juz) ?? 0) + entryPages(entry));
  }
  const juzTotals = JUZ_ORDER.map((juz) => ({ juz, pages: juzPages.get(juz) ?? 0 }));

  return {
    settings,
    years,
    activeYear,
    month,
    currentClass,
    className: currentClass ? classLabel(currentClass.name) : settings.className,
    students,
    monthTotals: {
      pages: monthEntries.reduce((sum, e) => sum + entryPages(e), 0),
      entries: monthEntries.length,
      students: perStudent.size,
      activeDays: daily.length,
    },
    yearTotals: {
      pages: yearEntries.reduce((sum, e) => sum + entryPages(e), 0),
      entries: yearEntries.length,
    },
    daily,
    monthly,
    juzTotals,
  };
}

/* ---------------------------------- router --------------------------------- */

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/+$/, "") || "/api";
  const method = request.method.toUpperCase();

  if (method !== "GET" && method !== "HEAD" && !sameOrigin(request)) {
    return fail("Permintaan lintas situs ditolak.", 403);
  }

  /* ------------------------------- public auth ------------------------------ */
  if (path === "/api/auth/status" && method === "GET") {
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
    const user = await getSessionUser(request, env);
    return json({ needsSetup: (count?.total ?? 0) === 0, user });
  }

  if (path === "/api/auth/setup" && method === "POST") {
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
    if ((count?.total ?? 0) > 0) return fail("Akun sudah tersedia. Silakan masuk.", 409);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const name = str(body.name) || "Guru";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Format email tidak valid.");
    if (password.length < 6) return fail("Password minimal 6 karakter.");

    const { hash, salt } = await hashPassword(password);
    const requested = str(body.className);
    const targetClass =
      (requested ? await findClassByName(env, requested) : null) ??
      (await listClasses(env))[0] ??
      null;
    const userId = await createUserRow(env, {
      email,
      name,
      hash,
      salt,
      role: "admin",
      classId: targetClass?.id ?? null,
    });

    const className = targetClass ? classLabel(targetClass.name) : requested || "Kelas Tahfidz";
    const defaults = defaultAcademicYear();
    const year = await createYear(env, defaults);
    await saveSettings(env, {
      madrasah: str(body.madrasah),
      className,
      teacherName: name,
      activeYearId: year.id,
    });
    await seedStudents(env, className, 30, targetClass?.id ?? null);

    const token = await createSession(env, userId);
    return json(
      { user: { id: userId, email, name, role: "admin", classId: targetClass?.id ?? null } },
      200,
      {
        "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86_400, secureRequest(request)),
      },
    );
  }

  if (path === "/api/auth/login" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return fail("Email dan password wajib diisi.");

    const user = await env.DB.prepare(
      "SELECT id, email, name, role, class_id, password_hash, salt FROM users WHERE email = ?",
    )
      .bind(email)
      .first<{
        id: string;
        email: string;
        name: string;
        role: string;
        class_id: string | null;
        password_hash: string;
        salt: string;
      }>();
    if (!user) return fail("Email atau password salah.", 401);
    const ok = await verifyPassword(password, user.password_hash, user.salt);
    if (!ok) return fail("Email atau password salah.", 401);

    const token = await createSession(env, user.id);
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowISO()).run();
    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          classId: user.class_id,
        },
      },
      200,
      { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86_400, secureRequest(request)) },
    );
  }

  if (path === "/api/auth/logout" && method === "POST") {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) {
      const hash = await sha256(token);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(hash).run();
    }
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  /* ------------------------------ public reports ----------------------------- */
  const publicMatch = path.match(/^\/api\/public\/share\/([a-zA-Z0-9]+)$/);
  if (publicMatch && method === "GET") {
    const token = publicMatch[1];
    const link = await env.DB.prepare(
      "SELECT student_id, month FROM share_links WHERE token = ?",
    )
      .bind(token)
      .first<{ student_id: string; month: string }>();
    if (!link) return fail("Tautan laporan tidak ditemukan atau sudah dicabut.", 404);

    const student = await env.DB.prepare(
      "SELECT id, name, class_name FROM students WHERE id = ?",
    )
      .bind(link.student_id)
      .first<{ id: string; name: string; class_name: string }>();
    if (!student) return fail("Siswa tidak ditemukan.", 404);

    const settings = await getSettings(env);
    const activeYear = await getActiveYear(env);
    const month = link.month;
    const monthEntries = await fetchEntries(env, "student_id = ? AND date >= ? AND date < ?", [
      student.id,
      monthStart(month),
      monthEndExclusive(month),
    ]);
    const yearEntries = activeYear
      ? await fetchEntries(env, "student_id = ? AND academic_year_id = ?", [
          student.id,
          activeYear.id,
        ])
      : [];
    const allEntries = await fetchEntries(env, "student_id = ?", [student.id]);

    const monthlyMap = new Map<string, number>();
    for (const entry of yearEntries) {
      const key = entry.date.slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + entryPages(entry));
    }
    const monthly: { month: string; pages: number }[] = [];
    if (activeYear) {
      let cursor = activeYear.startMonth;
      let guard = 0;
      while (cursor <= activeYear.endMonth && guard < 24) {
        monthly.push({ month: cursor, pages: monthlyMap.get(cursor) ?? 0 });
        cursor = addMonths(cursor, 1);
        guard += 1;
      }
    }

    return json({
      madrasah: settings.madrasah,
      className: student.class_name || settings.className,
      teacherName: settings.teacherName,
      yearLabel: activeYear?.label ?? "-",
      month,
      studentName: student.name,
      monthPages: monthEntries.reduce((sum, e) => sum + entryPages(e), 0),
      monthEntries: monthEntries.length,
      yearPages: yearEntries.reduce((sum, e) => sum + entryPages(e), 0),
      totalPages: allEntries.reduce((sum, e) => sum + entryPages(e), 0),
      juzProgress: await studentProgressFor(env, student.id),
      monthly,
      entries: monthEntries.map((entry) => ({
        date: entry.date,
        juz: entry.juz,
        pageStart: entry.page_start,
        pageEnd: entry.page_end,
        pages: entryPages(entry),
        note: entry.note,
      })),
      generatedAt: nowISO(),
    });
  }

  /* ------------------------------ authenticated ------------------------------ */
  const user = await getSessionUser(request, env);
  if (!user) return fail("Silakan masuk terlebih dahulu.", 401);

  if (path === "/api/auth/me" && method === "GET") {
    const settings = await getSettings(env);
    const years = await listYears(env);
    const classes = user.role === "admin" ? await listClasses(env) : [];
    const ownClass = user.classId ? await getClass(env, user.classId) : null;
    return json({
      user: userPayload(user),
      settings,
      years,
      classes,
      ownClass: ownClass
        ? { ...ownClass, label: classLabel(ownClass.name), students: 0, teacher: null }
        : null,
    });
  }

  if (path === "/api/auth/password" && method === "PATCH") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const nextPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (nextPassword.length < 6) return fail("Password baru minimal 6 karakter.");
    const row = await env.DB.prepare(
      "SELECT password_hash, salt FROM users WHERE id = ?",
    )
      .bind(user.id)
      .first<{ password_hash: string; salt: string }>();
    if (!row) return fail("Akun tidak ditemukan.", 404);
    if (!(await verifyPassword(currentPassword, row.password_hash, row.salt))) {
      return fail("Password saat ini tidak sesuai.", 401);
    }
    const { hash, salt } = await hashPassword(nextPassword);
    await env.DB.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
      .bind(hash, salt, user.id)
      .run();
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
    const token = await createSession(env, user.id);
    return json({ ok: true }, 200, {
      "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86_400, secureRequest(request)),
    });
  }

  /* -------------------------- admin: kelas & guru --------------------------- */
  if (path === "/api/classes" && method === "GET") {
    if (user.role !== "admin") return fail("Khusus admin.", 403);
    const rows = await listClasses(env);
    const totals = await env.DB.prepare(
      "SELECT class_id, COUNT(*) AS total FROM students GROUP BY class_id",
    ).all<{ class_id: string | null; total: number }>();
    const teachers = await listTeachers(env);
    const countById = new Map((totals.results ?? []).map((r) => [r.class_id ?? "", r.total]));
    const teacherByClass = new Map(
      teachers.filter((t) => t.class_id).map((t) => [t.class_id as string, t]),
    );
    return json({
      classes: rows.map((row) => {
        const teacher = teacherByClass.get(row.id);
        return {
          id: row.id,
          name: row.name,
          label: classLabel(row.name),
          grade: row.grade,
          parallel: row.parallel,
          students: countById.get(row.id) ?? 0,
          teacher: teacher ? { id: teacher.id, name: teacher.name, email: teacher.email } : null,
        };
      }),
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        classId: t.class_id,
        className: t.class_id
          ? (rows.find((r) => r.id === t.class_id)?.name ?? null)
          : null,
      })),
    });
  }

  if (path === "/api/teachers" && method === "POST") {
    if (user.role !== "admin") return fail("Khusus admin.", 403);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const classId = str(body.classId);
    if (!name) return fail("Nama guru wajib diisi.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Format email tidak valid.");
    if (password.length < 6) return fail("Password minimal 6 karakter.");
    const targetClass = classId ? await getClass(env, classId) : null;
    if (!targetClass) return fail("Pilih kelas untuk guru ini.");
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    if (exists) return fail("Email sudah dipakai akun lain.", 409);
    const { hash, salt } = await hashPassword(password);
    const id = await createUserRow(env, {
      email,
      name,
      hash,
      salt,
      role: "teacher",
      classId: targetClass.id,
    });
    if ((await countStudentsInClass(env, targetClass.id)) === 0) {
      await seedStudents(env, classLabel(targetClass.name), 30, targetClass.id);
    }
    return json({ id }, 201);
  }

  const teacherMatch = path.match(/^\/api\/teachers\/([^/]+)$/);
  if (teacherMatch) {
    if (user.role !== "admin") return fail("Khusus admin.", 403);
    const teacherId = teacherMatch[1];
    const teacher = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?")
      .bind(teacherId)
      .first<{ id: string; role: string }>();
    if (!teacher || teacher.role === "admin") return fail("Akun guru tidak ditemukan.", 404);

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const password = typeof body.password === "string" ? body.password : "";
      const classId = str(body.classId);
      if (password && password.length < 6) return fail("Password minimal 6 karakter.");
      if (password) {
        const { hash, salt } = await hashPassword(password);
        await env.DB.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
          .bind(hash, salt, teacherId)
          .run();
        await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(teacherId).run();
      }
      if (classId) {
        const targetClass = await getClass(env, classId);
        if (!targetClass) return fail("Kelas tidak ditemukan.", 404);
        await env.DB.prepare("UPDATE users SET class_id = ? WHERE id = ?")
          .bind(targetClass.id, teacherId)
          .run();
      }
      return json({ ok: true });
    }

    if (method === "DELETE") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(teacherId),
        env.DB.prepare("DELETE FROM users WHERE id = ?").bind(teacherId),
      ]);
      return json({ ok: true });
    }
  }

  if (path === "/api/summary" && method === "GET") {
    return json(await summaryPayload(env, url.searchParams.get("month"), resolveScope(user, url)));
  }

  if (path === "/api/settings" && method === "PATCH") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const current = await getSettings(env);
    const isAdmin = user.role === "admin";
    const next = {
      madrasah: isAdmin ? str(body.madrasah, current.madrasah) : current.madrasah,
      className: isAdmin ? str(body.className, current.className) : current.className,
      teacherName: str(body.teacherName, current.teacherName),
      activeYearId:
        body.activeYearId === null
          ? null
          : typeof body.activeYearId === "string"
            ? body.activeYearId
            : current.activeYearId,
    };
    await saveSettings(env, next);
    if (next.className) {
      await env.DB.prepare(
        "UPDATE students SET class_name = ? WHERE class_name = ?",
      )
        .bind(next.className, current.className)
        .run();
    }
    return json({ settings: next });
  }

  /* --------------------------------- years ---------------------------------- */
  if (path === "/api/years" && method === "GET") {
    return json({ years: await listYears(env) });
  }

  if (path === "/api/years" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const startMonth = str(body.startMonth);
    const endMonth = str(body.endMonth);
    const label = str(body.label);
    if (!MONTH_RE.test(startMonth) || !MONTH_RE.test(endMonth) || endMonth < startMonth) {
      return fail("Rentang bulan tahun ajaran tidak valid.");
    }
    if (!label) return fail("Nama tahun ajaran wajib diisi.");
    const year = await createYear(env, { label, startMonth, endMonth });
    if (body.activate === true) {
      const settings = await getSettings(env);
      await saveSettings(env, { ...settings, activeYearId: year.id });
    }
    return json({ year }, 201);
  }

  const yearMatch = path.match(/^\/api\/years\/([^/]+)$/);
  if (yearMatch) {
    const yearId = yearMatch[1];
    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const settings = await getSettings(env);
      if (body.activate === true) {
        await saveSettings(env, { ...settings, activeYearId: yearId });
      }
      const label = typeof body.label === "string" ? body.label.trim() : null;
      const startMonth = typeof body.startMonth === "string" ? body.startMonth.trim() : null;
      const endMonth = typeof body.endMonth === "string" ? body.endMonth.trim() : null;
      if (label || startMonth || endMonth) {
        const current = await env.DB.prepare(
          "SELECT label, start_month, end_month FROM academic_years WHERE id = ?",
        )
          .bind(yearId)
          .first<{ label: string; start_month: string; end_month: string }>();
        if (!current) return fail("Tahun ajaran tidak ditemukan.", 404);
        const nextLabel = label || current.label;
        const nextStart = startMonth || current.start_month;
        const nextEnd = endMonth || current.end_month;
        if (!MONTH_RE.test(nextStart) || !MONTH_RE.test(nextEnd) || nextEnd < nextStart) {
          return fail("Rentang bulan tahun ajaran tidak valid.");
        }
        await env.DB.prepare(
          "UPDATE academic_years SET label = ?, start_month = ?, end_month = ? WHERE id = ?",
        )
          .bind(nextLabel, nextStart, nextEnd, yearId)
          .run();
      }
      return json({ ok: true });
    }
    if (method === "DELETE") {
      const settings = await getSettings(env);
      if (settings.activeYearId === yearId) {
        return fail("Tahun ajaran aktif tidak dapat dihapus. Aktifkan tahun ajaran lain dulu.");
      }
      const used = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM entries WHERE academic_year_id = ?",
      )
        .bind(yearId)
        .first<{ total: number }>();
      if ((used?.total ?? 0) > 0) {
        return fail("Tahun ajaran ini masih memiliki data setoran.");
      }
      await env.DB.prepare("DELETE FROM academic_years WHERE id = ?").bind(yearId).run();
      return json({ ok: true });
    }
  }

  /* -------------------------------- students -------------------------------- */
  if (path === "/api/students" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = str(body.name);
    if (!name) return fail("Nama siswa wajib diisi.");
    const scope = resolveScope(user, url);
    const targetClassId = scope.classId ?? str(body.classId);
    const targetClass = targetClassId ? await getClass(env, targetClassId) : null;
    if (!targetClass) return fail("Pilih kelas terlebih dahulu.");
    const maxRow = await env.DB.prepare("SELECT MAX(sort_order) AS max FROM students WHERE class_id = ?")
      .bind(targetClass.id)
      .first<{ max: number | null }>();
    const id = uid();
    await env.DB.prepare(
      "INSERT INTO students (id, name, class_name, class_id, active, sort_order, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
    )
      .bind(
        id,
        name,
        classLabel(targetClass.name),
        targetClass.id,
        (maxRow?.max ?? 0) + 1,
        nowISO(),
      )
      .run();
    return json({ id }, 201);
  }

  const studentMatch = path.match(/^\/api\/students\/([^/]+)$/);
  if (studentMatch) {
    const studentId = studentMatch[1];
    const student = await env.DB.prepare(
      "SELECT id, name, class_name, class_id, created_at FROM students WHERE id = ?",
    )
      .bind(studentId)
      .first<{
        id: string;
        name: string;
        class_name: string;
        class_id: string | null;
        created_at: string;
      }>();
    if (!student) return fail("Siswa tidak ditemukan.", 404);
    if (user.role !== "admin" && student.class_id !== user.classId) {
      return fail("Siswa ini bukan bagian dari kelas Anda.", 403);
    }

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : student.name;
      const className =
        typeof body.className === "string" && body.className.trim()
          ? body.className.trim()
          : student.class_name;
      const active = body.active === undefined ? 1 : body.active ? 1 : 0;
      await env.DB.prepare("UPDATE students SET name = ?, class_name = ?, active = ? WHERE id = ?")
        .bind(name, className, active, studentId)
        .run();
      return json({ ok: true });
    }

    if (method === "DELETE") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM entries WHERE student_id = ?").bind(studentId),
        env.DB.prepare("DELETE FROM share_links WHERE student_id = ?").bind(studentId),
        env.DB.prepare("DELETE FROM students WHERE id = ?").bind(studentId),
      ]);
      return json({ ok: true });
    }

    if (method === "GET") {
      const settings = await getSettings(env);
      const activeYear = await getActiveYear(env);
      const monthParam = url.searchParams.get("month");
      const month = monthParam && MONTH_RE.test(monthParam) ? monthParam : currentMonth();

      const monthEntries = await fetchEntries(
        env,
        "student_id = ? AND date >= ? AND date < ?",
        [studentId, monthStart(month), monthEndExclusive(month)],
      );
      const yearEntries = activeYear
        ? await fetchEntries(env, "student_id = ? AND academic_year_id = ?", [
            studentId,
            activeYear.id,
          ])
        : [];
      const allEntries = await fetchEntries(env, "student_id = ?", [studentId]);

      const monthlyMap = new Map<string, number>();
      for (const entry of yearEntries) {
        const key = entry.date.slice(0, 7);
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + entryPages(entry));
      }
      const monthly: { month: string; pages: number }[] = [];
      if (activeYear) {
        let cursor = activeYear.startMonth;
        let guard = 0;
        while (cursor <= activeYear.endMonth && guard < 24) {
          monthly.push({ month: cursor, pages: monthlyMap.get(cursor) ?? 0 });
          cursor = addMonths(cursor, 1);
          guard += 1;
        }
      }

      return json({
        student,
        settings,
        year: activeYear,
        month,
        monthPages: monthEntries.reduce((sum, e) => sum + entryPages(e), 0),
        monthEntries: monthEntries.length,
        yearPages: yearEntries.reduce((sum, e) => sum + entryPages(e), 0),
        yearEntryCount: yearEntries.length,
        totalPages: allEntries.reduce((sum, e) => sum + entryPages(e), 0),
        juzProgress: await studentProgressFor(env, studentId),
        monthly,
        entries: monthEntries.map((e) => mapEntry(e, student.name)),
        yearEntries: yearEntries.map((e) => mapEntry(e, student.name)),
      });
    }
  }

  /* --------------------------------- entries -------------------------------- */
  if (path === "/api/entries" && method === "GET") {
    const monthParam = url.searchParams.get("month");
    const month = monthParam && MONTH_RE.test(monthParam) ? monthParam : currentMonth();
    const studentId = url.searchParams.get("studentId");
    const scope = resolveScope(user, url);
    const scopeFilter = classCondition(scope);
    const conditions = ["date >= ?", "date < ?", scopeFilter.sql];
    const bindings: unknown[] = [monthStart(month), monthEndExclusive(month), ...scopeFilter.binds];
    if (studentId) {
      conditions.push("student_id = ?");
      bindings.push(studentId);
    }
    const rows = await fetchEntries(env, conditions.join(" AND "), bindings);
    const students = await listStudentRows(env, scope.classId);
    const nameById = new Map(students.map((s) => [s.id, s.name]));
    return json({
      month,
      entries: rows.map((row) => mapEntry(row, nameById.get(row.student_id) ?? "Siswa")),
      students: students.map((s) => ({ id: s.id, name: s.name })),
      totals: {
        pages: rows.reduce((sum, e) => sum + entryPages(e), 0),
        entries: rows.length,
      },
    });
  }

  const readEntryBody = async (body: Record<string, unknown>, academicYearId: string) => {
    const studentId = str(body.studentId);
    const date = str(body.date);
    const juz = toInt(body.juz);
    const pageStart = toInt(body.pageStart);
    const pageEnd = toInt(body.pageEnd);
    if (!studentId) return { error: "Pilih siswa terlebih dahulu." };
    if (!DATE_RE.test(date)) return { error: "Tanggal tidak valid." };
    if (juz === null || !JUZ_ORDER.includes(juz)) return { error: "Pilih juz yang tersedia." };
    const total = pagesInJuz(juz);
    if (pageStart === null || pageEnd === null) return { error: "Halaman wajib diisi." };
    if (pageStart < 1 || pageEnd < pageStart || pageEnd > total) {
      return { error: `Halaman juz ${juz} harus antara 1 sampai ${total}.` };
    }
    return {
      value: {
        studentId,
        date,
        juz,
        pageStart,
        pageEnd,
        note: str(body.note),
        academicYearId,
      },
    };
  };

  if (path === "/api/entries" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const years = await listYears(env);
    const year = await getActiveYear(env);
    if (!year) return fail("Belum ada tahun ajaran. Buat tahun ajaran di Pengaturan.");
    const parsed = await readEntryBody(body, year.id);
    if ("error" in parsed) return fail(parsed.error!);
    const value = parsed.value!;
    if (!(await studentInScope(env, resolveScope(user, url), value.studentId))) {
      return fail("Siswa ini bukan bagian dari kelas Anda.", 403);
    }
    const inRange = years.some(
      (y) => value.date >= `${y.startMonth}-01` && value.date <= `${y.endMonth}-31`,
    );
    if (!inRange) {
      return fail("Tanggal berada di luar tahun ajaran yang terdaftar.");
    }
    const id = uid();
    await env.DB.prepare(
      `INSERT INTO entries (id, student_id, academic_year_id, date, juz, page_start, page_end, note, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        value.studentId,
        value.academicYearId,
        value.date,
        value.juz,
        value.pageStart,
        value.pageEnd,
        value.note,
        nowISO(),
        user.id,
      )
      .run();
    return json({ id }, 201);
  }

  const entryMatch = path.match(/^\/api\/entries\/([^/]+)$/);
  if (entryMatch) {
    const entryId = entryMatch[1];
    const existing = await env.DB.prepare(
      `SELECT ${ENTRY_COLUMNS} FROM entries WHERE id = ?`,
    )
      .bind(entryId)
      .first<RawEntry>();
    if (!existing) return fail("Setoran tidak ditemukan.", 404);

    if (method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const parsed = await readEntryBody(body, existing.academic_year_id);
      if ("error" in parsed) return fail(parsed.error!);
      const value = parsed.value!;
      const patchScope = resolveScope(user, url);
      if (
        !(await studentInScope(env, patchScope, value.studentId)) ||
        !(await studentInScope(env, patchScope, existing.student_id))
      ) {
        return fail("Setoran ini bukan bagian dari kelas Anda.", 403);
      }
      await env.DB.prepare(
        `UPDATE entries SET student_id = ?, date = ?, juz = ?, page_start = ?, page_end = ?, note = ?
          WHERE id = ?`,
      )
        .bind(
          value.studentId,
          value.date,
          value.juz,
          value.pageStart,
          value.pageEnd,
          value.note,
          entryId,
        )
        .run();
      return json({ ok: true });
    }

    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(entryId).run();
      return json({ ok: true });
    }
  }

  /* ---------------------------------- share --------------------------------- */
  if (path === "/api/share" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const studentId = str(body.studentId);
    const month = str(body.month);
    if (!studentId || !MONTH_RE.test(month)) return fail("Data laporan tidak lengkap.");
    if (!(await studentInScope(env, resolveScope(user, url), studentId))) {
      return fail("Siswa ini bukan bagian dari kelas Anda.", 403);
    }
    const existing = await env.DB.prepare(
      "SELECT token FROM share_links WHERE student_id = ? AND month = ?",
    )
      .bind(studentId, month)
      .first<{ token: string }>();
    if (existing) return json({ token: existing.token });
    const token = randomToken(16);
    await env.DB.prepare(
      "INSERT INTO share_links (token, student_id, month, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(token, studentId, month, nowISO())
      .run();
    return json({ token }, 201);
  }

  if (path === "/api/share" && method === "DELETE") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = str(body.token);
    if (!token) return fail("Token tidak valid.");
    await env.DB.prepare("DELETE FROM share_links WHERE token = ?").bind(token).run();
    return json({ ok: true });
  }

  /* -------------------------------- demo data -------------------------------- */
  if (path === "/api/demo" && method === "POST") {
    if (user.role !== "admin") return fail("Khusus admin.", 403);
    const year = await getActiveYear(env);
    if (!year) return fail("Belum ada tahun ajaran.");
    const students = await listStudentRows(env, resolveScope(user, url).classId);
    if (!students.length) return fail("Belum ada siswa.");

    const months: string[] = [];
    let cursor = year.startMonth;
    while (cursor <= year.endMonth) {
      months.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    const targetMonth = months.includes(currentMonth()) ? currentMonth() : months[months.length - 1];
    const daysInMonth = new Date(
      Number(targetMonth.slice(0, 4)),
      Number(targetMonth.slice(5, 7)),
      0,
    ).getDate();
    const stmt = env.DB.prepare(
      `INSERT INTO entries (id, student_id, academic_year_id, date, juz, page_start, page_end, note, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const batch = [];
    for (const [index, student] of students.entries()) {
      let juz = JUZ_ORDER[index % JUZ_ORDER.length];
      let page = 1 + (index % 5);
      for (let session = 0; session < 4; session++) {
        const day = Math.min(daysInMonth, 3 + session * 6 + (index % 4));
        const pages = 1 + ((index + session) % 2);
        let pageEnd = page + pages - 1;
        if (pageEnd > pagesInJuz(juz)) {
          juz = JUZ_ORDER[Math.max(0, JUZ_ORDER.indexOf(juz) - 1)] ?? juz;
          page = 1;
          pageEnd = Math.min(pagesInJuz(juz), pages);
        }
        batch.push(
          stmt.bind(
            uid(),
            student.id,
            year.id,
            `${targetMonth}-${String(day).padStart(2, "0")}`,
            juz,
            page,
            pageEnd,
            "",
            nowISO(),
            user.id,
          ),
        );
        page = pageEnd + 1;
      }
    }
    await env.DB.batch(batch);
    return json({ inserted: batch.length });
  }

  if (path === "/api/demo" && method === "DELETE") {
    await env.DB.prepare("DELETE FROM entries").run();
    return json({ ok: true });
  }

  return fail("Endpoint tidak ditemukan.", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        await ensureSchema(env);
        return await handleApi(request, env, url);
      } catch (error) {
        console.error("API error", error);
        return json({ error: "Terjadi kesalahan pada server." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
