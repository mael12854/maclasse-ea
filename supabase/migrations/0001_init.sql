-- MaClasse EA — schema initial
-- Roles: admin (toi), prof, eleve. Une classe regroupe des élèves ; un prof peut
-- enseigner une ou plusieurs matières dans une ou plusieurs classes (teacher_classes).

create extension if not exists "pgcrypto";

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'eleve' check (role in ('admin', 'prof', 'eleve')),
  full_name text not null,
  class_id uuid references public.classes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject text not null,
  unique (teacher_id, class_id, subject)
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject text not null,
  title text not null,
  description text,
  due_date date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject text not null,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = lundi ... 7 = dimanche
  start_time time not null,
  end_time time not null,
  room text,
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject text not null,
  grade numeric(4, 2) not null,
  max_grade numeric(4, 2) not null default 20,
  coefficient numeric(3, 1) not null default 1,
  comment text,
  graded_at date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-crée un profil (rôle "eleve" par défaut) à l'inscription ; l'admin
-- promeut ensuite en prof/admin et assigne la classe depuis /admin.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fonctions security definer pour lire le rôle/la classe de l'utilisateur courant
-- sans provoquer de récursion RLS sur profiles.
create function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.current_class_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select class_id from public.profiles where id = auth.uid()
$$;

create function public.teaches_class_subject(p_class_id uuid, p_subject text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_classes
    where teacher_id = auth.uid()
      and class_id = p_class_id
      and subject = p_subject
  )
$$;

alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.teacher_classes enable row level security;
alter table public.homework enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.grades enable row level security;

-- classes : lecture pour tout utilisateur connecté, écriture admin uniquement
create policy "classes_select" on public.classes
  for select using (auth.uid() is not null);
create policy "classes_write" on public.classes
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- profiles : lecture pour tout utilisateur connecté (annuaire de classe), écriture admin
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles_write" on public.profiles
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- teacher_classes : admin voit tout, prof voit ses affectations ; écriture admin
create policy "teacher_classes_select" on public.teacher_classes
  for select using (public.current_role() = 'admin' or teacher_id = auth.uid());
create policy "teacher_classes_write" on public.teacher_classes
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- homework : admin tout, eleve sa classe, prof les classes/matières qu'il enseigne
create policy "homework_select" on public.homework
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and class_id = public.current_class_id())
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
  );
create policy "homework_insert" on public.homework
  for insert with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
  );
create policy "homework_update" on public.homework
  for update using (public.current_role() = 'admin' or created_by = auth.uid());
create policy "homework_delete" on public.homework
  for delete using (public.current_role() = 'admin' or created_by = auth.uid());

-- timetable_slots : lecture comme homework, écriture admin uniquement (planning centralisé)
create policy "timetable_select" on public.timetable_slots
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and class_id = public.current_class_id())
    or (public.current_role() = 'prof' and (teacher_id = auth.uid() or public.teaches_class_subject(class_id, subject)))
  );
create policy "timetable_write" on public.timetable_slots
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- grades : admin tout, eleve ses propres notes, prof les classes/matières qu'il enseigne
create policy "grades_select" on public.grades
  for select using (
    public.current_role() = 'admin'
    or (public.current_role() = 'eleve' and student_id = auth.uid())
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
  );
create policy "grades_insert" on public.grades
  for insert with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
  );
create policy "grades_update" on public.grades
  for update using (public.current_role() = 'admin' or created_by = auth.uid());
create policy "grades_delete" on public.grades
  for delete using (public.current_role() = 'admin' or created_by = auth.uid());
