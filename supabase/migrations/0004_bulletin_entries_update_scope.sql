-- Un prof doit pouvoir corriger une appréciation déjà saisie par un
-- collègue (ou lui-même) sur une matière qu'il enseigne, pas seulement
-- celles qu'il a lui-même créées.
drop policy "bulletin_entries_update" on public.bulletin_entries;
create policy "bulletin_entries_update" on public.bulletin_entries
  for update using (
    public.current_role() = 'admin'
    or (public.current_role() = 'prof' and public.teaches_class_subject(class_id, subject))
  );
