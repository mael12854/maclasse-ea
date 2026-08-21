"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Si l'événement est déjà passé au moment du montage, vérifie s'il y a
    // quand même une session active issue du lien de réinitialisation.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-craie px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold">
          <span className="text-encre">MaClasse </span>
          <span className="text-rouge">EA</span>
        </h1>

        {done ? (
          <>
            <p className="mt-1 text-sm text-ardoise">Mot de passe mis à jour.</p>
            <button
              onClick={() => router.push("/connexion")}
              className="mt-4 rounded-full bg-rouge px-5 py-2.5 text-sm font-medium text-blanc transition-colors hover:opacity-90"
            >
              Se connecter
            </button>
          </>
        ) : !ready ? (
          <p className="mt-1 text-sm text-ardoise">
            Ce lien n&apos;est plus valide ou a déjà été utilisé. Redemande un lien depuis la page
            de connexion.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ardoise">Choisis un nouveau mot de passe.</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-encre">
                Nouveau mot de passe
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-ardoise/30 bg-blanc px-3 py-2 text-encre outline-none focus:border-rouge"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-encre">
                Confirmer le mot de passe
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="rounded-lg border border-ardoise/30 bg-blanc px-3 py-2 text-encre outline-none focus:border-rouge"
                />
              </label>

              {error && <p className="text-sm text-rouge">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-full bg-rouge px-5 py-2.5 text-sm font-medium text-blanc transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "…" : "Enregistrer"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
