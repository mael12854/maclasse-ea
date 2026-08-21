-- Le bulletin devient un document éditable directement : un niveau et une
-- appréciation par élève × matière × trimestre, saisis en un geste depuis
-- /bulletin (plutôt que calculés depuis les évaluations informelles de
-- /notes, qui restent un suivi séparé). Barème de niveaux configurable
-- par l'admin plutôt que codé en dur.

alter table public.appreciations rename to bulletin_entries;
alter table public.bulletin_entries
  add column niveau smallint check (niveau between 1 and 4),
  alter column comment drop not null,
  alter column comment set default '';

alter policy "appreciations_select" on public.bulletin_entries rename to "bulletin_entries_select";
alter policy "appreciations_insert" on public.bulletin_entries rename to "bulletin_entries_insert";
alter policy "appreciations_update" on public.bulletin_entries rename to "bulletin_entries_update";
alter policy "appreciations_delete" on public.bulletin_entries rename to "bulletin_entries_delete";

create table public.grade_levels (
  value smallint primary key check (value between 1 and 4),
  symbol text not null,
  label text not null
);

insert into public.grade_levels (value, symbol, label) values
  (1, '①', 'Non atteint'),
  (2, '②', 'Partiellement atteint'),
  (3, '③', 'Atteint'),
  (4, '④', 'Excellente maîtrise');

alter table public.grade_levels enable row level security;

-- grade_levels : lecture pour tout utilisateur connecté, écriture admin uniquement
create policy "grade_levels_select" on public.grade_levels
  for select using (auth.uid() is not null);
create policy "grade_levels_write" on public.grade_levels
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
