-- ============================================================
-- Fix: Auto-create photographers row on photographer signup
--
-- ISSUE: handle_new_user() only creates a profiles row.
-- There is no trigger to create the matching photographers row,
-- so every photographer who signs up ends up with no settings page.
--
-- FIX: Add a trigger on profiles that auto-creates the photographers
-- row whenever a profile with role='photographer' is inserted.
-- ============================================================

create or replace function handle_new_photographer()
returns trigger language plpgsql security definer as $$
declare
  v_full_name text;
  v_slug text;
begin
  if new.role = 'photographer' then
    -- Pull full_name from auth.users metadata
    select raw_user_meta_data->>'full_name'
      into v_full_name
      from auth.users
     where id = new.id;

    -- Generate a default unique slug from the user id
    v_slug := 'studio-' || substr(replace(new.id::text, '-', ''), 1, 8);

    insert into public.photographers (user_id, slug, display_name, is_active)
    values (new.id, v_slug, coalesce(v_full_name, 'My Studio'), true)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace trigger on_photographer_profile_created
  after insert on public.profiles
  for each row execute function handle_new_photographer();

-- ============================================================
-- Backfill: create photographers rows for existing photographer
-- accounts that are missing one (run once)
-- ============================================================
insert into public.photographers (user_id, slug, display_name, is_active)
select
  p.id,
  'studio-' || substr(replace(p.id::text, '-', ''), 1, 8),
  coalesce(u.raw_user_meta_data->>'full_name', 'My Studio'),
  true
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'photographer'
  and not exists (
    select 1 from public.photographers ph where ph.user_id = p.id
  );
