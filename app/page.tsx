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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 py-24">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-encre">
            Devoirs, emploi du temps et bulletin,
            <br />
            au même endroit.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ardoise">
            MaClasse EA rassemble le cahier de textes, le planning et le bulletin
            de ta classe à l&apos;École Alsacienne.
          </p>
          <Link
            href="/connexion"
            className="mt-2 rounded-full bg-rouge px-6 py-3 text-base font-medium text-blanc transition-colors hover:opacity-90"
          >
            Se connecter
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ardoise/15 bg-blanc p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-rouge">Devoirs</p>
            <p className="mt-2 text-sm leading-relaxed text-ardoise">
              Le cahier de textes de ta classe, mis à jour par tes profs, avec les dates à rendre.
            </p>
          </div>
          <div className="rounded-xl border border-ardoise/15 bg-blanc p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-rouge">Emploi du temps</p>
            <p className="mt-2 text-sm leading-relaxed text-ardoise">
              La semaine de ta classe en un coup d&apos;œil : horaires, matières et salles.
            </p>
          </div>
          <div className="rounded-xl border border-ardoise/15 bg-blanc p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-rouge">Bulletin</p>
            <p className="mt-2 text-sm leading-relaxed text-ardoise">
              Un niveau et une appréciation par matière et par trimestre, imprimable au format A4.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-ardoise/15 px-6 py-4 text-sm text-ardoise">
        MaClasse EA — projet indépendant, non affilié à l&apos;administration
        de l&apos;École Alsacienne.
      </footer>
    </div>
  );
}
