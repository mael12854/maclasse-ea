export type Role = "admin" | "prof" | "eleve";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  class_id: string | null;
  created_at: string;
};

export type ClassRow = {
  id: string;
  name: string;
  created_at: string;
};

export type TeacherClass = {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
};

export type Homework = {
  id: string;
  class_id: string;
  subject: string;
  title: string;
  description: string | null;
  due_date: string;
  attachment_path: string | null;
  created_by: string | null;
  created_at: string;
};

export type TimetableSlot = {
  id: string;
  class_id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  teacher_id: string | null;
  created_at: string;
};

export type Grade = {
  id: string;
  student_id: string;
  class_id: string;
  subject: string;
  niveau: number;
  coefficient: number;
  trimestre: number;
  comment: string | null;
  graded_at: string;
  created_by: string | null;
  created_at: string;
};

export type BulletinEntry = {
  id: string;
  student_id: string;
  class_id: string;
  subject: string;
  trimestre: number;
  niveau: number | null;
  comment: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GradeLevel = {
  value: number;
  symbol: string;
  label: string;
};

export type Absence = {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  type: "absence" | "retard";
  justifiee: boolean;
  motif: string | null;
  created_by: string | null;
  created_at: string;
};

export const DAYS_OF_WEEK = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export const TRIMESTRES = [1, 2, 3] as const;

export function levelInfo(levels: GradeLevel[], value: number | null): GradeLevel | null {
  if (value === null) return null;
  return levels.find((l) => l.value === Math.round(value)) ?? null;
}

export function currentTrimestre(): (typeof TRIMESTRES)[number] {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 9 || month === 8) return 1;
  if (month <= 3) return 2;
  return 3;
}
