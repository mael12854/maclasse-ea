@AGENTS.md

# MaClasse EA — project memory

Plateforme type "EcoleDirecte" pour les classes de l'École Alsacienne, initiée par
Maël. Repo GitHub indépendant `mael12854/maclasse-ea`, public. **Pas affilié à
l'administration de l'école** — projet perso, à le rappeler dans l'UI (footer de
`/`) tant que ce n'est pas officiel.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) — voir `AGENTS.md` pour les
  breaking changes propres à Next.js 16 (ex. `middleware.ts` → `proxy.ts`).
- Supabase (Postgres + Auth), projet dédié dans l'organisation "La Guinguette A&M"
  (même org que le site de la guinguette, mais projet Supabase séparé). Project ref :
  à renseigner ici une fois connu.
- Tailwind CSS v4 avec tokens OKLCH de marque (encre, rouge, vert, craie, or,
  blanc, ardoise) définis dans `app/globals.css`.
- Fonts : Space Grotesk (titres/logo) + Inter (corps), via `next/font/google`.
- Déploiement prévu sur Vercel, auto-deploy depuis GitHub `mael12854/maclasse-ea`
  `main` (pas encore connecté).

## Rôles et accès

Trois rôles dans `profiles.role` : `admin` (Maël), `prof`, `eleve`.

- Toute nouvelle inscription (`/connexion`, mode "inscription") crée un compte
  Supabase Auth + un profil auto-généré en rôle `eleve` sans classe (trigger
  `handle_new_user` en base). C'est l'admin qui, depuis `/admin`, assigne ensuite
  le rôle définitif et la classe.
- `proxy.ts` protège `/devoirs`, `/emploi-du-temps`, `/notes`, `/admin` (redirige
  vers `/connexion` si non connecté) et restreint `/admin` au rôle `admin`
  (redirige vers `/` sinon).
- Toute la logique fine d'accès (un prof ne voit/édite que les classes qu'il
  enseigne via `teacher_classes`, un élève ne voit que sa classe et ses propres
  notes) est appliquée par les policies RLS en base, pas seulement côté UI —
  voir `supabase/migrations/0001_init.sql`.

## Schéma de données (0001_init.sql)

- `classes` — une classe (ex. "4e B").
- `profiles` — étend `auth.users` ; `role`, `full_name`, `class_id` (élèves
  uniquement).
- `teacher_classes` — affectation prof × classe × matière (un prof peut enseigner
  plusieurs matières/classes).
- `homework` — devoirs/cahier de textes, par classe + matière + date.
- `timetable_slots` — créneaux d'emploi du temps par classe (jour 1–7,
  horaires, salle, prof) ; écriture réservée à l'admin (planning centralisé).
- `grades` — notes par élève, matière, coefficient ; moyenne calculée côté client
  dans `/notes` (pondérée par coefficient, ramenée sur 20).

Fonctions `security definer` (`current_role()`, `current_class_id()`,
`teaches_class_subject()`) utilisées dans les policies RLS pour éviter la
récursion sur `profiles`.

## Fonctionnalités MVP implémentées

- `/` — landing publique.
- `/connexion` — connexion + inscription (Supabase Auth email/mdp).
- `/devoirs` — cahier de textes : lecture scopée par rôle, ajout par
  prof (classes/matières qu'il enseigne) ou admin (toute classe, matière libre).
- `/emploi-du-temps` — grille hebdomadaire par classe ; ajout/suppression de
  créneaux réservés à l'admin.
- `/notes` — notes par élève avec moyenne pondérée (vue élève), saisie par
  prof/admin.
- `/admin` — gestion des classes, des rôles/classes des utilisateurs, et des
  affectations prof → classe/matière.

## Gaps / idées pas encore faites

- Projet Supabase pas encore créé/lié (Maël le crée lui-même dans l'org
  "La Guinguette A&M", puis donne le project ref pour appliquer
  `supabase/migrations/0001_init.sql`).
- Pas encore déployé sur Vercel.
- Pas de page "présentation" détaillée des fonctionnalités sur `/`.
- Pas de gestion de mot de passe oublié / emails transactionnels custom (Supabase
  Auth par défaut pour l'instant).
- Pas de tests automatisés.

## Git push workflow

Session connectée directement à GitHub (plus besoin de PAT manuel) — utiliser les
outils `mcp__github__*` pour push/PR sur ce repo.
