import { createClient } from "@/lib/supabase/server";
import { upsertBulletinEntry } from "@/lib/actions";
import { getChildren, pickChild } from "@/lib/parent";
import { TRIMESTRES, currentTrimestre, levelInfo } from "@/lib/types";
import type { BulletinEntry, ClassRow, GradeLevel, Profile, TeacherClass } from "@/lib/types";
import NiveauSelect from "@/components/NiveauSelect";
import PrintButton from "@/components/PrintButton";

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
  searchParams: Promise<{ trimestre?: string; class_id?: string; student_id?: string; child_id?: string }>;
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

  const { data: levelsData } = await supabase
    .from("grade_levels")
    .select("*")
    .order("value")
    .returns<GradeLevel[]>();
  const levels = levelsData ?? [];

  const trimestreTabs = (base: Record<string, string | undefined>) => (
    <div className="print:hidden flex gap-2">
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

  // --- Élève : son propre bulletin, lecture seule ---
  if (profile.role === "eleve") {
    if (!profile.class_id) {
      return <p className="text-sm text-ardoise">Aucune classe assignée pour l&apos;instant.</p>;
    }

    const { data: classRow } = await supabase
      .from("classes")
      .select("*")
      .eq("id", profile.class_id)
      .single<ClassRow>();

    const { data: teacherSubjects } = await supabase
      .from("teacher_classes")
      .select("subject")
      .eq("class_id", profile.class_id);

    const { data: entries } = await supabase
      .from("bulletin_entries")
      .select("*")
      .eq("student_id", profile.id)
      .eq("trimestre", trimestre)
      .returns<BulletinEntry[]>();

    const subjects = [
      ...new Set([...(teacherSubjects ?? []).map((t) => t.subject), ...(entries ?? []).map((e) => e.subject)]),
    ].sort();

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-encre">Bulletin</h1>
            <p className="text-sm text-ardoise">
              {classRow?.name} — Trimestre {trimestre}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {trimestreTabs({})}
            <PrintButton />
          </div>
        </div>

        <BulletinTable
          subjects={subjects}
          entries={entries ?? []}
          levels={levels}
          editableSubjects={new Set()}
          formContext={null}
        />
      </div>
    );
  }

  // --- Parent : bulletin d'un de ses enfants, lecture seule ---
  if (profile.role === "parent") {
    const children = await getChildren(supabase, profile.id);
    const selectedChild = pickChild(children, sp.child_id);

    if (!selectedChild) {
      return <p className="text-sm text-ardoise">Aucun enfant rattaché pour l&apos;instant.</p>;
    }
    if (!selectedChild.class_id) {
      return <p className="text-sm text-ardoise">Aucune classe assignée pour l&apos;instant.</p>;
    }

    const { data: classRow } = await supabase
      .from("classes")
      .select("*")
      .eq("id", selectedChild.class_id)
      .single<ClassRow>();

    const { data: teacherSubjects } = await supabase
      .from("teacher_classes")
      .select("subject")
      .eq("class_id", selectedChild.class_id);

    const { data: entries } = await supabase
      .from("bulletin_entries")
      .select("*")
      .eq("student_id", selectedChild.id)
      .eq("trimestre", trimestre)
      .returns<BulletinEntry[]>();

    const subjects = [
      ...new Set([...(teacherSubjects ?? []).map((t) => t.subject), ...(entries ?? []).map((e) => e.subject)]),
    ].sort();

    const baseParams = { child_id: selectedChild.id };

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-encre">
              Bulletin — {selectedChild.full_name}
            </h1>
            <p className="text-sm text-ardoise">
              {classRow?.name} — Trimestre {trimestre}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {trimestreTabs(baseParams)}
            <PrintButton />
          </div>
        </div>

        {children.length > 1 && (
          <form action="/bulletin" className="print:hidden flex items-end gap-2">
            <input type="hidden" name="trimestre" value={trimestre} />
            <select
              name="child_id"
              defaultValue={selectedChild.id}
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

        <BulletinTable
          subjects={subjects}
          entries={entries ?? []}
          levels={levels}
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

  const selectedClassId =
    sp.class_id && classOptions.some((c) => c.id === sp.class_id) ? sp.class_id : classOptions[0].id;
  const selectedClass = classOptions.find((c) => c.id === selectedClassId)!;

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

  const selectedStudentId =
    sp.student_id && students.some((s) => s.id === sp.student_id) ? sp.student_id : students[0].id;
  const selectedStudent = students.find((s) => s.id === selectedStudentId)!;

  const { data: classTeacherSubjects } = await supabase
    .from("teacher_classes")
    .select("subject")
    .eq("class_id", selectedClassId);

  const { data: entries } = await supabase
    .from("bulletin_entries")
    .select("*")
    .eq("student_id", selectedStudentId)
    .eq("trimestre", trimestre)
    .returns<BulletinEntry[]>();

  const subjects = [
    ...new Set([...(classTeacherSubjects ?? []).map((t) => t.subject), ...(entries ?? []).map((e) => e.subject)]),
  ].sort();

  const editableSubjects =
    profile.role === "admin"
      ? null // null = tout éditable
      : new Set(teacherClasses.filter((tc) => tc.class_id === selectedClassId).map((tc) => tc.subject));

  const baseParams = { class_id: selectedClassId, student_id: selectedStudentId };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-encre">Bulletin</h1>
          <p className="text-sm text-ardoise">
            {selectedStudent.full_name} — {selectedClass.name} — Trimestre {trimestre}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trimestreTabs(baseParams)}
          <PrintButton />
        </div>
      </div>

      <div className="print:hidden flex flex-wrap items-end gap-3">
        <ClassPicker classOptions={classOptions} selectedClassId={selectedClassId} trimestre={trimestre} />
        <form action="/bulletin" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="class_id" value={selectedClassId} />
          <input type="hidden" name="trimestre" value={trimestre} />
          <select
            name="student_id"
            defaultValue={selectedStudentId}
            className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
          >
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
      </div>

      <BulletinTable
        subjects={subjects}
        entries={entries ?? []}
        levels={levels}
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
      <select
        name="class_id"
        defaultValue={selectedClassId}
        className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
      >
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
  subjects,
  entries,
  levels,
  editableSubjects,
  formContext,
}: {
  subjects: string[];
  entries: BulletinEntry[];
  levels: GradeLevel[];
  editableSubjects: Set<string> | null;
  formContext: { studentId: string; classId: string; trimestre: number } | null;
}) {
  const entryBySubject = new Map(entries.map((e) => [e.subject, e]));

  if (subjects.length === 0) {
    return <p className="text-sm text-ardoise">Aucune matière enseignée dans cette classe.</p>;
  }

  return (
    <div className="overflow-x-auto">
      {formContext &&
        subjects.map((subject) => {
          const canEdit = editableSubjects === null || editableSubjects.has(subject);
          if (!canEdit) return null;
          return (
            <form
              key={subject}
              id={`bulletin-${subject}`}
              action={upsertBulletinEntry}
              className="hidden"
            >
              <input type="hidden" name="student_id" value={formContext.studentId} />
              <input type="hidden" name="class_id" value={formContext.classId} />
              <input type="hidden" name="subject" value={subject} />
              <input type="hidden" name="trimestre" value={formContext.trimestre} />
            </form>
          );
        })}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ardoise/20 text-left text-xs uppercase tracking-wide text-ardoise">
            <th className="w-1/4 py-2 pr-3">Matière</th>
            <th className="w-1/6 py-2 pr-3">Niveau</th>
            <th className="py-2">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const entry = entryBySubject.get(subject);
            const canEdit = formContext !== null && (editableSubjects === null || editableSubjects.has(subject));
            const info = levelInfo(levels, entry?.niveau ?? null);
            const formId = `bulletin-${subject}`;
            // Remonte les champs après chaque sauvegarde réussie : une
            // action de formulaire réinitialise automatiquement les
            // champs qui lui sont rattachés (même hors de son arbre DOM,
            // via l'attribut form=), donc sans ça le champ retombe à vide
            // juste après l'enregistrement bien que la valeur soit
            // correctement enregistrée en base.
            const version = entry?.updated_at ?? "empty";

            return (
              <tr key={subject} className="border-b border-ardoise/10 align-top" style={{ breakInside: "avoid" }}>
                <td className="py-3 pr-3 font-medium text-encre">{subject}</td>
                <td className="py-3 pr-3">
                  {canEdit ? (
                    <NiveauSelect
                      key={version}
                      form={formId}
                      name="niveau"
                      defaultValue={entry?.niveau ?? null}
                      levels={levels}
                    />
                  ) : null}
                  <span className={canEdit ? "hidden print:inline" : ""}>
                    {info ? `${info.symbol} ${info.label}` : "—"}
                  </span>
                </td>
                <td className="py-3">
                  {canEdit ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        key={version}
                        form={formId}
                        name="comment"
                        defaultValue={entry?.comment ?? ""}
                        placeholder="Appréciation…"
                        rows={2}
                        className="print:hidden rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
                      />
                      <button
                        form={formId}
                        className="print:hidden self-start rounded-full border border-ardoise/30 px-3 py-1 text-xs text-ardoise hover:border-rouge hover:text-rouge"
                      >
                        Enregistrer
                      </button>
                      <p className="hidden print:block">{entry?.comment || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-ardoise">{entry?.comment || "Pas d'appréciation pour l'instant."}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
