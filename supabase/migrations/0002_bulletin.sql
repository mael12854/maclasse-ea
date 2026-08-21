-- Bulletin — passage des notes numériques (/20) au barème par compétences
-- (① Non atteint, ② Partiellement atteint, ③ Atteint, ④ Excellente
-- maîtrise), notes rattachées à un trimestre, appréciations par élève ×
-- matière × trimestre, et partage de visibilité entre profs d'une même
-- classe (utile en conseil de classe : un prof voit toutes les matières
-- de ses classes, pas seulement la sienne — l'écriture reste limitée à
-- sa/ses matière(s)).

alter table public.grades
  drop column grade,
  drop column max_grade,
  add column niveau smallint not null check (niveau between 1 and 4),
  add column trimestre smallint not null default 1 check (trimestre between 1 and 3);

create table public.appreciations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject text not null,
  trimestre smallint not null check (trimestre between 1 and 3),
  comment text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject, trimestre)
);

alter table public.appreciations enable row level security;

-- teaches_class : le prof enseigne au moins une matière dans cette classe.
create function public.teaches_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_classes
    where teacher_id = auth.uid() and class_id = p_class_id
  )
$$;

-- grades : la lecture prof passe de "sa matière" à "toute sa classe".
drop policy "grades_select" on public.grades;
create policy "grades_select" on public.grades
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
  );

-- appreciations : admin tout, eleve les siennes, prof toute sa classe en
-- lecture, mais écriture limitée à la/les matière(s) qu'il enseigne.
create policy "appreciations_select" on public.appreciations
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
  );
create policy "appreciations_insert" on public.appreciations
  for insert with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
  );
create policy "appreciations_update" on public.appreciations
  for update using (public.current_role() = 'admin' or created_by = auth.uid());
create policy "appreciations_delete" on public.appreciations
  for delete using (public.current_role() = 'admin' or created_by = auth.uid());
