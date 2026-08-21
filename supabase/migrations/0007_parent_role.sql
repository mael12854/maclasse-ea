-- Rôle parent : lecture seule sur tout ce qu'un élève voit pour son ou
-- ses enfants (fratrie possible), lié depuis /admin comme un prof est
-- lié à ses classes.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'prof', 'eleve', 'parent'));

create table public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

alter table public.parent_students enable row level security;

create policy "parent_students_select" on public.parent_students
  for select using (
    public.current_role() = 'admin' or parent_id = auth.uid()
  );
create policy "parent_students_write" on public.parent_students
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- is_parent_of : l'appelant est parent de cet élève.
create function public.is_parent_of(p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.parent_students
    where parent_id = auth.uid() and student_id = p_student_id
  )
$$;

-- is_parent_of_class : l'appelant a au moins un enfant dans cette classe
-- (pour les devoirs/emploi du temps, rattachés à la classe et non à
-- l'élève).
create function public.is_parent_of_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.parent_students ps
    join public.profiles p on p.id = ps.student_id
    where ps.parent_id = auth.uid() and p.class_id = p_class_id
  )
$$;

drop policy "homework_select" on public.homework;
create policy "homework_select" on public.homework
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and class_id = public.current_class_id())
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
    or (public.current_role() = 'parent' and public.is_parent_of_class(class_id))
  );

drop policy "timetable_select" on public.timetable_slots;
create policy "timetable_select" on public.timetable_slots
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and class_id = public.current_class_id())
    or (public.current_role() = 'prof' and (teacher_id = auth.uid() or public.teaches_class_subject(class_id, subject)))
    or (public.current_role() = 'parent' and public.is_parent_of_class(class_id))
  );

drop policy "grades_select" on public.grades;
create policy "grades_select" on public.grades
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
    or (public.current_role() = 'parent' and public.is_parent_of(student_id))
  );

drop policy "bulletin_entries_select" on public.bulletin_entries;
create policy "bulletin_entries_select" on public.bulletin_entries
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
    or (public.current_role() = 'parent' and public.is_parent_of(student_id))
  );

drop policy "absences_select" on public.absences;
create policy "absences_select" on public.absences
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class(class_id))
    or (public.current_role() = 'parent' and public.is_parent_of(student_id))
  );

-- pièces jointes des devoirs : même élargissement pour les parents.
drop policy "devoirs_attachments_select" on storage.objects;
create policy "devoirs_attachments_select" on storage.objects
  for select using (
    bucket_id = 'devoirs'
    and exists (
      select 1 from public.homework h
      where h.id::text = (storage.foldername(name))[1]
        and (
          public.current_role() = 'admin'
          or (public.current_role() = 'eleve' and h.class_id = public.current_class_id())
          or (public.current_role() = 'prof' and public.teaches_class_subject(h.class_id, h.subject))
          or (public.current_role() = 'parent' and public.is_parent_of_class(h.class_id))
        )
    )
  );
