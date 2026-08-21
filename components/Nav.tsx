"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

const LINKS = [
  { href: "/devoirs", label: "Devoirs" },
  { href: "/emploi-du-temps", label: "Emploi du temps" },
  { href: "/notes", label: "Notes" },
  { href: "/bulletin", label: "Bulletin" },
  { href: "/absences", label: "Absences" },
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
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/devoirs" className="font-display text-lg font-semibold">
            <span className="text-encre">MaClasse </span>
            <span className="text-rouge">EA</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname.startsWith(link.href)
                    ? "font-medium text-rouge"
                    : "text-ardoise hover:text-encre"
                }
              >
                {link.label}
              </Link>
            ))}
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className={
                  pathname.startsWith("/admin")
                    ? "font-medium text-rouge"
                    : "text-ardoise hover:text-encre"
                }
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ardoise">{profile.full_name}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[profile.role].className}`}
          >
            {ROLE_BADGE[profile.role].label}
          </span>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-ardoise/30 px-3 py-1.5 text-ardoise transition-colors hover:border-rouge hover:text-rouge"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
