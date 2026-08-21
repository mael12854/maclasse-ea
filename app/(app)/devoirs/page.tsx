import { createClient } from "@/lib/supabase/server";
import { createHomework, deleteHomework } from "@/lib/actions";
import type { ClassRow, Homework, Profile, TeacherClass } from "@/lib/types";

export default async function DevoirsPage({
  searchParams,
}: {
  searchParams: Promise<{ publie?: string; supprime?: string }>;
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

  const { data: homework } = await supabase
    .from("homework")
    .select("*")
    .order("due_date", { ascending: true })
    .returns<Homework[]>();

  const attachmentUrls = new Map<string, string>();
  for (const hw of homework ?? []) {
    if (!hw.attachment_path) continue;
    const { data } = await supabase.storage
      .from("devoirs")
      .createSignedUrl(hw.attachment_path, 60 * 60);
    if (data?.signedUrl) attachmentUrls.set(hw.id, data.signedUrl);
  }

  const canPost = profile?.role === "admin" || profile?.role === "prof";

  let classOptions: ClassRow[] = [];
  let teacherClasses: (TeacherClass & { classes: { name: string } })[] = [];

  if (profile?.role === "admin") {
    const { data } = await supabase.from("classes").select("*").order("name");
    classOptions = data ?? [];
  } else if (profile?.role === "prof") {
    const { data } = await supabase
      .from("teacher_classes")
      .select("*, classes(name)")
      .eq("teacher_id", profile.id);
    teacherClasses = (data as (TeacherClass & { classes: { name: string } })[]) ?? [];
  }

  const { data: classesById } = await supabase.from("classes").select("id, name");
  const classNames = new Map((classesById ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-encre">Devoirs</h1>

      {sp.publie && (
        <p className="rounded-lg bg-vert/10 px-3 py-2 text-sm text-vert">Devoir publié.</p>
      )}
      {sp.supprime && (
        <p className="rounded-lg bg-vert/10 px-3 py-2 text-sm text-vert">Devoir supprimé.</p>
      )}

      {canPost && (
        <form
          action={createHomework}
          className="flex flex-col gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <h2 className="text-sm font-medium text-ardoise">Ajouter un devoir</h2>

          {profile?.role === "admin" ? (
            <div className="grid grid-cols-2 gap-3">
              <select name="class_id" required className="rounded-lg border border-ardoise/30 px-3 py-2">
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                name="subject"
                placeholder="Matière"
                required
                className="rounded-lg border border-ardoise/30 px-3 py-2"
              />
            </div>
          ) : null}

          {profile?.role === "prof" &&
            (teacherClasses.length === 0 ? (
              <p className="text-sm text-ardoise">
                Aucune classe ne t&apos;a encore été assignée — demande à l&apos;admin.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <select name="class_id" required className="rounded-lg border border-ardoise/30 px-3 py-2">
                  {[...new Map(teacherClasses.map((tc) => [tc.class_id, tc])).values()].map(
                    (tc) => (
                      <option key={tc.class_id} value={tc.class_id}>
                        {tc.classes?.name}
                      </option>
                    )
                  )}
                </select>
                <select name="subject" required className="rounded-lg border border-ardoise/30 px-3 py-2">
                  {[...new Set(teacherClasses.map((tc) => tc.subject))].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ))}

          <input
            name="title"
            placeholder="Titre (ex: Exercices 3 et 4 p.42)"
            required
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <textarea
            name="description"
            placeholder="Détails (optionnel)"
            rows={2}
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm text-ardoise">
            Pour le
            <input
              type="date"
              name="due_date"
              required
              className="rounded-lg border border-ardoise/30 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ardoise">
            Pièce jointe (optionnel)
            <input type="file" name="attachment" className="text-sm" />
          </label>
          <button
            type="submit"
            className="mt-1 self-start rounded-full bg-rouge px-5 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Publier
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-3">
        {(homework ?? []).map((hw) => (
          <li
            key={hw.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-ardoise/15 bg-blanc p-4"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-rouge">
                {hw.subject} · {classNames.get(hw.class_id) ?? ""} · pour le{" "}
                {new Date(hw.due_date).toLocaleDateString("fr-FR")}
              </p>
              <p className="mt-1 font-medium text-encre">{hw.title}</p>
              {hw.description && (
                <p className="mt-1 text-sm text-ardoise">{hw.description}</p>
              )}
              {attachmentUrls.has(hw.id) && (
                <a
                  href={attachmentUrls.get(hw.id)}
                  className="mt-1 inline-block text-sm text-rouge underline underline-offset-2"
                >
                  Pièce jointe
                </a>
              )}
            </div>
            {(profile?.role === "admin" || hw.created_by === profile?.id) && (
              <form
                action={async () => {
                  "use server";
                  await deleteHomework(hw.id);
                }}
              >
                <button className="text-xs text-ardoise hover:text-rouge">Supprimer</button>
              </form>
            )}
          </li>
        ))}
        {(homework ?? []).length === 0 && (
          <p className="text-sm text-ardoise">Aucun devoir pour l&apos;instant.</p>
        )}
      </ul>
    </div>
  );
}
