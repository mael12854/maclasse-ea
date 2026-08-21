"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

const LINKS = [
  { href: "/accueil", label: "Accueil" },
  { href: "/devoirs", label: "Devoirs" },
  { href: "/emploi-du-temps", label: "Emploi du temps" },
  { href: "/notes", label: "Notes" },
  { href: "/bulletin", label: "Bulletin" },
  { href: "/absences", label: "Absences" },
  { href: "/documents", label: "Documents" },
];

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-encre text-blanc" },
  prof: { label: "Prof", className: "bg-vert text-blanc" },
  eleve: { label: "Élève", className: "bg-or text-encre" },
  parent: { label: "Parent", className: "bg-ardoise text-blanc" },
};

export default function Nav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="print:hidden border-b border-ardoise/15 bg-blanc">
      <div className="mx-auto w-full max-w-4xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/accueil" className="shrink-0 font-display text-lg font-semibold">
            <span className="text-encre">MaClasse </span>
            <span className="text-rouge">EA</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
            <span className="hidden truncate text-ardoise sm:inline">{profile.full_name}</span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[profile.role].className}`}
            >
              {ROLE_BADGE[profile.role].label}
            </span>
            <button
              onClick={handleSignOut}
              className="shrink-0 rounded-full border border-ardoise/30 px-3 py-1.5 text-ardoise transition-colors hover:border-rouge hover:text-rouge"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="mt-3 flex items-center gap-5 overflow-x-auto text-sm sm:mt-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                "shrink-0 whitespace-nowrap " +
                (pathname.startsWith(link.href)
                  ? "font-medium text-rouge"
                  : "text-ardoise hover:text-encre")
              }
            >
              {link.label}
            </Link>
          ))}
          {profile.role === "admin" && (
            <Link
              href="/admin"
              className={
                "shrink-0 whitespace-nowrap " +
                (pathname.startsWith("/admin")
                  ? "font-medium text-rouge"
                  : "text-ardoise hover:text-encre")
              }
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
