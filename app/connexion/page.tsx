"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/devoirs";

  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou mot de passe incorrect.");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-craie px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold">
          <span className="text-encre">MaClasse </span>
          <span className="text-rouge">EA</span>
        </h1>
        <p className="mt-1 text-sm text-ardoise">
          {mode === "connexion"
            ? "Connecte-toi pour accéder à ta classe."
            : "Crée ton compte, un admin te rattachera à ta classe."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "inscription" && (
            <label className="flex flex-col gap-1 text-sm text-encre">
              Nom complet
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-ardoise/30 bg-blanc px-3 py-2 text-encre outline-none focus:border-rouge"
              />
            </label>
          )}
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
          <label className="flex flex-col gap-1 text-sm text-encre">
            Mot de passe
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-ardoise/30 bg-blanc px-3 py-2 text-encre outline-none focus:border-rouge"
            />
          </label>

          {error && <p className="text-sm text-rouge">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-rouge px-5 py-2.5 text-sm font-medium text-blanc transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? "…"
              : mode === "connexion"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        {mode === "connexion" && (
          <Link
            href="/mot-de-passe-oublie"
            className="mt-3 block text-sm text-ardoise underline underline-offset-2"
          >
            Mot de passe oublié ?
          </Link>
        )}

        <button
          type="button"
          onClick={() =>
            setMode(mode === "connexion" ? "inscription" : "connexion")
          }
          className="mt-4 text-sm text-ardoise underline underline-offset-2"
        >
          {mode === "connexion"
            ? "Pas encore de compte ? S'inscrire"
            : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
