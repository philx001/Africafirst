-- Enable Supabase Realtime broadcasts for notification inserts.
-- The DO block keeps the migration idempotent across environments where the
-- publication may already include the table, or where Supabase Realtime is absent.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     )
  then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
