import { createClient } from "@/lib/supabase/server";
import { createDocument, deleteDocument, submitDocumentResponse } from "@/lib/actions";
import type { DocumentField, DocumentResponse, DocumentRow, Profile, Role } from "@/lib/types";

const FIELD_TYPES = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "checkbox", label: "Case à cocher" },
];

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  prof: "Prof",
  eleve: "Élève",
  parent: "Parent",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  const { data: fieldsData } = await supabase
    .from("document_fields")
    .select("*")
    .order("position")
    .returns<DocumentField[]>();
  const fieldsByDoc = new Map<string, DocumentField[]>();
  for (const f of fieldsData ?? []) {
    fieldsByDoc.set(f.document_id, [...(fieldsByDoc.get(f.document_id) ?? []), f]);
  }

  const { data: myResponses } = await supabase
    .from("document_responses")
    .select("*")
    .eq("responder_id", profile!.id)
    .returns<DocumentResponse[]>();
  const myResponseByDoc = new Map((myResponses ?? []).map((r) => [r.document_id, r]));

  const allResponsesByDoc = new Map<string, DocumentResponse[]>();
  const responderNames = new Map<string, string>();
  if (profile?.role === "admin") {
    const { data: allResponses } = await supabase
      .from("document_responses")
      .select("*")
      .returns<DocumentResponse[]>();
    for (const r of allResponses ?? []) {
      allResponsesByDoc.set(r.document_id, [...(allResponsesByDoc.get(r.document_id) ?? []), r]);
    }
    const { data: profilesData } = await supabase.from("profiles").select("id, full_name");
    for (const p of profilesData ?? []) responderNames.set(p.id, p.full_name);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-encre">Documents</h1>

      {profile?.role === "admin" && (
        <form
          action={createDocument}
          className="flex flex-col gap-3 rounded-xl border border-ardoise/15 bg-blanc p-5"
        >
          <h2 className="text-sm font-medium text-ardoise">Publier un document</h2>
          <input
            name="title"
            placeholder="Titre (ex: Fiche de rentrée)"
            required
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          />
          <textarea
            name="description"
            placeholder="Description (optionnel)"
            rows={2}
            className="rounded-lg border border-ardoise/30 px-3 py-2"
          />

          <div className="flex flex-wrap items-center gap-4 text-sm text-ardoise">
            <span className="font-medium text-encre">Destinataires :</span>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input type="checkbox" name="target_roles" value={r} defaultChecked={r !== "eleve"} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-ardoise">
            <input type="checkbox" name="requires_response" />
            À remplir sur le site (formulaire)
          </label>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ardoise">
              Champs du formulaire (laisser vide si non utilisé)
            </p>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-2">
                <input
                  name={`field_label_${i}`}
                  placeholder={`Champ ${i} — libellé`}
                  className="flex-1 rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
                />
                <select
                  name={`field_type_${i}`}
                  defaultValue="text"
                  className="rounded-lg border border-ardoise/30 px-3 py-2 text-sm"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="mt-1 self-start rounded-full bg-rouge px-5 py-2 text-sm font-medium text-blanc hover:opacity-90"
          >
            Publier
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-3">
        {(documents ?? []).map((doc) => {
          const fields = fieldsByDoc.get(doc.id) ?? [];
          const myResponse = myResponseByDoc.get(doc.id);
          const responses = allResponsesByDoc.get(doc.id) ?? [];

          return (
            <li key={doc.id} className="rounded-xl border border-ardoise/15 bg-blanc p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-encre">{doc.title}</p>
                  {doc.description && <p className="mt-1 text-sm text-ardoise">{doc.description}</p>}
                </div>
                {profile?.role === "admin" && (
                  <form
                    action={async () => {
                      "use server";
                      await deleteDocument(doc.id);
                    }}
                  >
                    <button className="text-xs text-ardoise hover:text-rouge">Supprimer</button>
                  </form>
                )}
              </div>

              {doc.requires_response &&
                profile?.role !== "admin" &&
                (myResponse ? (
                  <p className="mt-3 text-sm text-vert">
                    Rempli le {new Date(myResponse.submitted_at).toLocaleDateString("fr-FR")}
                  </p>
                ) : (
                  <form action={submitDocumentResponse} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="document_id" value={doc.id} />
                    {fields.map((f) => (
                      <label key={f.id} className="flex flex-col gap-1 text-sm text-encre">
                        {f.label}
                        {f.field_type === "textarea" ? (
                          <textarea
                            name={`field_${f.id}`}
                            rows={2}
                            className="rounded-lg border border-ardoise/30 px-3 py-2"
                          />
                        ) : f.field_type === "checkbox" ? (
                          <input type="checkbox" name={`field_${f.id}`} className="self-start" />
                        ) : (
                          <input
                            name={`field_${f.id}`}
                            className="rounded-lg border border-ardoise/30 px-3 py-2"
                          />
                        )}
                      </label>
                    ))}
                    <button
                      type="submit"
                      className="mt-1 self-start rounded-full bg-rouge px-4 py-2 text-xs font-medium text-blanc hover:opacity-90"
                    >
                      Envoyer
                    </button>
                  </form>
                ))}

              {profile?.role === "admin" && doc.requires_response && (
                <div className="mt-3 text-sm text-ardoise">
                  <p className="font-medium text-encre">{responses.length} réponse(s)</p>
                  {responses.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-1">
                      {responses.map((r) => (
                        <li key={r.id} className="text-xs">
                          {responderNames.get(r.responder_id) ?? "?"} —{" "}
                          {new Date(r.submitted_at).toLocaleDateString("fr-FR")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {(documents ?? []).length === 0 && (
          <p className="text-sm text-ardoise">Aucun document pour l&apos;instant.</p>
        )}
      </ul>
    </div>
  );
}
