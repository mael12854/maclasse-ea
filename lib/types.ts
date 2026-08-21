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

export type Appreciation = {
  id: string;
  student_id: string;
  class_id: string;
  subject: string;
  trimestre: number;
  comment: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export const NIVEAUX = [
  { value: 1, symbol: "①", label: "Non atteint" },
  { value: 2, symbol: "②", label: "Partiellement atteint" },
  { value: 3, symbol: "③", label: "Atteint" },
  { value: 4, symbol: "④", label: "Excellente maîtrise" },
] as const;

export function niveauInfo(value: number) {
  return NIVEAUX.find((n) => n.value === Math.round(value)) ?? NIVEAUX[0];
}

export function currentTrimestre(): (typeof TRIMESTRES)[number] {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 9 || month === 8) return 1;
  if (month <= 3) return 2;
  return 3;
}
