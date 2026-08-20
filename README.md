# MaClasse EA

Cahier de textes, emploi du temps et notes pour les classes de l'École Alsacienne.
Projet indépendant, non affilié à l'administration de l'école.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth)

## Développement

```bash
npm install
npm run dev
```

Nécessite un fichier `.env.local` avec :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Le schéma de base de données est dans `supabase/migrations/`.
