create table public.ride_admin_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null,
  action text not null,
  target_id uuid,
  note text,
  created_at timestamptz not null default now()
);
alter table public.ride_admin_log enable row level security;
grant select on public.ride_admin_log to authenticated;
grant all on public.ride_admin_log to service_role;
create policy "Admins read ride admin log" on public.ride_admin_log for select to authenticated using (public.is_admin(auth.uid()));

create or replace function public.admin_rights_questions()
returns table(id uuid, state text, sort int, title text, question text, options jsonb, correct_index int, explanation text, takeaway text, approved_at timestamptz, approver_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Not allowed'; end if;
  return query select q.id, q.state::text, q.sort::int, q.title::text, q.question::text, to_jsonb(q.options), q.correct_index::int, q.explanation::text, q.takeaway::text, q.approved_at,
    (select u.email::text from auth.users u where u.id = q.approved_by)
  from public.rights_questions q order by q.state, q.sort;
end $$;

create or replace function public.set_rights_question_approval(_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Not allowed'; end if;
  update public.rights_questions set approved_by = case when _approve then auth.uid() end, approved_at = case when _approve then now() end where id = _id;
  if not found then raise exception 'Question not found'; end if;
  insert into public.ride_admin_log(actor, action, target_id) values (auth.uid(), case when _approve then 'rights_approved' else 'rights_unapproved' end, _id);
end $$;

create or replace function public.admin_find_user(_email text)
returns table(id uuid, email text, is_coordinator boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Not allowed'; end if;
  if length(trim(coalesce(_email,''))) < 3 then return; end if;
  return query select u.id, u.email::text, exists(select 1 from public.user_roles r where r.user_id = u.id and r.role = 'ride_coordinator')
  from auth.users u where u.email ilike '%' || trim(_email) || '%' order by u.email limit 10;
end $$;

create or replace function public.list_ride_coordinators()
returns table(id uuid, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Not allowed'; end if;
  return query select u.id, u.email::text from public.user_roles r join auth.users u on u.id = r.user_id where r.role = 'ride_coordinator' order by u.email;
end $$;

create or replace function public.set_ride_coordinator(_user_id uuid, _on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Not allowed'; end if;
  if _on then
    insert into public.user_roles(user_id, role) values (_user_id, 'ride_coordinator') on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = 'ride_coordinator';
  end if;
  insert into public.ride_admin_log(actor, action, target_id) values (auth.uid(), case when _on then 'coordinator_added' else 'coordinator_removed' end, _user_id);
end $$;

revoke execute on function public.admin_rights_questions(), public.set_rights_question_approval(uuid, boolean), public.admin_find_user(text), public.list_ride_coordinators(), public.set_ride_coordinator(uuid, boolean) from public, anon;
grant execute on function public.admin_rights_questions(), public.set_rights_question_approval(uuid, boolean), public.admin_find_user(text), public.list_ride_coordinators(), public.set_ride_coordinator(uuid, boolean) to authenticated;