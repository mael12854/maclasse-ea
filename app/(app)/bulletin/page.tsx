import { createClient } from "@/lib/supabase/server";
import { upsertAppreciation } from "@/lib/actions";
import { NIVEAUX, TRIMESTRES, currentTrimestre, niveauInfo } from "@/lib/types";
import type { Appreciation, ClassRow, Grade, Profile, TeacherClass } from "@/lib/types";

function subjectNiveau(items: Grade[]) {
  const totalCoeff = items.reduce((sum, g) => sum + g.coefficient, 0);
  if (totalCoeff === 0) return null;
  return items.reduce((sum, g) => sum + g.niveau * g.coefficient, 0) / totalCoeff;
}

function withParams(base: Record<string, string | undefined>, overrides: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v) params.set(k, v);
  }
  return `/bulletin?${params.toString()}`;
}

export default async function BulletinPage({
  searchParams,
}: {
  searchParams: Promise<{ trimestre?: string; class_id?: string; student_id?: string }>;
}) {
  const sp = await searchParams;
  const trimestre = Number(sp.trimestre ?? currentTrimestre());

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  if (!profile) return null;

  const trimestreTabs = (base: Record<string, string | undefined>) => (
    <div className="flex gap-2">
      {TRIMESTRES.map((t) => (
        <a
          key={t}
          href={withParams(base, { trimestre: String(t) })}
          className={
            t === trimestre
              ? "rounded-full bg-rouge px-3 py-1 text-xs font-medium text-blanc"
              : "rounded-full border border-ardoise/30 px-3 py-1 text-xs text-ardoise hover:border-rouge hover:text-rouge"
          }
        >
          Trimestre {t}
        </a>
      ))}
    </div>
  );

  const legend = (
    <p className="text-xs text-ardoise">
      Légende : {NIVEAUX.map((n) => `${n.symbol} ${n.label}`).join(" · ")}
    </p>
  );

  // --- Élève : son propre bulletin, lecture seule ---
  if (profile.role === "eleve") {
    if (!profile.class_id) {
      return <p className="text-sm text-ardoise">Aucune classe assignée pour l&apos;instant.</p>;
    }

    const { data: grades } = await supabase
      .from("grades")
      .select("*")
      .eq("student_id", profile.id)
      .eq("trimestre", trimestre)
      .returns<Grade[]>();

    const { data: appreciations } = await supabase
      .from("appreciations")
      .select("*")
      .eq("student_id", profile.id)
      .eq("trimestre", trimestre)
      .returns<Appreciation[]>();

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-encre">Bulletin</h1>
          {trimestreTabs({})}
        </div>
        {legend}
        <BulletinTable
          grades={grades ?? []}
          appreciations={appreciations ?? []}
          editableSubjects={new Set()}
          formContext={null}
        />
      </div>
    );
  }

  // --- Prof / Admin : choisir une classe puis un élève ---
  let classOptions: ClassRow[] = [];
  let teacherClasses: TeacherClass[] = [];

  if (profile.role === "admin") {
    const { data } = await supabase.from("classes").select("*").order("name").returns<ClassRow[]>();
    classOptions = data ?? [];
  } else {
    const { data } = await supabase
      .from("teacher_classes")
      .select("*")
      .eq("teacher_id", profile.id)
      .returns<TeacherClass[]>();
    teacherClasses = data ?? [];
    const classIds = [...new Set(teacherClasses.map((tc) => tc.class_id))];
    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .in("id", classIds)
        .order("name")
        .returns<ClassRow[]>();
      classOptions = classesData ?? [];
    }
  }

  if (classOptions.length === 0) {
    return <p className="text-sm text-ardoise">Aucune classe assignée pour l&apos;instant.</p>;
  }

  const selectedClassId = sp.class_id && classOptions.some((c) => c.id === sp.class_id)
    ? sp.class_id
    : classOptions[0].id;

  const { data: studentsInClass } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "eleve")
    .eq("class_id", selectedClassId)
    .order("full_name");

  const students = studentsInClass ?? [];

  if (students.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold text-encre">Bulletin</h1>
        <ClassPicker classOptions={classOptions} selectedClassId={selectedClassId} trimestre={trimestre} />
        <p className="text-sm text-ardoise">Aucun élève dans cette classe.</p>
      </div>
    );
  }

  const selectedStudentId = sp.student_id && students.some((s) => s.id === sp.student_id)
    ? sp.student_id
    : students[0].id;

  const { data: grades } = await supabase
    .from("grades")
    .select("*")
    .eq("student_id", selectedStudentId)
    .eq("trimestre", trimestre)
    .returns<Grade[]>();

  const { data: appreciations } = await supabase
    .from("appreciations")
    .select("*")
    .eq("student_id", selectedStudentId)
    .eq("trimestre", trimestre)
    .returns<Appreciation[]>();

  const editableSubjects =
    profile.role === "admin"
      ? null // null = tout éditable
      : new Set(
          teacherClasses
            .filter((tc) => tc.class_id === selectedClassId)
            .map((tc) => tc.subject)
        );

  const baseParams = { class_id: selectedClassId, student_id: selectedStudentId };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">Bulletin</h1>
        {trimestreTabs(baseParams)}
      </div>

      <ClassPicker classOptions={classOptions} selectedClassId={selectedClassId} trimestre={trimestre} />

      <form action="/bulletin" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="class_id" value={selectedClassId} />
        <input type="hidden" name="trimestre" value={trimestre} />
        <select name="student_id" defaultValue={selectedStudentId} className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm">
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <button className="rounded-full border border-ardoise/30 px-3 py-1.5 text-xs text-ardoise hover:border-rouge hover:text-rouge">
          Voir
        </button>
      </form>

      {legend}

      <BulletinTable
        grades={grades ?? []}
        appreciations={appreciations ?? []}
        editableSubjects={editableSubjects}
        formContext={{
          studentId: selectedStudentId,
          classId: selectedClassId,
          trimestre,
        }}
      />
    </div>
  );
}

function ClassPicker({
  classOptions,
  selectedClassId,
  trimestre,
}: {
  classOptions: ClassRow[];
  selectedClassId: string;
  trimestre: number;
}) {
  return (
    <form action="/bulletin" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="trimestre" value={trimestre} />
      <select name="class_id" defaultValue={selectedClassId} className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm">
        {classOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button className="rounded-full border border-ardoise/30 px-3 py-1.5 text-xs text-ardoise hover:border-rouge hover:text-rouge">
        Changer de classe
      </button>
    </form>
  );
}

function BulletinTable({
  grades,
  appreciations,
  editableSubjects,
  formContext,
}: {
  grades: Grade[];
  appreciations: Appreciation[];
  editableSubjects: Set<string> | null;
  formContext: { studentId: string; classId: string; trimestre: number } | null;
}) {
  const gradesBySubject = new Map<string, Grade[]>();
  for (const g of grades) {
    gradesBySubject.set(g.subject, [...(gradesBySubject.get(g.subject) ?? []), g]);
  }
  const appreciationBySubject = new Map(appreciations.map((a) => [a.subject, a.comment]));

  const subjects = [...new Set([...gradesBySubject.keys(), ...appreciationBySubject.keys()])].sort();

  if (subjects.length === 0) {
    return <p className="text-sm text-ardoise">Aucune évaluation pour ce trimestre.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {subjects.map((subject) => {
        const subjectGrades = gradesBySubject.get(subject) ?? [];
        const niveau = subjectNiveau(subjectGrades);
        const comment = appreciationBySubject.get(subject) ?? "";
        const canEdit = editableSubjects === null || editableSubjects.has(subject);

        return (
          <li key={subject} className="rounded-xl border border-ardoise/15 bg-blanc p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-wide text-rouge">{subject}</p>
              <p className="text-sm font-medium text-encre">
                {niveau !== null ? `${niveauInfo(niveau).symbol} ${niveauInfo(niveau).label}` : "—"}
              </p>
            </div>

            {formContext && canEdit ? (
              <form action={upsertAppreciation} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="student_id" value={formContext.studentId} />
                <input type="hidden" name="class_id" value={formContext.classId} />
                <input type="hidden" name="subject" value={subject} />
                <input type="hidden" name="trimestre" value={formContext.trimestre} />
                <textarea
                  name="comment"
                  defaultValue={comment}
                  placeholder="Appréciation…"
                  rows={2}
                  className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
                />
                <button className="self-start rounded-full border border-ardoise/30 px-3 py-1 text-xs text-ardoise hover:border-rouge hover:text-rouge">
                  Enregistrer
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-ardoise">
                {comment || "Pas d'appréciation pour l'instant."}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
