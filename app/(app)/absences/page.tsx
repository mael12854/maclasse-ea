import { createClient } from "@/lib/supabase/server";
import { createAbsence, deleteAbsence, setAbsenceJustification } from "@/lib/actions";
import { getChildren, pickChild } from "@/lib/parent";
import type { Absence, Profile } from "@/lib/types";

export default async function AbsencesPage({
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

  const { data: classesById } = await supabase.from("classes").select("id, name");
  const classNames = new Map((classesById ?? []).map((c) => [c.id, c.name]));

  const canPost = profile?.role === "admin" || profile?.role === "prof";
  let absences: Absence[] = [];
  let students: { id: string; full_name: string; class_id: string | null }[] = [];
  let children: { id: string; full_name: string; class_id: string | null }[] = [];
  let selectedChild: { id: string; full_name: string; class_id: string | null } | null = null;

  if (profile?.role === "eleve") {
    const { data } = await supabase
      .from("absences")
      .select("*")
      .eq("student_id", profile.id)
      .order("date", { ascending: false })
      .returns<Absence[]>();
    absences = data ?? [];
  } else if (profile?.role === "prof") {
    const { data: tcData } = await supabase
      .from("teacher_classes")
      .select("class_id")
      .eq("teacher_id", profile.id);
    const classIds = [...new Set((tcData ?? []).map((tc) => tc.class_id))];
    if (classIds.length > 0) {
      const { data: s } = await supabase
        .from("profiles")
        .select("id, full_name, class_id")
        .eq("role", "eleve")
        .in("class_id", classIds);
      students = s ?? [];

      const { data } = await supabase
        .from("absences")
        .select("*")
        .in("class_id", classIds)
        .order("date", { ascending: false })
        .returns<Absence[]>();
      absences = data ?? [];
    }
  } else if (profile?.role === "admin") {
    const { data: s } = await supabase
      .from("profiles")
      .select("id, full_name, class_id")
      .eq("role", "eleve");
    students = s ?? [];

    const { data } = await supabase
      .from("absences")
      .select("*")
      .order("date", { ascending: false })
      .returns<Absence[]>();
    absences = data ?? [];
  } else if (profile?.role === "parent") {
    children = await getChildren(supabase, profile.id);
    selectedChild = pickChild(children, sp.child_id);
    if (selectedChild) {
      const { data } = await supabase
        .from("absences")
        .select("*")
        .eq("student_id", selectedChild.id)
        .order("date", { ascending: false })
        .returns<Absence[]>();
      absences = data ?? [];
    }
  }

  const { data: profilesById } = await supabase.from("profiles").select("id, full_name");
  const studentNames = new Map((profilesById ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-encre">
        Absences{selectedChild ? ` — ${selectedChild.full_name}` : ""}
      </h1>

      {profile?.role === "parent" && children.length > 1 && (
        <form action="/absences" className="flex items-end gap-2">
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

      {canPost && (
        <form
          action={createAbsence}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <h2 className="w-full text-sm font-medium text-ardoise">Signaler une absence / un retard</h2>
          <select name="student_id" required className="rounded-lg border border-ardoise/30 px-3 py-2">
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} — {classNames.get(s.class_id ?? "") ?? ""}
              </option>
            ))}
          </select>
          <select name="type" required className="rounded-lg border border-ardoise/30 px-3 py-2">
            <option value="absence">Absence</option>
            <option value="retard">Retard</option>
          </select>
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm text-ardoise">
            <input type="checkbox" name="justifiee" />
            Justifiée
          </label>
          <input
            name="motif"
            placeholder="Motif (optionnel)"
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-full bg-rouge px-5 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Ajouter
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {absences.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-ardoise/15 bg-blanc p-4"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-rouge">
                {a.type === "absence" ? "Absence" : "Retard"}
                {profile?.role !== "eleve" && profile?.role !== "parent"
                  ? ` · ${studentNames.get(a.student_id) ?? ""}`
                  : ""}
                {" · "}
                {new Date(a.date).toLocaleDateString("fr-FR")}
              </p>
              <p className="mt-1 text-sm font-medium text-encre">
                {a.justifiee ? "Justifiée" : "Non justifiée"}
              </p>
              {a.motif && <p className="mt-1 text-sm text-ardoise">{a.motif}</p>}
            </div>
            {canPost && (
              <div className="flex items-center gap-3">
                <form action={setAbsenceJustification}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="justifiee" value={a.justifiee ? "false" : "true"} />
                  <button className="text-xs text-ardoise hover:text-rouge">
                    {a.justifiee ? "Marquer non justifiée" : "Marquer justifiée"}
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await deleteAbsence(a.id);
                  }}
                >
                  <button className="text-xs text-ardoise hover:text-rouge">Supprimer</button>
                </form>
              </div>
            )}
          </li>
        ))}
        {absences.length === 0 && (
          <p className="text-sm text-ardoise">Aucune absence pour l&apos;instant.</p>
        )}
      </ul>
    </div>
  );
}
