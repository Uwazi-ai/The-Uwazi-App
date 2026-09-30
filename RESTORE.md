# Restoring from a backup

Backups run every night at 3am Central. Each night makes one folder in the private `backups` bucket, named by date, like `2026-09-29/`. Each table is one file, like `civic_offices.json`. We keep 30 days.

Each file looks like this:

```json
{ "table": "civic_offices", "exported_at": "...", "row_count": 37, "rows": [ { ... } ] }
```

Only a super admin can read the bucket.

## Before you start

1. Pick the folder you want. Check `backup_runs` for a row with `status = 'ok'` and that `folder`.
2. Download the files you need from the `backups` bucket as a super admin.
3. Write down the current row count of each table you will restore.
4. Do the restore in a SQL session that uses the service role, because the policies block normal users.

## Restore order

Restore parents before children so foreign keys do not fail. To empty tables first, go in the reverse order.

1. compass_dimensions
2. civic_journey_stages
3. badges
4. official_domains
5. city_onboarding
6. civic_offices
7. civic_data_sources
8. civic_data_pending_changes
9. district_boundaries
10. civic_budgets
11. civic_budget_calendar
12. compass_questions
13. compass_facts
14. compass_sessions
15. compass_responses
16. compass_results
17. compass_budget_priorities
18. compass_office_matches
19. user_civic_persona
20. civic_confidence
21. identity_feedback
22. user_points_ledger
23. user_journey_next_step
24. challenges
25. challenge_progress
26. user_badges

## Restore one table

Example for `civic_offices`. Swap in your table name.

1. Load the file into a temp table:

```sql
create temp table restore_raw (doc jsonb);
-- paste the file contents in place of the dots
insert into restore_raw values ('{ ... }'::jsonb);
```

2. Put the rows back. This adds missing rows and overwrites changed rows by id:

```sql
insert into public.civic_offices
select r.* from restore_raw, jsonb_populate_recordset(null::public.civic_offices, doc->'rows') r
on conflict (id) do update set
  office_title = excluded.office_title,
  current_holder = excluded.current_holder
  -- list every column you want to bring back
;
```

To replace the table fully, delete its rows first, then run a plain insert with no `on conflict` line. Empty any child tables first, using the reverse order above.

3. Check the count matches `row_count` in the file:

```sql
select count(*) from public.civic_offices;
```

## Restore all tables

1. Empty the tables in reverse order, from 26 up to 1.
2. Load each file in the order above, from 1 down to 26, with a plain insert:

```sql
insert into public.<table>
select r.* from restore_raw, jsonb_populate_recordset(null::public.<table>, doc->'rows') r;
```

3. Check each count against `row_count` in its file.

## Special cases

- `user_points_ledger` blocks updates and deletes on purpose. You can only add rows. Insert only the rows whose `id` is missing:

```sql
insert into public.user_points_ledger
select r.* from restore_raw, jsonb_populate_recordset(null::public.user_points_ledger, doc->'rows') r
where not exists (select 1 from public.user_points_ledger l where l.id = r.id);
```

- `user_journey_next_step` uses `user_id` as its key, not `id`. Use `on conflict (user_id)`.
- `compass_sessions`, `user_civic_persona`, and the other user tables point to real accounts. If an account was deleted, skip its rows.
- `identity_feedback` shows up only in backups made after that table was added.
- Civic Games counts can be rebuilt instead of restored. Run `refresh_challenge_progress` for each challenge.
