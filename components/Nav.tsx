"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const LINKS = [
  { href: "/devoirs", label: "Devoirs" },
  { href: "/emploi-du-temps", label: "Emploi du temps" },
  { href: "/notes", label: "Notes" },
];

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
    <header className="border-b border-ardoise/15 bg-blanc">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/devoirs" className="font-display text-lg font-semibold text-encre">
            MaClasse EA
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
          <span className="text-ardoise">
            {profile.full_name}
            <span className="ml-1 text-xs">({profile.role})</span>
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
