-- Pièces jointes sur les devoirs, stockées dans le bucket privé "devoirs"
-- (un fichier par devoir, path = {homework_id}/{filename}). Le contrôle
-- d'accès sur les fichiers suit exactement celui du devoir lui-même.

alter table public.homework add column attachment_path text;

insert into storage.buckets (id, name, public)
values ('devoirs', 'devoirs', false)
on conflict (id) do nothing;

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
        )
    )
  );

create policy "devoirs_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'devoirs'
    and exists (
      select 1 from public.homework h
      where h.id::text = (storage.foldername(name))[1]
        and (
          public.current_role() = 'admin'
          or (public.current_role() = 'prof' and public.teaches_class_subject(h.class_id, h.subject))
        )
    )
  );

create policy "devoirs_attachments_delete" on storage.objects
  for delete using (
    bucket_id = 'devoirs'
    and exists (
      select 1 from public.homework h
      where h.id::text = (storage.foldername(name))[1]
        and (
          public.current_role() = 'admin'
          or (public.current_role() = 'prof' and public.teaches_class_subject(h.class_id, h.subject))
        )
    )
  );
