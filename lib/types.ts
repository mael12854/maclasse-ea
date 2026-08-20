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
  grade: number;
  max_grade: number;
  coefficient: number;
  comment: string | null;
  graded_at: string;
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
