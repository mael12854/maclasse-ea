import { createClient } from "@/lib/supabase/server";
import { createGrade, deleteGrade } from "@/lib/actions";
import { getChildren, pickChild } from "@/lib/parent";
import { TRIMESTRES, currentTrimestre, levelInfo } from "@/lib/types";
import type { Grade, GradeLevel, Profile, TeacherClass } from "@/lib/types";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: levelsData } = await supabase
    .from("grade_levels")
    .select("*")
    .order("value")
    .returns<GradeLevel[]>();
  const levels = levelsData ?? [];

  const children = profile?.role === "parent" ? await getChildren(supabase, profile.id) : [];
  const selectedChild = profile?.role === "parent" ? pickChild(children, sp.child_id) : null;

  let gradesQuery = supabase.from("grades").select("*").order("graded_at", { ascending: false });
  if (profile?.role === "parent") {
    gradesQuery = selectedChild
      ? gradesQuery.eq("student_id", selectedChild.id)
      : gradesQuery.eq("student_id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: grades } = await gradesQuery.returns<Grade[]>();

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

  const showsOwnAverage = profile?.role === "eleve" || (profile?.role === "parent" && selectedChild);
  const overall =
    showsOwnAverage && grades && grades.length > 0
      ? grades.reduce((sum, g) => sum + g.niveau * g.coefficient, 0) /
        grades.reduce((sum, g) => sum + g.coefficient, 0)
      : null;
  const overallInfo = overall !== null ? levelInfo(levels, overall) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">
          Notes{selectedChild ? ` — ${selectedChild.full_name}` : ""}
        </h1>
        {overallInfo && (
          <p className="text-sm text-ardoise">
            Niveau général :{" "}
            <span className="font-semibold text-rouge">
              {overallInfo.symbol} {overallInfo.label}
            </span>
          </p>
        )}
      </div>

      {profile?.role === "parent" && children.length > 1 && (
        <form action="/notes" className="flex items-end gap-2">
          <select
            name="child_id"
            defaultValue={selectedChild?.id}
            className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
          <button className="rounded-full border border-ardoise/30 px-3 py-1.5 text-xs text-ardoise hover:border-rouge hover:text-rouge">
            Voir
          </button>
        </form>
      )}

      {profile?.role === "parent" && children.length === 0 && (
        <p className="text-sm text-ardoise">Aucun enfant rattaché pour l&apos;instant.</p>
      )}

      <p className="text-xs text-ardoise">
        Légende : {levels.map((n) => `${n.symbol} ${n.label}`).join(" · ")}
      </p>

      {canPost && (
        <form
          action={createGrade}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <h2 className="w-full text-sm font-medium text-ardoise">Ajouter une évaluation</h2>
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
          <select name="niveau" required className="rounded-lg border border-ardoise/30 px-3 py-2">
            {levels.map((n) => (
              <option key={n.value} value={n.value}>
                {n.symbol} {n.label}
              </option>
            ))}
          </select>
          <select
            name="trimestre"
            defaultValue={currentTrimestre()}
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          >
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>
                Trimestre {t}
              </option>
            ))}
          </select>
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
                {profile?.role !== "eleve" && profile?.role !== "parent"
                  ? ` · ${studentNames.get(g.student_id) ?? ""}`
                  : ""}
                {` · T${g.trimestre} · `}
                {new Date(g.graded_at).toLocaleDateString("fr-FR")}
              </p>
              <p className="mt-1 font-medium text-encre">
                {(() => {
                  const info = levelInfo(levels, g.niveau);
                  return info ? `${info.symbol} ${info.label}` : "—";
                })()}{" "}
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
          <p className="text-sm text-ardoise">Aucune évaluation pour l&apos;instant.</p>
        )}
      </ul>
    </div>
  );
}
