insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-itineraries', 'trip-itineraries', false, 26214400, array[
  'text/html', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.project_share_links (
  token_hash text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  project_id text not null,
  share_version text not null,
  expires_at timestamptz not null
);
create index if not exists project_share_links_expiry on public.project_share_links(expires_at);
alter table public.project_share_links enable row level security;
revoke all on public.project_share_links from anon, authenticated;
grant select, insert, delete on public.project_share_links to service_role;
