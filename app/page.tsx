import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-craie">
      <header className="border-b border-ardoise/15 px-6 py-5">
        <span className="font-display text-lg font-semibold tracking-tight">
          <span className="text-encre">MaClasse </span>
          <span className="text-rouge">EA</span>
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-encre">
          Devoirs, emploi du temps et notes,
          <br />
          au même endroit.
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-ardoise">
          MaClasse EA rassemble le cahier de textes, le planning et les notes
          de ta classe à l&apos;École Alsacienne.
        </p>
        <Link
          href="/connexion"
          className="mt-2 rounded-full bg-rouge px-6 py-3 text-base font-medium text-blanc transition-colors hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>

      <footer className="border-t border-ardoise/15 px-6 py-4 text-sm text-ardoise">
        MaClasse EA — projet indépendant, non affilié à l&apos;administration
        de l&apos;École Alsacienne.
      </footer>
    </div>
  );
}
