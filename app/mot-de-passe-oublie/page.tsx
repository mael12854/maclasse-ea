"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-craie px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold">
          <span className="text-encre">MaClasse </span>
          <span className="text-rouge">EA</span>
        </h1>

        {sent ? (
          <>
            <p className="mt-1 text-sm text-ardoise">
              Si un compte existe pour <span className="font-medium text-encre">{email}</span>, un
              email avec un lien de réinitialisation vient d&apos;être envoyé.
            </p>
            <Link
              href="/connexion"
              className="mt-4 inline-block text-sm text-ardoise underline underline-offset-2"
            >
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ardoise">
              Indique ton email, on t&apos;envoie un lien pour choisir un nouveau mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-encre">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-ardoise/30 bg-blanc px-3 py-2 text-encre outline-none focus:border-rouge"
                />
              </label>

              {error && <p className="text-sm text-rouge">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-full bg-rouge px-5 py-2.5 text-sm font-medium text-blanc transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "…" : "Envoyer le lien"}
              </button>
            </form>

            <Link
              href="/connexion"
              className="mt-4 inline-block text-sm text-ardoise underline underline-offset-2"
            >
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
