import { createClient } from "@/lib/supabase/server";
import { createGrade, deleteGrade } from "@/lib/actions";
import type { Grade, Profile, TeacherClass } from "@/lib/types";

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: grades } = await supabase
    .from("grades")
    .select("*")
    .order("graded_at", { ascending: false })
    .returns<Grade[]>();

  const { data: classesById } = await supabase.from("classes").select("id, name");
  const classNames = new Map((classesById ?? []).map((c) => [c.id, c.name]));

  const { data: profilesById } = await supabase.from("profiles").select("id, full_name");
  const studentNames = new Map((profilesById ?? []).map((p) => [p.id, p.full_name]));

  const canPost = profile?.role === "admin" || profile?.role === "prof";
  let teacherClasses: (TeacherClass & { classes: { name: string } })[] = [];
  let students: { id: string; full_name: string; class_id: string | null }[] = [];

  if (profile?.role === "prof") {
    const { data } = await supabase
      .from("teacher_classes")
      .select("*, classes(name)")
      .eq("teacher_id", profile.id);
    teacherClasses = (data as (TeacherClass & { classes: { name: string } })[]) ?? [];
    const classIds = [...new Set(teacherClasses.map((tc) => tc.class_id))];
    if (classIds.length > 0) {
      const { data: s } = await supabase
        .from("profiles")
        .select("id, full_name, class_id")
        .eq("role", "eleve")
        .in("class_id", classIds);
      students = s ?? [];
    }
  } else if (profile?.role === "admin") {
    const { data: s } = await supabase
      .from("profiles")
      .select("id, full_name, class_id")
      .eq("role", "eleve");
    students = s ?? [];
  }

  const average =
    profile?.role === "eleve" && grades && grades.length > 0
      ? (
          grades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 20 * g.coefficient, 0) /
          grades.reduce((sum, g) => sum + g.coefficient, 0)
        ).toFixed(2)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">Notes</h1>
        {average && (
          <p className="text-sm text-ardoise">
            Moyenne générale : <span className="font-semibold text-rouge">{average}/20</span>
          </p>
        )}
      </div>

      {canPost && (
        <form
          action={createGrade}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <h2 className="w-full text-sm font-medium text-ardoise">Ajouter une note</h2>
          <select name="student_id" required className="rounded-lg border border-ardoise/30 px-3 py-2">
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} — {classNames.get(s.class_id ?? "") ?? ""}
              </option>
            ))}
          </select>
          {profile?.role === "prof" ? (
            <select name="subject" required className="rounded-lg border border-ardoise/30 px-3 py-2">
              {[...new Set(teacherClasses.map((tc) => tc.subject))].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input name="subject" placeholder="Matière" required className="rounded-lg border border-ardoise/30 px-3 py-2" />
          )}
          <input
            type="number"
            step="0.25"
            name="grade"
            placeholder="Note"
            required
            className="w-24 rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <input
            type="number"
            step="0.5"
            name="max_grade"
            placeholder="Sur"
            defaultValue={20}
            className="w-20 rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <input
            type="number"
            step="0.5"
            name="coefficient"
            placeholder="Coeff"
            defaultValue={1}
            className="w-20 rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <input type="date" name="graded_at" className="rounded-lg border border-ardoise/30 px-3 py-2" />
          <input name="comment" placeholder="Commentaire (optionnel)" className="rounded-lg border border-ardoise/30 px-3 py-2" />
          <button
            type="submit"
            className="rounded-full bg-rouge px-5 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Ajouter
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {(grades ?? []).map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-ardoise/15 bg-blanc p-4"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-rouge">
                {g.subject}
                {profile?.role !== "eleve" ? ` · ${studentNames.get(g.student_id) ?? ""}` : ""}
                {" · "}
                {new Date(g.graded_at).toLocaleDateString("fr-FR")}
              </p>
              <p className="mt-1 font-medium text-encre">
                {g.grade}/{g.max_grade}{" "}
                <span className="text-sm font-normal text-ardoise">coeff. {g.coefficient}</span>
              </p>
              {g.comment && <p className="mt-1 text-sm text-ardoise">{g.comment}</p>}
            </div>
            {(profile?.role === "admin" || g.created_by === profile?.id) && (
              <form
                action={async () => {
                  "use server";
                  await deleteGrade(g.id);
                }}
              >
                <button className="text-xs text-ardoise hover:text-rouge">Supprimer</button>
              </form>
            )}
          </li>
        ))}
        {(grades ?? []).length === 0 && (
          <p className="text-sm text-ardoise">Aucune note pour l&apos;instant.</p>
        )}
      </ul>
    </div>
  );
}
