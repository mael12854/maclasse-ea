import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Absence, DocumentResponse, DocumentRow, Homework, Profile } from "@/lib/types";

export default async function AccueilPage() {
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

  const { data: profilesById } = await supabase.from("profiles").select("id, full_name");
  const studentNames = new Map((profilesById ?? []).map((p) => [p.id, p.full_name]));

  const today = new Date().toISOString().slice(0, 10);

  const { data: homework } = await supabase
    .from("homework")
    .select("*")
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(5)
    .returns<Homework[]>();

  const { data: absences } = await supabase
    .from("absences")
    .select("*")
    .order("date", { ascending: false })
    .limit(5)
    .returns<Absence[]>();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  let pendingDocuments: DocumentRow[] = [];
  if (profile?.role !== "admin") {
    const { data: myResponses } = await supabase
      .from("document_responses")
      .select("document_id")
      .eq("responder_id", profile!.id)
      .returns<Pick<DocumentResponse, "document_id">[]>();
    const answeredIds = new Set((myResponses ?? []).map((r) => r.document_id));
    pendingDocuments = (documents ?? []).filter((d) => d.requires_response && !answeredIds.has(d.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-encre">
          Bonjour {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ardoise">Voici l&apos;essentiel du moment.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-xl border border-ardoise/15 bg-blanc p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-encre">Prochains devoirs</h2>
            <Link href="/devoirs" className="text-xs text-ardoise hover:text-rouge">
              Tout voir
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {(homework ?? []).map((hw) => (
              <li key={hw.id} className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-rouge">
                  {hw.subject} · {classNames.get(hw.class_id) ?? ""} ·{" "}
                  {new Date(hw.due_date).toLocaleDateString("fr-FR")}
                </p>
                <p className="text-encre">{hw.title}</p>
              </li>
            ))}
            {(homework ?? []).length === 0 && (
              <p className="text-sm text-ardoise">Rien de prévu.</p>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-ardoise/15 bg-blanc p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-encre">
              {profile?.role === "admin" ? "Documents" : "Documents en attente"}
            </h2>
            <Link href="/documents" className="text-xs text-ardoise hover:text-rouge">
              Tout voir
            </Link>
          </div>
          {profile?.role === "admin" ? (
            <p className="text-sm text-ardoise">{(documents ?? []).length} document(s) publié(s).</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingDocuments.map((d) => (
                <li key={d.id} className="text-sm">
                  <p className="text-encre">{d.title}</p>
                  {d.description && <p className="text-xs text-ardoise">{d.description}</p>}
                </li>
              ))}
              {pendingDocuments.length === 0 && (
                <p className="text-sm text-ardoise">Rien en attente.</p>
              )}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-ardoise/15 bg-blanc p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-encre">Absences récentes</h2>
            <Link href="/absences" className="text-xs text-ardoise hover:text-rouge">
              Tout voir
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {(absences ?? []).map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-rouge">
                  {a.type === "absence" ? "Absence" : "Retard"}
                  {profile?.role !== "eleve" ? ` · ${studentNames.get(a.student_id) ?? ""}` : ""}
                  {" · "}
                  {new Date(a.date).toLocaleDateString("fr-FR")}
                </p>
                <p className="text-encre">{a.justifiee ? "Justifiée" : "Non justifiée"}</p>
              </li>
            ))}
            {(absences ?? []).length === 0 && (
              <p className="text-sm text-ardoise">Rien à signaler.</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
