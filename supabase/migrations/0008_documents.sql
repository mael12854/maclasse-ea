-- Documents publiés par l'admin (infos ou formulaires à remplir en
-- ligne), ciblés par rôle. Un formulaire a des champs définis par
-- l'admin (document_fields) et chaque destinataire y répond une fois
-- (document_responses, réponses en JSON).

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  requires_response boolean not null default false,
  target_roles text[] not null default '{admin,prof,eleve,parent}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.document_fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  label text not null,
  field_type text not null check (field_type in ('text', 'textarea', 'checkbox')),
  position smallint not null default 0
);

create table public.document_responses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (document_id, responder_id)
);

alter table public.documents enable row level security;
alter table public.document_fields enable row level security;
alter table public.document_responses enable row level security;

create policy "documents_select" on public.documents
  for select using (
    public.current_role() = 'admin' or public.current_role() = any (target_roles)
  );
create policy "documents_write" on public.documents
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "document_fields_select" on public.document_fields
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (public.current_role() = 'admin' or public.current_role() = any (d.target_roles))
    )
  );
create policy "document_fields_write" on public.document_fields
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "document_responses_select" on public.document_responses
  for select using (public.current_role() = 'admin' or responder_id = auth.uid());
create policy "document_responses_insert" on public.document_responses
  for insert with check (
    responder_id = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = document_id and public.current_role() = any (d.target_roles)
    )
  );
create policy "document_responses_update" on public.document_responses
  for update using (responder_id = auth.uid());
