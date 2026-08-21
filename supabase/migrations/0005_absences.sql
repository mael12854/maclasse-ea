-- Absences et retards, par élève × classe × date. Un prof gère celles de
-- ses classes (peu importe la matière — la présence en classe n'est pas
-- rattachée à une matière précise), un élève voit les siennes.

create table public.absences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  date date not null,
  type text not null check (type in ('absence', 'retard')),
  justifiee boolean not null default false,
  motif text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.absences enable row level security;

create policy "absences_select" on public.absences
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
  );
create policy "absences_insert" on public.absences
  for insert with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
  );
create policy "absences_update" on public.absences
  for update using (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
  );
create policy "absences_delete" on public.absences
  for delete using (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
  );
