import { createClient } from "@/lib/supabase/server";
import {
  createClassRow,
  createTeacherClass,
  createUser,
  deleteTeacherClass,
  updateGradeLevel,
  updateProfileAssignment,
  updateTeacherClass,
} from "@/lib/actions";
import type { ClassRow, GradeLevel, Profile, TeacherClass } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .order("name")
    .returns<ClassRow[]>();

  const { data: levels } = await supabase
    .from("grade_levels")
    .select("*")
    .order("value")
    .returns<GradeLevel[]>();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name")
    .returns<Profile[]>();

  const { data: teacherClasses } = await supabase
    .from("teacher_classes")
    .select("*, classes(name), profiles!teacher_classes_teacher_id_fkey(full_name)")
    .returns<(TeacherClass & { classes: { name: string }; profiles: { full_name: string } })[]>();

  const teachers = (profiles ?? []).filter((p) => p.role === "prof");

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-2xl font-semibold text-encre">Administration</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-encre">Barème d&apos;évaluation</h2>
        <p className="text-xs text-ardoise">
          Utilisé partout dans l&apos;app (notes, bulletin). Le symbole et le libellé sont
          personnalisables.
        </p>
        <div className="flex flex-wrap gap-2">
          {(levels ?? []).map((l) => (
            <form
              key={l.value}
              action={updateGradeLevel}
              className="flex items-center gap-2 rounded-xl border border-ardoise/15 bg-blanc p-3 text-sm"
            >
              <input type="hidden" name="value" value={l.value} />
              <input
                name="symbol"
                defaultValue={l.symbol}
                className="w-12 rounded-lg border border-ardoise/30 px-2 py-1 text-center"
              />
              <input
                name="label"
                defaultValue={l.label}
                className="w-40 rounded-lg border border-ardoise/30 px-2 py-1"
              />
              <button className="rounded-full border border-ardoise/30 px-3 py-1 text-xs text-ardoise hover:border-rouge hover:text-rouge">
                Enregistrer
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-encre">Classes</h2>
        <ul className="flex flex-wrap gap-2">
          {(classes ?? []).map((c) => (
            <li
              key={c.id}
              className="rounded-full border border-ardoise/20 bg-blanc px-3 py-1 text-sm text-encre"
            >
              {c.name}
            </li>
          ))}
        </ul>
        <form action={createClassRow} className="flex gap-2">
          <input
            name="name"
            placeholder="Nom de la classe (ex: 4e B)"
            required
            className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-rouge px-4 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Créer
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-encre">Créer un utilisateur</h2>
        <form
          action={createUser}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <label className="flex flex-col gap-1 text-sm text-encre">
            Nom complet
            <input
              name="full_name"
              required
              className="rounded-lg border border-ardoise/30 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-encre">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-lg border border-ardoise/30 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-encre">
            Mot de passe
            <input
              type="text"
              name="password"
              required
              minLength={6}
              placeholder="À communiquer à l'utilisateur"
              className="rounded-lg border border-ardoise/30 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-encre">
            Rôle
            <select name="role" defaultValue="eleve" className="rounded-lg border border-ardoise/30 px-3 py-2">
              <option value="eleve">Élève</option>
              <option value="prof">Prof</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-encre">
            Classe (si élève)
            <select name="class_id" className="rounded-lg border border-ardoise/30 px-3 py-2">
              <option value="">— pas de classe —</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full bg-rouge px-5 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Créer
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-encre">
          Utilisateurs ({profiles?.length ?? 0})
        </h2>
        <div className="flex flex-col gap-2">
          {(profiles ?? []).map((p) => (
            <form
              key={p.id}
              action={updateProfileAssignment}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ardoise/15 bg-blanc p-3 text-sm"
            >
              <input type="hidden" name="profile_id" value={p.id} />
              <span className="min-w-[160px] font-medium text-encre">{p.full_name}</span>
              <select name="role" defaultValue={p.role} className="rounded-lg border border-ardoise/30 px-2 py-1">
                <option value="eleve">Élève</option>
                <option value="prof">Prof</option>
                <option value="admin">Admin</option>
              </select>
              {p.role === "eleve" ? (
                <select name="class_id" defaultValue={p.class_id ?? ""} className="rounded-lg border border-ardoise/30 px-2 py-1">
                  <option value="">— pas de classe —</option>
                  {(classes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-ardoise">
                  Classe(s) gérée(s) via les affectations ci-dessous
                </span>
              )}
              <button className="rounded-full border border-ardoise/30 px-3 py-1 text-ardoise hover:border-rouge hover:text-rouge">
                Mettre à jour
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-encre">Affectations profs → classes</h2>
        <ul className="flex flex-col gap-2">
          {(teacherClasses ?? []).map((tc) => (
            <li
              key={tc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ardoise/15 bg-blanc p-3 text-sm"
            >
              <span className="min-w-[140px] font-medium text-encre">{tc.profiles?.full_name}</span>
              <form action={updateTeacherClass} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={tc.id} />
                <select name="class_id" defaultValue={tc.class_id} className="rounded-lg border border-ardoise/30 px-2 py-1">
                  {(classes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  name="subject"
                  defaultValue={tc.subject}
                  className="w-28 rounded-lg border border-ardoise/30 px-2 py-1"
                />
                <button className="rounded-full border border-ardoise/30 px-3 py-1 text-xs text-ardoise hover:border-rouge hover:text-rouge">
                  Mettre à jour
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await deleteTeacherClass(tc.id);
                }}
              >
                <button className="text-xs text-ardoise hover:text-rouge">Retirer</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createTeacherClass} className="flex flex-wrap items-end gap-2">
          <select name="teacher_id" required className="rounded-lg border border-ardoise/30 px-2 py-2 text-sm">
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
          <select name="class_id" required className="rounded-lg border border-ardoise/30 px-2 py-2 text-sm">
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="subject" placeholder="Matière" required className="rounded-lg border border-ardoise/30 px-2 py-2 text-sm" />
          <button
            type="submit"
            className="rounded-full bg-rouge px-4 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Affecter
          </button>
        </form>
      </section>
    </div>
  );
}
