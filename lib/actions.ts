"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createHomework(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { error } = await supabase.from("homework").insert({
    class_id: formData.get("class_id") as string,
    subject: formData.get("subject") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    due_date: formData.get("due_date") as string,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/devoirs");
}

export async function deleteHomework(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("homework").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/devoirs");
}

export async function createGrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const studentId = formData.get("student_id") as string;
  const { data: student } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("id", studentId)
    .single();
  if (!student?.class_id) throw new Error("Élève sans classe assignée.");

  const { error } = await supabase.from("grades").insert({
    student_id: studentId,
    class_id: student.class_id,
    subject: formData.get("subject") as string,
    grade: Number(formData.get("grade")),
    max_grade: Number(formData.get("max_grade") || 20),
    coefficient: Number(formData.get("coefficient") || 1),
    comment: (formData.get("comment") as string) || null,
    graded_at: (formData.get("graded_at") as string) || new Date().toISOString().slice(0, 10),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/notes");
}

export async function deleteGrade(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
}

export async function createClassRow(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    name: formData.get("name") as string,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateProfileAssignment(formData: FormData) {
  const supabase = await createClient();
  const profileId = formData.get("profile_id") as string;
  const role = formData.get("role") as string;
  const classId = (formData.get("class_id") as string) || null;

  const { error } = await supabase
    .from("profiles")
    .update({ role, class_id: role === "eleve" ? classId : null })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createTeacherClass(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_classes").insert({
    teacher_id: formData.get("teacher_id") as string,
    class_id: formData.get("class_id") as string,
    subject: formData.get("subject") as string,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteTeacherClass(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_classes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createTimetableSlot(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_slots").insert({
    class_id: formData.get("class_id") as string,
    subject: formData.get("subject") as string,
    day_of_week: Number(formData.get("day_of_week")),
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    room: (formData.get("room") as string) || null,
    teacher_id: (formData.get("teacher_id") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/emploi-du-temps");
  revalidatePath("/admin");
}

export async function deleteTimetableSlot(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/emploi-du-temps");
  revalidatePath("/admin");
}
