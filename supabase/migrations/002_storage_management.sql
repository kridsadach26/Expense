-- Harmony Haven storage management helpers
-- Run after 001_initial.sql

create or replace function public.app_storage_usage()
returns jsonb
language sql
security definer
set search_path = public, storage
as $$
  select jsonb_build_object(
    'used_bytes', coalesce(sum(coalesce((metadata->>'size')::bigint, 0)), 0),
    'file_count', count(*),
    'by_bucket', coalesce(
      (
        select jsonb_object_agg(bucket_id, jsonb_build_object('bytes', bucket_bytes, 'files', bucket_files))
        from (
          select
            bucket_id,
            coalesce(sum(coalesce((metadata->>'size')::bigint, 0)), 0) as bucket_bytes,
            count(*) as bucket_files
          from storage.objects
          group by bucket_id
        ) b
      ),
      '{}'::jsonb
    )
  )
  from storage.objects;
$$;

create or replace function public.app_storage_files(
  p_bucket text default 'receipts',
  p_older_than timestamptz default null,
  p_limit integer default 200
)
returns table(
  id uuid,
  bucket text,
  path text,
  size_bytes bigint,
  mimetype text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, storage
as $$
  select
    o.id,
    o.bucket_id,
    o.name,
    coalesce((o.metadata->>'size')::bigint, 0),
    coalesce(o.metadata->>'mimetype', o.metadata->>'contentType', ''),
    o.created_at,
    o.updated_at
  from storage.objects o
  where o.bucket_id = p_bucket
    and (p_older_than is null or o.created_at < p_older_than)
  order by o.created_at asc
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.app_storage_usage() from public, anon, authenticated;
revoke all on function public.app_storage_files(text,timestamptz,integer) from public, anon, authenticated;
grant execute on function public.app_storage_usage() to service_role;
grant execute on function public.app_storage_files(text,timestamptz,integer) to service_role;
