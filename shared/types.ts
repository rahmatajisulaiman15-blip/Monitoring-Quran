export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "teacher";
  classId: string | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  label: string;
  grade: number;
  parallel: string;
  students: number;
  teacher: { id: string; name: string; email: string } | null;
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  classId: string | null;
  className: string | null;
}

export interface Settings {
  madrasah: string;
  className: string;
  teacherName: string;
  activeYearId: string | null;
}

export interface AcademicYear {
  id: string;
  label: string;
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
}

export interface JuzProgress {
  juz: number;
  page: number;
  total: number;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  active: boolean;
  sortOrder: number;
  monthPages: number;
  yearPages: number;
  monthEntries: number;
  lastDate: string | null;
  juzProgress: JuzProgress[];
}

export interface DailyRow {
  date: string;
  pages: number;
  entries: number;
  students: { id: string; name: string; pages: number }[];
}

export interface MonthPoint {
  month: string;
  pages: number;
}

export interface Summary {
  settings: Settings;
  className?: string;
  currentClass?: { id: string; name: string; grade: number; parallel: string } | null;
  years: AcademicYear[];
  activeYear: AcademicYear | null;
  month: string;
  students: Student[];
  monthTotals: {
    pages: number;
    entries: number;
    students: number;
    activeDays: number;
  };
  yearTotals: { pages: number; entries: number };
  daily: DailyRow[];
  monthly: MonthPoint[];
  juzTotals: { juz: number; pages: number }[];
}

export interface Entry {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  juz: number;
  pageStart: number;
  pageEnd: number;
  pages: number;
  note: string;
  createdAt: string;
}

export interface EntriesResponse {
  entries: Entry[];
  students: { id: string; name: string }[];
  month: string;
  totals: { pages: number; entries: number };
}

export interface StudentReport {
  student: {
    id: string;
    name: string;
    className: string;
    createdAt: string;
  };
  settings: Settings;
  year: AcademicYear | null;
  month: string;
  monthPages: number;
  monthEntries: number;
  yearPages: number;
  yearEntryCount: number;
  totalPages: number;
  juzProgress: JuzProgress[];
  monthly: MonthPoint[];
  entries: Entry[];
  yearEntries: Entry[];
}

export interface PublicReport {
  madrasah: string;
  className: string;
  teacherName: string;
  yearLabel: string;
  month: string;
  studentName: string;
  monthPages: number;
  monthEntries: number;
  yearPages: number;
  totalPages: number;
  juzProgress: JuzProgress[];
  monthly: MonthPoint[];
  entries: {
    date: string;
    juz: number;
    pageStart: number;
    pageEnd: number;
    pages: number;
    note: string;
  }[];
  generatedAt: string;
}
