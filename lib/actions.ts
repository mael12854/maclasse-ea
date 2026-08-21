"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function sanitizeFilename(name: string) {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  const safeBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${safeBase || "fichier"}${ext.toLowerCase()}`;
}

export async function createHomework(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { data: homework, error } = await supabase
    .from("homework")
    .insert({
      class_id: formData.get("class_id") as string,
      subject: formData.get("subject") as string,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      due_date: formData.get("due_date") as string,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const path = `${homework.id}/${sanitizeFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("devoirs").upload(path, file);
    if (uploadError) throw new Error(uploadError.message);

    const { error: updateError } = await supabase
      .from("homework")
      .update({ attachment_path: path })
      .eq("id", homework.id);
    if (updateError) throw new Error(updateError.message);
  }

  revalidatePath("/devoirs");
  redirect("/devoirs?publie=1");
}

export async function deleteHomework(id: string) {
  const supabase = await createClient();
  const { data: homework } = await supabase
    .from("homework")
    .select("attachment_path")
    .eq("id", id)
    .single();
  if (homework?.attachment_path) {
    await supabase.storage.from("devoirs").remove([homework.attachment_path]);
  }
  const { error } = await supabase.from("homework").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/devoirs");
  redirect("/devoirs?supprime=1");
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
    niveau: Number(formData.get("niveau")),
    coefficient: Number(formData.get("coefficient") || 1),
    trimestre: Number(formData.get("trimestre") || 1),
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

export async function upsertBulletinEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const niveauRaw = formData.get("niveau") as string | null;

  const { error } = await supabase.from("bulletin_entries").upsert(
    {
      student_id: formData.get("student_id") as string,
      class_id: formData.get("class_id") as string,
      subject: formData.get("subject") as string,
      trimestre: Number(formData.get("trimestre")),
      niveau: niveauRaw ? Number(niveauRaw) : null,
      comment: (formData.get("comment") as string) ?? "",
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,subject,trimestre" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/bulletin");
}

export async function updateGradeLevel(formData: FormData) {
  const supabase = await createClient();
  const value = Number(formData.get("value"));

  const { error } = await supabase
    .from("grade_levels")
    .update({
      symbol: formData.get("symbol") as string,
      label: formData.get("label") as string,
    })
    .eq("value", value);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/notes");
  revalidatePath("/bulletin");
}

export async function createUser(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Non connecté");

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
      full_name: formData.get("full_name"),
      role: formData.get("role"),
      class_id: formData.get("class_id") || null,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Erreur lors de la création de l'utilisateur.");
  }

  revalidatePath("/admin");
}

export async function createAbsence(formData: FormData) {
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

  const { error } = await supabase.from("absences").insert({
    student_id: studentId,
    class_id: student.class_id,
    date: formData.get("date") as string,
    type: formData.get("type") as string,
    justifiee: formData.get("justifiee") === "on",
    motif: (formData.get("motif") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/absences");
}

export async function deleteAbsence(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("absences").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/absences");
}

export async function setAbsenceJustification(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const justifiee = formData.get("justifiee") === "true";
  const { error } = await supabase.from("absences").update({ justifiee }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/absences");
}

export async function createParentLink(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("parent_students").insert({
    parent_id: formData.get("parent_id") as string,
    student_id: formData.get("student_id") as string,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteParentLink(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("parent_students").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const requiresResponse = formData.get("requires_response") === "on";
  const targetRoles = formData.getAll("target_roles") as string[];

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      requires_response: requiresResponse,
      target_roles: targetRoles.length > 0 ? targetRoles : ["admin", "prof", "eleve", "parent"],
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (requiresResponse) {
    const fieldRows = [1, 2, 3, 4, 5, 6]
      .map((i) => ({
        label: ((formData.get(`field_label_${i}`) as string) || "").trim(),
        field_type: (formData.get(`field_type_${i}`) as string) || "text",
        position: i,
      }))
      .filter((f) => f.label.length > 0);

    if (fieldRows.length > 0) {
      const { error: fieldsError } = await supabase.from("document_fields").insert(
        fieldRows.map((f) => ({
          document_id: doc.id,
          label: f.label,
          field_type: f.field_type,
          position: f.position,
        }))
      );
      if (fieldsError) throw new Error(fieldsError.message);
    }
  }

  revalidatePath("/documents");
}

export async function deleteDocument(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

export async function submitDocumentResponse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const documentId = formData.get("document_id") as string;
  const { data: fields } = await supabase
    .from("document_fields")
    .select("*")
    .eq("document_id", documentId);

  const answers: Record<string, string | boolean> = {};
  for (const f of fields ?? []) {
    if (f.field_type === "checkbox") {
      answers[f.id] = formData.get(`field_${f.id}`) === "on";
    } else {
      answers[f.id] = (formData.get(`field_${f.id}`) as string) || "";
    }
  }

  const { error } = await supabase.from("document_responses").upsert(
    {
      document_id: documentId,
      responder_id: user.id,
      answers,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "document_id,responder_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/documents");
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

export async function updateTeacherClass(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("teacher_classes")
    .update({
      class_id: formData.get("class_id") as string,
      subject: formData.get("subject") as string,
    })
    .eq("id", id);
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
